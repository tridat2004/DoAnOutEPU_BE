import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository, Brackets } from 'typeorm';
import { CreateTaskTypeDto } from './dto/create-task-type.dto';
import { CreateTaskStatusDto } from './dto/create-task-status.dto';
import { CreatePriorityDto } from './dto/create-priority.dto';
import { Task } from './entities/task.entity';
import { TaskType } from './entities/task-type.entity';
import { TaskStatus } from './entities/task-status.entity';
import { Priority } from './entities/priority.entity';
import { Project } from '../projects/entities/project.entity';
import { ProjectMember } from '../projects/entities/project-member.entity';
import { User } from '../users/entities/user.entity';
import { TaskHistoriesService } from './task-histories.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { AppErrors, AppException } from '../../common/exceptions/exception';
import { successPaginationResponse, successResponse } from '../../common/response';
import { ListProjectTasksDto } from './dto/list-project-tasks.dto';
import { ActivityAction } from '../activity/constants/activity-action.constant';
import { ActivityTargetType } from '../activity/constants/activity-target.constant';
import { ActivityService } from '../activity/activity.service';
import { NotificationsService } from '../notifications/notifications.service';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';
import { MoveTaskDto } from './dto/move-task.dto';
import { SystemRole } from '../auth/constants/system-role.constant';
import { ListDeletedTasksDto } from './dto/list-deleted-tasks.dto';
import { BoardColumn } from '../board/entities/board-column.entity';
@Injectable()
export class TasksService {
  constructor(
    private readonly dataSource: DataSource,

    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,

    @InjectRepository(TaskType)
    private readonly taskTypeRepository: Repository<TaskType>,

    @InjectRepository(TaskStatus)
    private readonly taskStatusRepository: Repository<TaskStatus>,

    @InjectRepository(Priority)
    private readonly priorityRepository: Repository<Priority>,

    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,

    @InjectRepository(ProjectMember)
    private readonly projectMemberRepository: Repository<ProjectMember>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(BoardColumn)
    private readonly boardColumnRepository: Repository<BoardColumn>,

    private readonly taskHistoriesService: TaskHistoriesService,

    private readonly activityService: ActivityService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async getTaskTypes() {
    const data = await this.taskTypeRepository.find({
      order: { name: 'ASC' },
    });

    return successResponse({
      message: 'Lay danh sach loai task thanh cong',
      data,
    });
  }
  async getTaskStatuses() {
    const data = await this.taskStatusRepository.find({
      order: { position: 'ASC', createdAt: 'ASC' },
    });

    return successResponse({
      message: 'Lay danh sach trang thai task thanh cong',
      data,
    });
  }

  async getPriorites() {
    const data = await this.priorityRepository.find({
      order: { weight: 'DESC', createdAt: 'ASC' },
    });
    return successResponse({
      message: 'Lay danh sach do uu tien thanh cong',
      data,
    });
  }

  async createTask(projectId: string, dto: CreateTaskDto, currentUser: AuthenticatedUser) {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });
    if (!project) throw AppErrors.project.projectNotFound();

    const reporter = await this.userRepository.findOne({
      where: { id: currentUser.id },
    });
    if (!reporter) throw AppErrors.auth.userNotFound();
    if (!reporter.isActive) throw AppErrors.auth.accountDisabled();

    const taskType = dto.taskTypeId
      ? await this.taskTypeRepository.findOne({
          where: { id: dto.taskTypeId },
        })
      : await this.taskTypeRepository.findOne({
          where: { code: 'task' },
        });

    if (!taskType) {
      throw AppErrors.task.taskTypeNotFound();
    }

    const status = await this.taskStatusRepository.findOne({
      where: { id: dto.statusId },
    });
    if (!status) throw AppErrors.task.taskStatusNotFound();

    const boardColumn = await this.boardColumnRepository.findOne({
      where: {
        status: { id: status.id },
        board: { project: { id: projectId } },
      },
      relations: { board: { project: true }, status: true },
    });
    if (!boardColumn) throw AppErrors.task.boardColumnNotFound();
    if (boardColumn.wipLimit) {
      const currentTaskCount = await this.taskRepository.count({
        where: { boardColumn: { id: boardColumn.id } },
      });
      if (currentTaskCount >= boardColumn.wipLimit) {
        throw AppErrors.task.boardColumnWipLimitReached();
      }
    }

    const priority = dto.priorityId
      ? await this.priorityRepository.findOne({
          where: { id: dto.priorityId },
        })
      : await this.priorityRepository.findOne({
          where: { code: 'medium' },
        });

    if (!priority) {
      throw AppErrors.task.priorityNotFound();
    }

    const assignee = dto.assigneeUserId
      ? await this.resolveAssignee(projectId, dto.assigneeUserId)
      : null;
    const parentTask = dto.parentTaskId
      ? await this.resolveParentTask(projectId, dto.parentTaskId)
      : null;

