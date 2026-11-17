import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Task } from '../tasks/entities/task.entity';
import { Project } from '../projects/entities/project.entity';
import { TaskStatus } from '../tasks/entities/task-status.entity';
import { AppErrors } from '../../common/exceptions/exception';
import { successResponse } from '../../common/response';

@Injectable()
export class TimelineService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,

    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,

    @InjectRepository(TaskStatus)
    private readonly taskStatusRepository: Repository<TaskStatus>,
  ) {}

  async getTimeline(projectId: string) {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });

    if (!project) {
      throw AppErrors.project.projectNotFound();
    }

    const statuses = await this.taskStatusRepository.find({
      order: {
        position: 'ASC',
        createdAt: 'ASC',
      },
    });

    const tasks = await this.taskRepository.find({
      where: {
        project: { id: projectId },
      },
      relations: {
        status: true,
        priority: true,
        assignee: true,
        taskType: true,
      },
      order: {
        position: 'ASC',
        createdAt: 'ASC',
      },
    });

    return successResponse({
      message: 'Lay du lieu timeline thanh cong',
      data: {
        project: {
          id: project.id,
          name: project.name,
          projectKey: project.projectKey,
        },

        statuses: statuses.map((status) => ({
          id: status.id,
          code: status.code,
          name: status.name,
          color: status.color ?? null,
          position: status.position ?? null,
        })),

        items: tasks.map((task) => ({
          id: task.id,
          taskCode: task.taskCode,
          title: task.title,
          startDate: task.createdAt,
          dueDate: task.dueDate,
          estimatedHours: task.estimatedHours,
          position: task.position,

          status: task.status
            ? {
                id: task.status.id,
                code: task.status.code,
                name: task.status.name,
                color: task.status.color ?? null,
                position: task.status.position ?? null,
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

          assignee: task.assignee
            ? {
                id: task.assignee.id,
                fullName: task.assignee.fullName,
                avatarUrl: task.assignee.avatarUrl ?? null,
              }
            : null,

          taskType: task.taskType
            ? {
                id: task.taskType.id,
                code: task.taskType.code,
                name: task.taskType.name,
              }
            : null,
        })),
      },
    });
  }
}
