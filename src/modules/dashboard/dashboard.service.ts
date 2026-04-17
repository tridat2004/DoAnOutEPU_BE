import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, IsNull, Not, Repository } from 'typeorm';

import { Project } from '../projects/entities/project.entity';
import { Task } from '../tasks/entities/task.entity';
import { TaskStatus } from '../tasks/entities/task-status.entity';
import { Priority } from '../tasks/entities/priority.entity';
import { ProjectMember } from '../projects/entities/project-member.entity';
import { TaskHistory } from '../tasks/entities/task-history.entity';
import { AiAssignmentLog } from '../ai-assignment/entities/ai-assignment-log.entity';

import { AppErrors, AppException } from '../../common/exceptions/exception';
import { successResponse } from '../../common/response';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,

    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,

    @InjectRepository(TaskStatus)
    private readonly taskStatusRepository: Repository<TaskStatus>,

    @InjectRepository(Priority)
    private readonly priorityRepository: Repository<Priority>,

    @InjectRepository(ProjectMember)
    private readonly projectMemberRepository: Repository<ProjectMember>,

    @InjectRepository(TaskHistory)
    private readonly taskHistoryRepository: Repository<TaskHistory>,

    @InjectRepository(AiAssignmentLog)
    private readonly aiAssignmentLogRepository: Repository<AiAssignmentLog>,
  ) {}

  async getProjectDashboard(
    projectId: string,
    _currentUser: AuthenticatedUser,
  ) {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
      relations: {
        owner: true,
      },
    });

    if (!project) {
      throw AppErrors.project.projectNotFound();
    }

    try {
      const [
        taskSummary,
        prioritySummary,
        workloadSummary,
        dueSummary,
        aiUsageSummary,
        recentActivities,
      ] = await Promise.all([
        this.getTaskSummary(projectId),
        this.getPrioritySummary(projectId),
        this.getWorkloadSummary(projectId),
        this.getDueSummary(projectId),
        this.getAiUsageSummary(projectId),
        this.getRecentActivities(projectId),
      ]);

      return successResponse({
        message: 'Lay dashboard project thanh cong',
        data: {
          project: {
            id: project.id,
            name: project.name,
            projectKey: project.projectKey,
            description: project.description,
            owner: project.owner
              ? {
                  id: project.owner.id,
                  email: project.owner.email,
                  username: project.owner.username,
                  fullName: project.owner.fullName,
                }
              : null,
          },
          taskSummary,
          prioritySummary,
          workloadSummary,
          dueSummary,
          aiUsageSummary,
          recentActivities,
        },
      });
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }

      throw AppErrors.dashboard.dashboardLoadFailed();
    }
  }

  private async getTaskSummary(projectId: string) {
    const statuses = await this.taskStatusRepository.find({
      order: {
        position: 'ASC',
        createdAt: 'ASC',
      },
    });

    const rawCounts = await this.taskRepository
      .createQueryBuilder('task')
      .leftJoin('task.status', 'status')
      .select('status.id', 'statusId')
      .addSelect('status.code', 'statusCode')
      .addSelect('status.name', 'statusName')
      .addSelect('COUNT(task.id)', 'taskCount')
      .where('task.project_id = :projectId', { projectId })
      .groupBy('status.id')
      .addGroupBy('status.code')
      .addGroupBy('status.name')
      .getRawMany<{
        statusId: string;
        statusCode: string;
        statusName: string;
        taskCount: string;
      }>();

    const countMap = new Map(
      rawCounts.map((row) => [row.statusId, Number(row.taskCount)]),
    );

    const totalTasks = Array.from(countMap.values()).reduce(
      (sum, value) => sum + value,
      0,
    );

    return {
      totalTasks,
      byStatus: statuses.map((status) => ({
        id: status.id,
        code: status.code,
        name: status.name,
        color: status.color,
        position: status.position,
        count: countMap.get(status.id) || 0,
      })),
    };
  }

  private async getPrioritySummary(projectId: string) {
    const priorities = await this.priorityRepository.find({
      order: {
        weight: 'DESC',
        createdAt: 'ASC',
      },
    });

    const rawCounts = await this.taskRepository
      .createQueryBuilder('task')
      .leftJoin('task.priority', 'priority')
      .select('priority.id', 'priorityId')
      .addSelect('priority.code', 'priorityCode')
      .addSelect('priority.name', 'priorityName')
      .addSelect('priority.weight', 'priorityWeight')
      .addSelect('COUNT(task.id)', 'taskCount')
      .where('task.project_id = :projectId', { projectId })
      .groupBy('priority.id')
      .addGroupBy('priority.code')
      .addGroupBy('priority.name')
      .addGroupBy('priority.weight')
      .getRawMany<{
        priorityId: string;
        priorityCode: string;
        priorityName: string;
        priorityWeight: string;
        taskCount: string;
      }>();

    const countMap = new Map(
      rawCounts.map((row) => [row.priorityId, Number(row.taskCount)]),
    );

    return priorities.map((priority) => ({
      id: priority.id,
      code: priority.code,
      name: priority.name,
      weight: priority.weight,
      count: countMap.get(priority.id) || 0,
    }));
  }

  private async getWorkloadSummary(projectId: string) {
    const members = await this.projectMemberRepository.find({
      where: {
        project: { id: projectId },
      },
      relations: {
        user: true,
        role: true,
      },
      order: {
        createdAt: 'ASC',
      },
    });

    const rawAssignedCounts = await this.taskRepository
      .createQueryBuilder('task')
      .leftJoin('task.status', 'status')
      .select('task.assignee_user_id', 'userId')
      .addSelect(
        `SUM(CASE WHEN status.code = 'done' THEN 1 ELSE 0 END)`,
        'doneCount',
      )
      .addSelect(
        `SUM(CASE WHEN status.code != 'done' THEN 1 ELSE 0 END)`,
        'openCount',
      )
      .addSelect('COUNT(task.id)', 'totalAssignedCount')
      .where('task.project_id = :projectId', { projectId })
      .andWhere('task.assignee_user_id IS NOT NULL')
      .groupBy('task.assignee_user_id')
      .getRawMany<{
        userId: string;
        doneCount: string;
        openCount: string;
        totalAssignedCount: string;
      }>();

    const workloadMap = new Map<
      string,
      { doneCount: number; openCount: number; totalAssignedCount: number }
    >(
      rawAssignedCounts.map((row) => [
        row.userId,
        {
          doneCount: Number(row.doneCount),
          openCount: Number(row.openCount),
          totalAssignedCount: Number(row.totalAssignedCount),
        },
      ]),
    );

    return members.map((member) => {
      const stats = workloadMap.get(member.user.id) || {
        doneCount: 0,
        openCount: 0,
        totalAssignedCount: 0,
      };

      return {
        memberId: member.id,
        user: {
          id: member.user.id,
          email: member.user.email,
          username: member.user.username,
          fullName: member.user.fullName,
          avatarUrl: member.user.avatarUrl,
          isActive: member.user.isActive,
        },
        role: {
          id: member.role.id,
          code: member.role.code,
          name: member.role.name,
        },
        workload: {
          totalAssignedTasks: stats.totalAssignedCount,
          openTasks: stats.openCount,
          doneTasks: stats.doneCount,
        },
      };
    });
  }

  private async getDueSummary(projectId: string) {
    const today = new Date();
    const startOfToday = this.startOfDay(today);
    const endOfToday = this.endOfDay(today);

    const endOfWeek = this.endOfDay(
      new Date(startOfToday.getTime() + 6 * 24 * 60 * 60 * 1000),
    );

    const baseQuery = this.taskRepository
      .createQueryBuilder('task')
      .leftJoin('task.status', 'status')
      .where('task.project_id = :projectId', { projectId })
      .andWhere('task.due_date IS NOT NULL')
      .andWhere('status.code != :done', { done: 'done' });

    const [overdueTasks, dueToday, dueThisWeek] = await Promise.all([
      baseQuery
        .clone()
        .andWhere('task.due_date < :today', { today: startOfToday })
        .getCount(),

      baseQuery
        .clone()
        .andWhere('task.due_date BETWEEN :start AND :end', {
          start: startOfToday,
          end: endOfToday,
        })
        .getCount(),

      baseQuery
        .clone()
        .andWhere('task.due_date BETWEEN :start AND :end', {
          start: startOfToday,
          end: endOfWeek,
        })
        .getCount(),
    ]);

    return {
      overdueTasks,
      dueToday,
      dueThisWeek,
    };
  }

  private async getAiUsageSummary(projectId: string) {
    const totalRecommendations = await this.aiAssignmentLogRepository
      .createQueryBuilder('aiLog')
      .leftJoin('aiLog.task', 'task')
      .where('task.project_id = :projectId', { projectId })
      .getCount();

    const latestRecommendation = await this.aiAssignmentLogRepository
      .createQueryBuilder('aiLog')
      .leftJoinAndSelect('aiLog.task', 'task')
      .leftJoinAndSelect('aiLog.recommendedUser', 'recommendedUser')
      .where('task.project_id = :projectId', { projectId })
      .orderBy('aiLog.created_at', 'DESC')
      .getOne();

    return {
      totalRecommendations,
      latestRecommendation: latestRecommendation
        ? {
            id: latestRecommendation.id,
            taskId: latestRecommendation.task.id,
            taskCode: latestRecommendation.task.taskCode,
            recommendedUser: {
              id: latestRecommendation.recommendedUser.id,
              email: latestRecommendation.recommendedUser.email,
              username: latestRecommendation.recommendedUser.username,
              fullName: latestRecommendation.recommendedUser.fullName,
            },
            finalScore: Number(latestRecommendation.finalScore),
            reasonText: latestRecommendation.reasonText,
            createdAt: latestRecommendation.createdAt,
          }
        : null,
    };
  }

  private async getRecentActivities(projectId: string) {
    const histories = await this.taskHistoryRepository.find({
      where: {
        task: {
          project: { id: projectId },
        },
      },
      relations: {
        task: true,
        changedBy: true,
      },
      order: {
        createdAt: 'DESC',
      },
      take: 10,
    });

    return histories.map((history) => ({
      id: history.id,
      fieldName: history.fieldName,
      oldValue: history.oldValue,
      newValue: history.newValue,
      task: {
        id: history.task.id,
        taskCode: history.task.taskCode,
        title: history.task.title,
      },
      changedBy: {
        id: history.changedBy.id,
        email: history.changedBy.email,
        username: history.changedBy.username,
        fullName: history.changedBy.fullName,
      },
      createdAt: history.createdAt,
    }));
  }

  private startOfDay(date: Date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private endOfDay(date: Date) {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
  }
}