    try {
      const savedTask = await this.dataSource.transaction(async (manager) => {
        await this.lockProjectTaskOrdering(manager, project.id);

        const taskCode = await this.generateNextTaskCode(project.projectKey, project.id, manager);

        const positionResult = await manager
          .getRepository(Task)
          .createQueryBuilder('task')
          .select('COALESCE(MAX(task.position), -1)', 'maxPosition')
          .where('task.project_id = :projectId', { projectId: project.id })
          .andWhere('task.status_id = :statusId', { statusId: status.id })
          .getRawOne<{ maxPosition: string }>();

        const task = manager.create(Task, {
          project,
          taskCode,
          title: dto.title.trim(),
          description: dto.description?.trim() || undefined,
          taskType,
          status,
          boardColumn,
          priority,
          reporter,
          assignee: assignee || undefined,
          parentTask: parentTask || undefined,
          dueDate: dto.dueDate || undefined,
          estimatedHours: dto.estimatedHours,
          position: Number(positionResult?.maxPosition ?? -1) + 1,
        });

        const saved = await manager.save(Task, task);

        await this.activityService.log(
          {
            actor: reporter,
            project,
            actionType: ActivityAction.TASK_CREATED,
            targetType: ActivityTargetType.TASK,
            targetId: saved.id,
            message: `${reporter.fullName} da tao task ${saved.taskCode} - ${saved.title}`,
            metadata: {
              taskId: saved.id,
              taskCode: saved.taskCode,
              title: saved.title,
            },
          },
          manager,
        );

        return saved;
      });

      if (savedTask.assignee) {
        try {
          await this.notificationsService.notifyTaskAssigned(
            savedTask.assignee.id,
            savedTask.taskCode,
            savedTask.id,
            project.id,
          );
        } catch (error) {
          console.error('TASK_ASSIGNED_NOTIFICATION_ERROR:', error);
        }
      }
      return successResponse({
        message: 'Tao task thanh cong',
        data: await this.taskRepository.findOne({
          where: { id: savedTask.id },
          relations: this.taskRelations(),
        }),
      });
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      throw AppErrors.task.taskCreationFailed();
    }
  }
  async getTasks(projectId: string, query: ListProjectTasksDto, currentUser: AuthenticatedUser) {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });

    if (!project) {
      throw AppErrors.project.projectNotFound();
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    if (query.dueFrom && query.dueTo && query.dueFrom > query.dueTo) {
      throw AppErrors.common.validationMessages(['dueFrom phai nho hon hoac bang dueTo']);
    }

    try {
      const qb = this.taskRepository
        .createQueryBuilder('task')
        .leftJoinAndSelect('task.project', 'project')
        .leftJoinAndSelect('task.taskType', 'taskType')
        .leftJoinAndSelect('task.status', 'status')
        .leftJoinAndSelect('task.priority', 'priority')
        .leftJoinAndSelect('task.reporter', 'reporter')
        .leftJoinAndSelect('task.assignee', 'assignee')
        .leftJoinAndSelect('task.parentTask', 'parentTask')
        .where('project.id = :projectId', { projectId });

      if (query.statusId) {
        qb.andWhere('status.id = :statusId', {
          statusId: query.statusId,
        });
      }

      if (query.priorityId) {
        qb.andWhere('priority.id = :priorityId', {
          priorityId: query.priorityId,
        });
      }

      if (query.assigneeUserId) {
        qb.andWhere('assignee.id = :assigneeUserId', {
          assigneeUserId: query.assigneeUserId,
        });
      }

      if (query.keyword?.trim()) {
        const keyword = `%${query.keyword.trim()}%`;

        qb.andWhere(
          new Brackets((subQb) => {
            subQb
              .where('task.title ILIKE :keyword', { keyword })
              .orWhere('task.description ILIKE :keyword', { keyword })
              .orWhere('task.taskCode ILIKE :keyword', { keyword });
          }),
        );
      }

      if (query.dueFrom) {
        qb.andWhere('task.due_date >= :dueFrom', { dueFrom: query.dueFrom });
      }

      if (query.dueTo) {
        qb.andWhere('task.due_date <= :dueTo', { dueTo: query.dueTo });
      }

      if (query.quickFilter === 'mine') {
        qb.andWhere('assignee.id = :currentUserId', {
          currentUserId: currentUser.id,
        });
      }

      if (query.quickFilter === 'overdue') {
        qb.andWhere('task.due_date < CURRENT_DATE').andWhere('status.code != :doneStatus', {
          doneStatus: 'done',
        });
      }

      if (query.quickFilter === 'due_soon') {
        qb.andWhere(
          `task.due_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '7 days')`,
        ).andWhere('status.code != :doneStatus', { doneStatus: 'done' });
      }

      qb.orderBy('status.position', 'ASC')
        .addOrderBy('task.position', 'ASC')
        .addOrderBy('task.createdAt', 'ASC')
        .skip((page - 1) * limit)
        .take(limit);

      const [items, total] = await qb.getManyAndCount();
      const data = items.map((task) => this.serializeTaskListItem(task));

      const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
      return successPaginationResponse({
        message: 'Lay danh sach task thanh cong',
        data,
        meta: {
          page,
          limit,
          total,
          totalPages,
        },
      });
    } catch {
      throw AppErrors.task.taskListLoadFailed();
    }
  }

  async getDeletedTasks(
    projectId: string,
    query: ListDeletedTasksDto,
    currentUser: AuthenticatedUser,
  ) {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });
    if (!project) throw AppErrors.project.projectNotFound();

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const membership =
      currentUser.systemRole === SystemRole.ADMIN
        ? null
        : await this.projectMemberRepository.findOne({
            where: {
              project: { id: projectId },
              user: { id: currentUser.id },
            },
            relations: { role: true },
          });

    if (currentUser.systemRole !== SystemRole.ADMIN && !membership) {
      throw AppErrors.project.membershipRequired();
    }

    const canViewAll =
      currentUser.systemRole === SystemRole.ADMIN ||
      membership?.role.code === 'admin' ||
      membership?.role.code === 'manager';

    try {
      const qb = this.taskRepository
        .createQueryBuilder('task')
        .withDeleted()
        .leftJoinAndSelect('task.project', 'project')
        .leftJoinAndSelect('task.taskType', 'taskType')
        .leftJoinAndSelect('task.status', 'status')
        .leftJoinAndSelect('task.priority', 'priority')
        .leftJoinAndSelect('task.reporter', 'reporter')
        .leftJoinAndSelect('task.assignee', 'assignee')
        .leftJoinAndSelect('task.parentTask', 'parentTask')
        .leftJoinAndSelect('task.deletedBy', 'deletedBy')
        .where('project.id = :projectId', { projectId })
        .andWhere('task.deleted_at IS NOT NULL')
        .orderBy('task.deleted_at', 'DESC')
        .skip((page - 1) * limit)
        .take(limit);

      if (!canViewAll) {
        qb.andWhere('task.reporter_user_id = :currentUserId', {
          currentUserId: currentUser.id,
        });
      }

      if (query.keyword?.trim()) {
        const keyword = `%${query.keyword.trim()}%`;
        qb.andWhere(
          new Brackets((subQb) => {
            subQb
              .where('task.title ILIKE :keyword', { keyword })
              .orWhere('task.description ILIKE :keyword', { keyword })
              .orWhere('task.task_code ILIKE :keyword', { keyword });
          }),
        );
      }

      const [tasks, total] = await qb.getManyAndCount();

      return successPaginationResponse({
        message: 'Lay danh sach task da xoa thanh cong',
        data: tasks.map((task) => ({
          ...this.serializeTaskListItem(task),
          deletedAt: task.deletedAt,
          deletedBy: task.deletedBy
            ? {
                id: task.deletedBy.id,
                email: task.deletedBy.email,
                username: task.deletedBy.username,
                fullName: task.deletedBy.fullName,
                avatarUrl: task.deletedBy.avatarUrl,
              }
            : null,
        })),
        meta: {
          page,
          limit,
          total,
          totalPages: total === 0 ? 0 : Math.ceil(total / limit),
        },
      });
    } catch (error) {
      if (error instanceof AppException) throw error;
      throw AppErrors.task.taskListLoadFailed();
    }
  }
  private serializeTaskListItem(task: Task) {
    return {
      id: task.id,
      taskCode: task.taskCode,
      title: task.title,
      description: task.description,
      dueDate: task.dueDate,
      estimatedHours: task.estimatedHours,
      position: task.position,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      taskType: task.taskType
        ? {
            id: task.taskType.id,
            code: task.taskType.code,
            name: task.taskType.name,
          }
        : null,
      status: task.status
        ? {
            id: task.status.id,
            code: task.status.code,
            name: task.status.name,
            color: task.status.color,
            position: task.boardColumn?.position ?? task.status.position,
          }
        : null,
      priority: task.priority
        ? {
            id: task.priority.id,
            code: task.priority.code,
            name: task.priority.name,
            weight: task.priority.weight,
          }
        : null,
      reporter: task.reporter
        ? {
            id: task.reporter.id,
            email: task.reporter.email,
            username: task.reporter.username,
            fullName: task.reporter.fullName,
            avatarUrl: task.reporter.avatarUrl,
            isActive: task.reporter.isActive,
          }
        : null,
      assignee: task.assignee
        ? {
            id: task.assignee.id,
            email: task.assignee.email,
            username: task.assignee.username,
            fullName: task.assignee.fullName,
            avatarUrl: task.assignee.avatarUrl,
            isActive: task.assignee.isActive,
          }
        : null,
      parentTask: task.parentTask
        ? {
            id: task.parentTask.id,
            taskCode: task.parentTask.taskCode,
            title: task.parentTask.title,
          }
        : null,
    };
  }
  async getTaskDetails(projectId: string, taskId: string) {
    const task = await this.taskRepository.findOne({
      where: { id: taskId, project: { id: projectId } },
      relations: this.taskRelations(),
    });
    if (!task) throw AppErrors.task.taskNotFound();

    return successResponse({
      message: ' Lay thong tin task thanh cong',
      data: task,
    });
  }

  async updateTask(
    projectId: string,
    taskId: string,
    dto: UpdateTaskDto,
    currentUser: AuthenticatedUser,
  ) {
    const task = await this.taskRepository.findOne({
      where: { id: taskId, project: { id: projectId } },
      relations: this.taskRelations(),
    });

    if (!task) throw AppErrors.task.taskNotFound();

    const updatedByUser = await this.userRepository.findOne({
      where: { id: currentUser.id },
    });

    if (!updatedByUser) throw AppErrors.auth.userNotFound();
    if (!updatedByUser.isActive) throw AppErrors.auth.accountDisabled();

    const previousAssigneeId = task.assignee?.id ?? null;
    const previousDueDate = task.dueDate ?? null;

    if (
      dto.title === undefined &&
      dto.description === undefined &&
      dto.taskTypeId === undefined &&
      dto.priorityId === undefined &&
      dto.assigneeUserId === undefined &&
      dto.parentTaskId === undefined &&
      dto.dueDate === undefined &&
      dto.estimatedHours === undefined
    ) {
      throw AppErrors.task.taskUpdatePayloadEmpty();
    }

    const changes: Array<{
      fieldName: string;
      oldValue: string | null;
      newValue: string | null;
    }> = [];

    if (dto.title !== undefined) {
      const nextTitle = dto.title.trim();
      if (!nextTitle) {
        throw AppErrors.common.validationMessages(['Tieu de khong duoc de trong']);
      }

      if (task.title !== nextTitle) {
        changes.push({
          fieldName: 'title',
          oldValue: task.title,
          newValue: nextTitle,
        });
        task.title = nextTitle;
      }
    }

    if (dto.description !== undefined) {
      const nextDescription = dto.description?.trim() || null;
      if ((task.description || null) !== nextDescription) {
        changes.push({
          fieldName: 'description',
          oldValue: task.description || null,
          newValue: nextDescription,
        });
        task.description = nextDescription;
      }
    }

    if (dto.taskTypeId !== undefined) {
      const taskType = await this.taskTypeRepository.findOne({
        where: { id: dto.taskTypeId },
      });
      if (!taskType) throw AppErrors.task.taskTypeNotFound();

      if (task.taskType.id !== taskType.id) {
        changes.push({
          fieldName: 'taskType',
          oldValue: task.taskType.name,
          newValue: taskType.name,
        });
        task.taskType = taskType;
      }
    }

    if (dto.priorityId !== undefined) {
      const priority = await this.priorityRepository.findOne({
        where: { id: dto.priorityId },
      });
      if (!priority) throw AppErrors.task.priorityNotFound();

      if (task.priority.id !== priority.id) {
        changes.push({
          fieldName: 'priority',
          oldValue: task.priority.name,
          newValue: priority.name,
        });
        task.priority = priority;
      }
    }

    if (dto.assigneeUserId !== undefined) {
      if (dto.assigneeUserId === null) {
        if (task.assignee) {
          changes.push({
            fieldName: 'assignee',
            oldValue: task.assignee.fullName,
            newValue: null,
          });
        }
        task.assignee = null;
      } else {
        const nextAssignee = await this.resolveAssignee(projectId, dto.assigneeUserId);

        if (!task.assignee || task.assignee.id !== nextAssignee.id) {
          changes.push({
            fieldName: 'assignee',
            oldValue: task.assignee?.fullName || null,
            newValue: nextAssignee.fullName,
          });
          task.assignee = nextAssignee;
        }
      }
    }

    if (dto.parentTaskId !== undefined) {
      if (dto.parentTaskId === null) {
        if (task.parentTask) {
          changes.push({
            fieldName: 'parentTask',
            oldValue: task.parentTask.taskCode,
            newValue: null,
          });
        }
        task.parentTask = null;
      } else {
        const parentTask = await this.resolveParentTask(projectId, dto.parentTaskId);

        if (parentTask.id === task.id) {
          throw AppErrors.task.invalidParentTask();
        }

        if (!task.parentTask || task.parentTask.id !== parentTask.id) {
          changes.push({
            fieldName: 'parentTask',
            oldValue: task.parentTask?.taskCode || null,
            newValue: parentTask.taskCode,
          });
          task.parentTask = parentTask;
        }
      }
    }

    if (dto.dueDate !== undefined) {
      const nextDueDate = dto.dueDate || null;
      if ((task.dueDate || null) !== nextDueDate) {
        changes.push({
          fieldName: 'dueDate',
          oldValue: task.dueDate || null,
          newValue: nextDueDate,
        });
        task.dueDate = nextDueDate;
      }
    }

    if (dto.estimatedHours !== undefined) {
      const nextEstimatedHours =
        dto.estimatedHours === null || dto.estimatedHours === undefined
          ? null
          : String(dto.estimatedHours);

      const currentEstimatedHours =
        task.estimatedHours === null || task.estimatedHours === undefined
          ? null
          : String(task.estimatedHours);

      if (currentEstimatedHours !== nextEstimatedHours) {
        changes.push({
          fieldName: 'estimatedHours',
          oldValue: currentEstimatedHours,
          newValue: nextEstimatedHours,
        });
        task.estimatedHours = dto.estimatedHours ?? null;
      }
    }

    try {
      const updatedTask = await this.dataSource.transaction(async (manager) => {
        const savedTask = await manager.save(Task, task);

        if (changes.length > 0) {
          await this.taskHistoriesService.createManyHistories(
            savedTask,
            updatedByUser,
            changes,
            manager,
          );
        }

        await this.activityService.log(
          {
            actor: updatedByUser,
            project: task.project,
            actionType: ActivityAction.TASK_UPDATED,
            targetType: ActivityTargetType.TASK,
            targetId: task.id,
            message: `${updatedByUser.fullName} da cap nhat task ${task.taskCode}`,
            metadata: {
              taskId: task.id,
              taskCode: task.taskCode,
            },
          },
          manager,
        );

        return savedTask;
      });

      if (updatedTask.assignee && updatedTask.assignee.id !== previousAssigneeId) {
        try {
          await this.notificationsService.notifyTaskAssigned(
            updatedTask.assignee.id,
            updatedTask.taskCode,
            updatedTask.id,
            updatedTask.project.id,
          );
        } catch (error) {
          console.error('TASK_ASSIGNED_NOTIFICATION_ERROR:', error);
        }
      }

      if (
        updatedTask.assignee &&
        String(updatedTask.dueDate ?? null) !== String(previousDueDate ?? null)
      ) {
        try {
          await this.notificationsService.notifyTaskDeadlineChanged(
            updatedTask.assignee.id,
            updatedTask.taskCode,
            updatedTask.id,
            updatedTask.project.id,
            updatedTask.dueDate ?? null,
          );
        } catch (error) {
          console.error('TASK_DEADLINE_NOTIFICATION_ERROR:', error);
        }
      }
      return successResponse({
        message: 'Cap nhat task thanh cong',
        data: await this.taskRepository.findOne({
          where: { id: updatedTask.id },
          relations: this.taskRelations(),
        }),
      });
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      throw AppErrors.task.taskUpdateFailed();
    }
  }

  async updateTaskStatus(
    projectId: string,
    taskId: string,
    dto: UpdateTaskStatusDto,
    currentUser: AuthenticatedUser,
  ) {
    return this.moveTaskInternal(projectId, taskId, dto.statusId, null, currentUser, true);
  }

  async moveTask(
    projectId: string,
    taskId: string,
    dto: MoveTaskDto,
    currentUser: AuthenticatedUser,
  ) {
    return this.moveTaskInternal(
      projectId,
      taskId,
      dto.statusId,
      dto.targetIndex,
      currentUser,
      false,
    );
  }

  private async moveTaskInternal(
    projectId: string,
    taskId: string,
    statusId: string,
    requestedTargetIndex: number | null,
    currentUser: AuthenticatedUser,
    statusOnly: boolean,
  ) {
    const changedBy = await this.userRepository.findOne({
      where: { id: currentUser.id },
    });

    if (!changedBy) throw AppErrors.auth.userNotFound();
    if (!changedBy.isActive) throw AppErrors.auth.accountDisabled();

    try {
      const result = await this.dataSource.transaction(async (manager) => {
        await this.lockProjectTaskOrdering(manager, projectId);

        const task = await manager
          .getRepository(Task)
          .createQueryBuilder('task')
          .innerJoinAndSelect('task.project', 'project')
          .innerJoinAndSelect('task.status', 'status')
          .leftJoinAndSelect('task.boardColumn', 'boardColumn')
          .where('task.id = :taskId', { taskId })
          .andWhere('project.id = :projectId', { projectId })
          .setLock('pessimistic_write')
          .getOne();

        if (!task) throw AppErrors.task.taskNotFound();

        const nextStatus = await manager.findOne(TaskStatus, {
          where: { id: statusId },
        });

        if (!nextStatus) throw AppErrors.task.taskStatusNotFound();

        const nextColumn = await manager.findOne(BoardColumn, {
          where: {
            status: { id: nextStatus.id },
            board: { project: { id: projectId } },
          },
          relations: { board: { project: true }, status: true },
        });
        if (!nextColumn) throw AppErrors.task.boardColumnNotFound();

        const statusChanged = task.status.id !== nextStatus.id;
        const columnChanged = task.boardColumn?.id !== nextColumn.id;
        if (columnChanged && nextColumn.wipLimit) {
          const destinationCount = await manager.count(Task, {
            where: { boardColumn: { id: nextColumn.id } },
          });
          if (destinationCount >= nextColumn.wipLimit) {
            throw AppErrors.task.boardColumnWipLimitReached();
          }
        }
        if (statusOnly && !statusChanged) {
          return { task, changed: false, statusChanged: false };
        }

        const statusIds = statusChanged ? [task.status.id, nextStatus.id] : [task.status.id];

        const affectedTasks = await manager
          .getRepository(Task)
          .createQueryBuilder('task')
          .innerJoinAndSelect('task.status', 'status')
          .where('task.project_id = :projectId', { projectId })
          .andWhere('task.status_id IN (:...statusIds)', { statusIds })
          .orderBy('task.position', 'ASC')
          .addOrderBy('task.createdAt', 'ASC')
          .addOrderBy('task.id', 'ASC')
          .setLock('pessimistic_write')
          .getMany();

        const sourceTasks = affectedTasks.filter((item) => item.status.id === task.status.id);
        const currentIndex = sourceTasks.findIndex((item) => item.id === task.id);

        if (currentIndex < 0) throw AppErrors.task.taskNotFound();

        const oldStatus = task.status;
        const oldPosition = currentIndex;
        const sourceWithoutTask = sourceTasks.filter((item) => item.id !== task.id);
        const destinationTasks = statusChanged
          ? affectedTasks.filter((item) => item.status.id === nextStatus.id)
          : sourceWithoutTask;
        const targetIndex = Math.min(
          requestedTargetIndex ?? destinationTasks.length,
          destinationTasks.length,
        );

        if (!statusChanged && targetIndex === currentIndex) {
          return { task, changed: false, statusChanged: false };
        }

        task.status = nextStatus;
        task.boardColumn = nextColumn;
        destinationTasks.splice(targetIndex, 0, task);

        const tasksToSave = statusChanged
          ? [...sourceWithoutTask, ...destinationTasks]
          : destinationTasks;

        sourceWithoutTask.forEach((item, index) => {
          item.position = index;
        });
        destinationTasks.forEach((item, index) => {
          item.position = index;
        });

        await manager.save(Task, tasksToSave);

        const changes: Array<{
          fieldName: string;
          oldValue: string | null;
          newValue: string | null;
        }> = [];

        if (statusChanged) {
          changes.push({
            fieldName: 'status',
            oldValue: oldStatus.name,
            newValue: nextStatus.name,
          });
        }

        if (oldPosition !== targetIndex || statusChanged) {
          changes.push({
            fieldName: 'position',
            oldValue: String(oldPosition),
            newValue: String(targetIndex),
          });
        }

        await this.taskHistoriesService.createManyHistories(task, changedBy, changes, manager);

        await this.activityService.log(
          {
            actor: changedBy,
            project: task.project,
            actionType: statusChanged
              ? ActivityAction.TASK_STATUS_CHANGED
              : ActivityAction.TASK_MOVED,
            targetType: ActivityTargetType.TASK,
            targetId: task.id,
            message: statusChanged
              ? `${changedBy.fullName} da chuyen ${task.taskCode} tu ${oldStatus.name} sang ${nextStatus.name}`
              : `${changedBy.fullName} da sap xep lai ${task.taskCode}`,
            metadata: {
              taskId: task.id,
              taskCode: task.taskCode,
              oldStatus: oldStatus.name,
              newStatus: nextStatus.name,
              oldPosition,
              newPosition: targetIndex,
            },
          },
          manager,
        );

        return { task, changed: true, statusChanged };
      });

      return successResponse({
        message: result.changed
          ? result.statusChanged
            ? 'Cap nhat status task thanh cong'
            : 'Sap xep task thanh cong'
          : statusOnly
            ? 'Status task khong thay doi'
            : 'Vi tri task khong thay doi',
        data: this.serializeTaskStatusUpdate(result.task, result.task.status),
      });
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }

      throw AppErrors.task.taskStatusUpdateFailed();
    }
  }

  async deleteTask(projectId: string, taskId: string, currentUser: AuthenticatedUser) {
    const task = await this.taskRepository.findOne({
      where: { id: taskId, project: { id: projectId } },
      relations: { project: true, reporter: true, status: true, boardColumn: true },
    });
    if (!task) throw AppErrors.task.taskNotFound();

    await this.ensureCanDeleteTask(projectId, task, currentUser);

    const actor = await this.userRepository.findOne({
      where: { id: currentUser.id },
    });

    if (!actor) throw AppErrors.auth.userNotFound();

    try {
      await this.dataSource.transaction(async (manager) => {
        await this.lockProjectTaskOrdering(manager, projectId);

        task.deletedBy = actor;
        await manager.save(Task, task);
        await manager.softRemove(Task, task);

        const remainingTasks = await manager
          .getRepository(Task)
          .createQueryBuilder('task')
          .where('task.project_id = :projectId', { projectId })
          .andWhere('task.status_id = :statusId', { statusId: task.status.id })
          .orderBy('task.position', 'ASC')
          .addOrderBy('task.createdAt', 'ASC')
          .addOrderBy('task.id', 'ASC')
          .setLock('pessimistic_write')
          .getMany();

        remainingTasks.forEach((remainingTask, index) => {
          remainingTask.position = index;
        });
        await manager.save(Task, remainingTasks);

        await this.activityService.log(
          {
            actor,
            project: task.project,
            actionType: ActivityAction.TASK_DELETED,
            targetType: ActivityTargetType.TASK,
            targetId: task.id,
            message: `${actor.fullName} da xoa task ${task.taskCode}`,
            metadata: {
              taskId: task.id,
              taskCode: task.taskCode,
              title: task.title,
            },
          },
          manager,
        );
      });

      return successResponse({
        message: 'Xoa task thanh cong',
        data: {
          id: task.id,
          taskCode: task.taskCode,
          deletedBy: currentUser.id,
        },
      });
    } catch (error) {
      if (error instanceof AppException) throw error;
      throw AppErrors.task.taskDeleteFailed();
    }
  }

  async restoreTask(projectId: string, taskId: string, currentUser: AuthenticatedUser) {
    const task = await this.taskRepository.findOne({
      where: { id: taskId, project: { id: projectId } },
      relations: { project: true, reporter: true, status: true, boardColumn: true },
      withDeleted: true,
    });

    if (!task) throw AppErrors.task.taskNotFound();

    await this.ensureCanDeleteTask(projectId, task, currentUser);

    const actor = await this.userRepository.findOne({
      where: { id: currentUser.id },
    });

    if (!actor) throw AppErrors.auth.userNotFound();

    if (!task.deletedAt) {
      return successResponse({
        message: 'Task chua bi xoa',
        data: { id: task.id },
      });
    }

    try {
      await this.dataSource.transaction(async (manager) => {
        await this.lockProjectTaskOrdering(manager, projectId);

        if (task.boardColumn?.wipLimit) {
          const currentTaskCount = await manager.count(Task, {
            where: { boardColumn: { id: task.boardColumn.id } },
          });
          if (currentTaskCount >= task.boardColumn.wipLimit) {
            throw AppErrors.task.boardColumnWipLimitReached();
          }
        }

        const positionResult = await manager
          .getRepository(Task)
          .createQueryBuilder('task')
          .select('COALESCE(MAX(task.position), -1)', 'maxPosition')
          .where('task.project_id = :projectId', { projectId })
          .andWhere('task.status_id = :statusId', { statusId: task.status.id })
          .getRawOne<{ maxPosition: string }>();

        await manager.restore(Task, task.id);
        task.position = Number(positionResult?.maxPosition ?? -1) + 1;
        await manager.update(Task, task.id, { position: task.position });

        await this.activityService.log(
          {
            actor,
            project: task.project,
            actionType: ActivityAction.TASK_RESTORED,
            targetType: ActivityTargetType.TASK,
            targetId: task.id,
            message: `${actor.fullName} da khoi phuc task ${task.taskCode}`,
            metadata: {
              taskId: task.id,
              taskCode: task.taskCode,
              title: task.title,
            },
          },
          manager,
        );
      });

      return successResponse({
        message: 'Khoi phuc task thanh cong',
        data: {
          id: task.id,
          taskCode: task.taskCode,
          restoredBy: currentUser.id,
        },
      });
    } catch (error) {
      if (error instanceof AppException) throw error;
      throw AppErrors.task.taskRestoreFailed();
    }
  }
  async createTaskType(dto: CreateTaskTypeDto) {
    const normalizedCode = dto.code.trim().toLowerCase();
    const normalizedName = dto.name.trim();

    const existing = await this.taskTypeRepository.findOne({
      where: { code: normalizedCode },
    });

    if (existing) {
      throw AppErrors.task.taskTypeAlreadyExists();
    }

    try {
      const taskType = this.taskTypeRepository.create({
        code: normalizedCode,
        name: normalizedName,
      });

      const saved = await this.taskTypeRepository.save(taskType);

      return successResponse({
        message: 'Tao loai task thanh cong',
        data: saved,
      });
    } catch {
      throw AppErrors.task.taskTypeCreationFailed();
    }
  }

  async createTaskStatus(dto: CreateTaskStatusDto) {
    const normalizedCode = dto.code.trim().toLowerCase();
    const normalizedName = dto.name.trim();

    const existing = await this.taskStatusRepository.findOne({
      where: { code: normalizedCode },
    });

    if (existing) {
      throw AppErrors.task.taskStatusAlreadyExists();
    }

    try {
      const taskStatus = this.taskStatusRepository.create({
        code: normalizedCode,
        name: normalizedName,
        color: dto.color?.trim() || undefined,
        position: dto.position,
      });

      const saved = await this.taskStatusRepository.save(taskStatus);

      return successResponse({
        message: 'Tao trang thai task thanh cong',
        data: saved,
      });
    } catch {
      throw AppErrors.task.taskStatusCreationFailed();
    }
  }

  async createPriority(dto: CreatePriorityDto) {
    const normalizedCode = dto.code.trim().toLowerCase();
    const normalizedName = dto.name.trim();

    const existing = await this.priorityRepository.findOne({
      where: { code: normalizedCode },
    });

    if (existing) {
      throw AppErrors.task.priorityAlreadyExists();
    }

    try {
      const priority = this.priorityRepository.create({
        code: normalizedCode,
        name: normalizedName,
        weight: dto.weight,
      });

      const saved = await this.priorityRepository.save(priority);

      return successResponse({
        message: 'Tao do uu tien thanh cong',
        data: saved,
      });
    } catch {
      throw AppErrors.task.priorityCreationFailed();
    }
  }
  private async resolveAssignee(projectId: string, assigneeUserId: string) {
    const assignee = await this.userRepository.findOne({
      where: { id: assigneeUserId },
    });

    if (!assignee) throw AppErrors.task.assigneeNotFound();

    const membership = await this.projectMemberRepository.findOne({
      where: {
        project: { id: projectId },
        user: { id: assigneeUserId },
      },
    });

    if (!membership) throw AppErrors.task.assigneeNotInProject();

    return assignee;
  }

  private async ensureCanDeleteTask(projectId: string, task: Task, currentUser: AuthenticatedUser) {
    if (currentUser.systemRole === SystemRole.ADMIN) return;

    const membership = await this.projectMemberRepository.findOne({
      where: {
        project: { id: projectId },
        user: { id: currentUser.id },
      },
      relations: { role: true },
    });

    if (!membership) throw AppErrors.project.membershipRequired();

    const roleCode = membership.role.code.toLowerCase();
    if (roleCode === 'admin' || roleCode === 'manager') return;
    if (task.reporter?.id === currentUser.id) return;

    throw AppErrors.project.permissionDenied();
  }

  private async resolveParentTask(projectId: string, parentTaskId: string) {
    const parentTask = await this.taskRepository.findOne({
      where: { id: parentTaskId },
      relations: {
        project: true,
      },
    });

    if (!parentTask) {
      throw AppErrors.task.parentTaskNotFound();
    }

    if (parentTask.project.id !== projectId) {
      throw AppErrors.task.parentTaskDifferentProject();
    }

    return parentTask;
  }

  private async generateNextTaskCode(
    projectKey: string,
    projectId: string,
    manager: DataSource['manager'],
  ) {
    let nextNumber =
      (await manager.count(Task, {
        where: { project: { id: projectId } },
        withDeleted: true,
      })) + 1;

    while (true) {
      const candidate = `${projectKey}-${nextNumber}`;

      const existed = await manager.findOne(Task, {
        where: { taskCode: candidate },
        withDeleted: true,
      });

      if (!existed) {
        return candidate;
      }

      nextNumber += 1;
    }
  }

  private async lockProjectTaskOrdering(manager: EntityManager, projectId: string) {
    await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [projectId]);
  }

  private taskRelations() {
    return {
      project: true,
      taskType: true,
      status: true,
      priority: true,
      reporter: true,
      assignee: true,
      parentTask: true,
      boardColumn: true,
    } as const;
  }

  private serializeTaskStatusUpdate(task: Task, status: TaskStatus) {
    return {
      id: task.id,
      position: task.position,
      status: {
        id: status.id,
        code: status.code,
        name: status.name,
        color: status.color,
        position: task.boardColumn?.position ?? status.position,
      },
    };
  }
}
