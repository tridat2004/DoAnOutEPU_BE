import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Task } from '../tasks/entities/task.entity';
import { TaskStatus } from '../tasks/entities/task-status.entity';
import { Project } from '../projects/entities/project.entity';
import { User } from '../users/entities/user.entity';
import { TaskHistoriesService } from '../tasks/task-histories.service';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { AppErrors } from '../../common/exceptions/exception';
import { successResponse } from '../../common/response';

@Injectable()
export class BoardService {
    constructor(
        @InjectRepository(Task)
        private readonly taskRepository: Repository<Task>,

        @InjectRepository(TaskStatus)
        private readonly taskStatusRepository: Repository<TaskStatus>,

        @InjectRepository(Project)
        private readonly projectRepository: Repository<Project>,

        @InjectRepository(User)
        private readonly userRepository: Repository<User>,

        private readonly taskHistoriesService: TaskHistoriesService,
    ) { }

    async getBoard(projectId: string) {
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
                reporter: true,
                taskType: true,
            },
            order: {
                createdAt: 'DESC',
            },
        });


        return successResponse({
            message: 'Lay du lieu board thanh cong',
            data: {
                project: {
                    id: project.id,
                    name: project.name,
                    projectKey: project.projectKey,
                },
                columns: statuses.map((status) => ({
                    status: {
                        id: status.id,
                        code: status.code,
                        name: status.name,
                        color: status.color,
                        position: status.position,
                    },
                    tasks: tasks                        // ✅ tasks
                        .filter((task) => task.status?.id === status.id)
                        .map((task) => ({
                            id: task.id,
                            createdAt: task.createdAt,
                            updatedAt: task.updatedAt,
                            taskCode: task.taskCode,
                            title: task.title,
                            description: task.description,
                            dueDate: task.dueDate,
                            estimatedHours: task.estimatedHours,
                            taskType: task.taskType ?? null,
                            status: task.status ?? null,
                            priority: task.priority ?? null,
                            parentTask: task.parentTask ?? null,
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
                        })),
                })),
            },
        })
    }

    async updateTaskStatus(
        projectId: string,
        taskId: string,
        statusId: string,
        currentUser: AuthenticatedUser,
    ) {
        const task = await this.taskRepository.findOne({
            where: {
                id: taskId,
                project: { id: projectId },
            },
            relations: {
                status: true,
                project: true,
            },
        });

        if (!task) {
            throw AppErrors.task.taskNotFound();
        }

        const nextStatus = await this.taskStatusRepository.findOne({
            where: { id: statusId },
        });

        if (!nextStatus) {
            throw AppErrors.task.taskStatusNotFound();
        }

        if (task.status?.id === nextStatus.id) {
            return successResponse({
                message: 'Status task khong thay doi',
                data: {
                    id: task.id,
                    status: {
                        id: nextStatus.id,
                        code: nextStatus.code,
                        name: nextStatus.name,
                        color: nextStatus.color,
                        position: nextStatus.position,
                    },
                },
            });
        }

        const changedBy = await this.userRepository.findOne({
            where: { id: currentUser.id },
        });

        if (!changedBy) {
            throw AppErrors.auth.userNotFound();
        }

        const oldStatusName = task.status?.name || null;

        task.status = nextStatus;

        const updatedTask = await this.taskRepository.save(task);

        await this.taskHistoriesService.createHistory(
            updatedTask,
            changedBy,
            'status',
            oldStatusName,
            nextStatus.name,
        );

        return successResponse({
            message: 'Cap nhat status task thanh cong',
            data: {
                id: updatedTask.id,
                status: {
                    id: nextStatus.id,
                    code: nextStatus.code,
                    name: nextStatus.name,
                    color: nextStatus.color,
                    position: nextStatus.position,
                },
            },
        });
    }
}