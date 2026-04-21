import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository , Brackets} from 'typeorm';
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

    private readonly taskHistoriesService: TaskHistoriesService,
  ) { }

  async getTaskTypes() {
    const data = await this.taskTypeRepository.find({
      order: { name: 'ASC' },
    });

    return successResponse({
      message: 'Lay danh sach loai task thanh cong',
      data
    })
  }
  async getTaskStatuses() {
    const data = await this.taskStatusRepository.find({
      order: { position: 'ASC', createdAt: 'ASC' }
    });

    return successResponse({
      message: 'Lay danh sach trang thai task thanh cong',
      data
    })
  }

  async getPriorites() {
    const data = await this.priorityRepository.find({
      order: { weight: 'DESC', createdAt: 'ASC' },
    })
    return successResponse({
      message: 'Lay danh sach do uu tien thanh cong',
      data,
    })
  }

  async createTask(projectId: string, dto: CreateTaskDto, currentUser: AuthenticatedUser) {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    })
    if (!project) throw AppErrors.project.projectNotFound();

    const reporter = await this.userRepository.findOne({
      where: { id: currentUser.id },
    })
    if (!reporter) throw AppErrors.auth.userNotFound();
    if (!reporter.isActive) throw AppErrors.auth.accountDisabled();

    const taskType = await this.taskTypeRepository.findOne({
      where: { id: dto.taskTypeId },
    })
    if (!taskType) throw AppErrors.task.taskTypeNotFound();

    const status = await this.taskStatusRepository.findOne({
      where: { id: dto.statusId },
    })
    if (!status) throw AppErrors.task.taskStatusNotFound();

    const priority = await this.priorityRepository.findOne({
      where: { id: dto.priorityId },
    });
    if (!priority) throw AppErrors.task.priorityNotFound();

    const assignee = dto.assigneeUserId ? await this.resolveAssignee(projectId, dto.assigneeUserId) : null;
    const parentTask = dto.parentTaskId ? await this.resolveParentTask(projectId, dto.parentTaskId) : null;

    try {
      const savedTask = await this.dataSource.transaction(async (manager) => {
        const taskCode = await this.generateNextTaskCode(project.projectKey, project.id, manager)
        const task = manager.create(Task, {
          project,
          taskCode,
          title: dto.title.trim(),
          description: dto.description?.trim() || undefined,
          taskType,
          status,
          priority,
          reporter,
          assignee: assignee || undefined,
          parentTask: parentTask || undefined,
          dueDate: dto.dueDate || undefined,
          estimatedHours: dto.estimatedHours,
        });

        return manager.save(Task, task)
      })
      return successResponse({
        message: 'Tao task thanh cong',
        data: await this.taskRepository.findOne({
          where: { id: savedTask.id },
          relations: this.taskRelations(),
        })
      })
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      throw AppErrors.task.taskCreationFailed();
    }
  }
  async getTasks(
    projectId: string,
    query: ListProjectTasksDto,
    _currentUser: AuthenticatedUser,
  ) {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });

    if (!project) {
      throw AppErrors.project.projectNotFound();
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

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

      qb.orderBy('task.createdAt', 'DESC')
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
          totalPages
        },
      });
    } catch {
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
            position: task.status.position,
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
  async getTaskDetails(projectId: string, taskId: string, currentUser: AuthenticatedUser) {
    const task = await this.taskRepository.findOne({
      where: { id: taskId, project: { id: projectId } },
      relations: this.taskRelations(),
    });
    if (!task) throw AppErrors.task.taskNotFound();

    return successResponse({
      message: ' Lay thong tin task thanh cong',
      data: task,
    })
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

    if (
      dto.title === undefined &&
      dto.description === undefined &&
      dto.taskTypeId === undefined &&
      dto.statusId === undefined &&
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
        throw AppErrors.common.validationMessages([
          'Tieu de khong duoc de trong',
        ]);
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

    if (dto.statusId !== undefined) {
      const status = await this.taskStatusRepository.findOne({
        where: { id: dto.statusId },
      });
      if (!status) throw AppErrors.task.taskStatusNotFound();

      if (task.status.id !== status.id) {
        changes.push({
          fieldName: 'status',
          oldValue: task.status.name,
          newValue: status.name,
        });
        task.status = status;
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
      const updatedTask = await this.taskRepository.save(task);

      if (changes.length > 0) {
        await this.taskHistoriesService.createManyHistories(
          updatedTask,
          updatedByUser,
          changes,
        );
      }

      return successResponse({
        message: 'Cap nhat task thanh cong',
        data: await this.taskRepository.findOne({
          where: { id: updatedTask.id },
          relations: this.taskRelations(),
        }),
      });
    } catch {
      throw AppErrors.task.taskUpdateFailed();
    }
  }
  async deleteTask(projectId: string, taskId: string, currentUser: AuthenticatedUser) {
    const task = await this.taskRepository.findOne({
      where: { id: taskId, project: { id: projectId }, }
    });
    if (!task) throw AppErrors.task.taskNotFound();

    try {
      await this.taskRepository.remove(task);

      return successResponse({
        message: 'Xoa task thanh cong',
        data: {
          id: task.id,
          taskCode: task.taskCode,
          deletedBy: currentUser.id,
        }
      })
    } catch {
      throw AppErrors.task.taskDeleteFailed();
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
    })

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
    let nextNumber = (await manager.count(Task, {
      where: { project: { id: projectId } },
    })) + 1;

    while (true) {
      const candidate = `${projectKey}-${nextNumber}`;

      const existed = await manager.findOne(Task, {
        where: { taskCode: candidate },
      });

      if (!existed) {
        return candidate;
      }

      nextNumber += 1;
    }
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
    } as const;
  }


}