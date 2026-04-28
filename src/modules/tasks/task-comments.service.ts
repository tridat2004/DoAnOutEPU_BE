import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { TaskComment } from './entities/task-comment.entity';
import { Task } from './entities/task.entity';
import { User } from '../users/entities/user.entity';
import { CreateTaskCommentDto } from './dto/create-task-comment.dto';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { AppErrors, AppException } from '../../common/exceptions/exception';
import { successResponse } from '../../common/response';
import { TaskHistoriesService } from './task-histories.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ActivityAction } from '../activity/constants/activity-action.constant';
import { ActivityTargetType } from '../activity/constants/activity-target.constant';
import { ActivityService } from '../activity/activity.service';
@Injectable()
export class TaskCommentsService {
  constructor(
    @InjectRepository(TaskComment)
    private readonly taskCommentRepository: Repository<TaskComment>,

    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    private readonly taskHistoriesService: TaskHistoriesService,
    private readonly notificationsService: NotificationsService,
    private readonly activityService: ActivityService
  ) { }

  async createComment(
    projectId: string,
    taskId: string,
    dto: CreateTaskCommentDto,
    currentUser: AuthenticatedUser,
  ) {
    const task = await this.taskRepository.findOne({
      where: {
        id: taskId,
        project: { id: projectId },
      },
      relations: {
        project: true,
        assignee: true,
        reporter: true,
      },
    });

    if (!task) {
      throw AppErrors.task.taskNotFound();
    }

    const author = await this.userRepository.findOne({
      where: { id: currentUser.id },
    });

    if (!author) {
      throw AppErrors.auth.userNotFound();
    }

    if (!author.isActive) {
      throw AppErrors.auth.accountDisabled();
    }

    try {
      const comment = this.taskCommentRepository.create({
        task,
        author,
        content: dto.content.trim(),
      });

      const savedComment = await this.taskCommentRepository.save(comment);
      const receiverIds = new Set<string>();

      if (task.assignee?.id && task.assignee.id !== author.id) {
        receiverIds.add(task.assignee.id);
      }

      if (task.reporter?.id && task.reporter.id !== author.id) {
        receiverIds.add(task.reporter.id);
      }

      for (const receiverId of receiverIds) {
        await this.notificationsService.notifyTaskCommented(
          receiverId,
          author.fullName,
          task.taskCode,
          task.id,
          task.project.id,
        );
      }
      await this.taskHistoriesService.createHistory(
        task,
        author,
        'comment',
        null,
        'comment_added',
      );
      await this.activityService.log({
        actor: author,
        project: task.project,
        actionType: ActivityAction.TASK_COMMENTED,
        targetType: ActivityTargetType.COMMENT,
        targetId: savedComment.id,
        message: `${author.fullName} da binh luan trong task ${task.taskCode}`,
        metadata: {
          commentId: savedComment.id,
          taskId: task.id,
          taskCode: task.taskCode,
        },
      });
      return successResponse({
        message: 'Tao comment thanh cong',
        data: await this.taskCommentRepository.findOne({
          where: { id: savedComment.id },
          relations: {
            author: true,
            task: true,
          },
        }),
      });
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }

      throw AppErrors.task.commentCreationFailed();
    }
  }

  async getComments(projectId: string, taskId: string) {
    const task = await this.taskRepository.findOne({
      where: {
        id: taskId,
        project: { id: projectId },
      },
    });

    if (!task) {
      throw AppErrors.task.taskNotFound();
    }

    const comments = await this.taskCommentRepository.find({
      where: {
        task: { id: taskId },
      },
      relations: {
        author: true,
      },
      order: {
        createdAt: 'ASC',
      },
    });

    return successResponse({
      message: 'Lay danh sach comment thanh cong',
      data: comments.map((comment) => ({
        id: comment.id,
        content: comment.content,
        author: {
          id: comment.author.id,
          email: comment.author.email,
          username: comment.author.username,
          fullName: comment.author.fullName,
          avatarUrl: comment.author.avatarUrl,
        },
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
      })),
    });
  }
}