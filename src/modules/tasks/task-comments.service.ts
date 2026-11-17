import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { TaskComment } from './entities/task-comment.entity';
import { TaskCommentAttachment } from './entities/task-comment-attachment.entity';
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
import { UpdateTaskCommentDto } from './dto/update-task-comment.dto';
import {
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { TaskCommentReaction } from './entities/task-comment-reaction.entity';
import { ToggleTaskCommentReactionDto } from './dto/toggle-task-comment-reaction.dto';
import { normalizeUploadedFileName } from '../../common/utils/file-name.util';

type UploadedCommentFile = {
  originalname: string;
  filename: string;
  mimetype: string;
  size: number;
};

@Injectable()
export class TaskCommentsService {
  constructor(
    @InjectRepository(TaskComment)
    private readonly taskCommentRepository: Repository<TaskComment>,

    @InjectRepository(TaskCommentAttachment)
    private readonly taskCommentAttachmentRepository: Repository<TaskCommentAttachment>,

    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(TaskCommentReaction)
    private readonly taskCommentReactionRepository: Repository<TaskCommentReaction>,
    private readonly taskHistoriesService: TaskHistoriesService,
    private readonly notificationsService: NotificationsService,
    private readonly activityService: ActivityService,
  ) {}

  async createComment(
    projectId: string,
    taskId: string,
    dto: CreateTaskCommentDto,
    currentUser: AuthenticatedUser,
    files: UploadedCommentFile[] = [],
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

      if (files.length > 0) {
        const attachments = files.map((file) =>
          this.taskCommentAttachmentRepository.create({
            task,
            comment: savedComment,
            uploadedBy: author,
            fileName: normalizeUploadedFileName(file.originalname),
            fileUrl: `/uploads/task-comments/${file.filename}`,
            mimeType: file.mimetype,
            sizeBytes: file.size,
          }),
        );

        await this.taskCommentAttachmentRepository.save(attachments);
      }

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

      await this.taskHistoriesService.createHistory(task, author, 'comment', null, 'comment_added');

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

      const freshComment = await this.taskCommentRepository.findOne({
        where: { id: savedComment.id },
        relations: {
          author: true,
          task: true,
          attachments: true,
        },
      });

      return successResponse({
        message: 'Tao comment thanh cong',
        data: {
          id: freshComment!.id,
          content: freshComment!.content,
          author: {
            id: freshComment!.author.id,
            email: freshComment!.author.email,
            username: freshComment!.author.username,
            fullName: freshComment!.author.fullName,
            avatarUrl: freshComment!.author.avatarUrl,
          },
          attachments: (freshComment!.attachments || []).map((attachment) => ({
            id: attachment.id,
            fileName: attachment.fileName,
            fileUrl: this.getAttachmentDownloadUrl(projectId, taskId, attachment.id),
            mimeType: attachment.mimeType,
            sizeBytes: Number(attachment.sizeBytes || 0),
          })),
          createdAt: freshComment!.createdAt,
          updatedAt: freshComment!.updatedAt,
        },
      });
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }

      console.error('TASK_COMMENT_CREATE_ERROR:', error);
      throw AppErrors.task.commentCreationFailed();
    }
  }

  async getComments(projectId: string, taskId: string, currentUser: AuthenticatedUser) {
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
        attachments: true,
        reactions: {
          user: true,
        },
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
        attachments: (comment.attachments || []).map((attachment) => ({
          id: attachment.id,
          fileName: attachment.fileName,
          fileUrl: this.getAttachmentDownloadUrl(projectId, taskId, attachment.id),
          mimeType: attachment.mimeType,
          sizeBytes: Number(attachment.sizeBytes || 0),
        })),
        reactions: this.buildReactionSummary(comment.reactions || [], currentUser.id),
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
      })),
    });
  }

  private async findCommentOrThrow(projetcId: string, taskId: string, commentId: string) {
    const comment = await this.taskCommentRepository.findOne({
      where: {
        id: commentId,
        task: {
          id: taskId,
          project: { id: projetcId },
        },
      },
      relations: {
        author: true,
        task: {
          project: {
            owner: true,
          },
        },
        attachments: true,
        reactions: {
          user: true,
        },
      },
    });
    if (!comment) throw AppErrors.task.commentNotFound();

    return comment;
  }

  private ensureCanManageComment(comment: TaskComment, currentUser: AuthenticatedUser) {
    const isAuthor = comment.author.id === currentUser.id;
    const isProjectOwner = comment.task.project?.owner?.id === currentUser.id;

    if (!isAuthor && !isProjectOwner) {
      throw AppErrors.auth.forbidden();
    }
  }

  async updateComment(
    projectId: string,
    taskId: string,
    commentId: string,
    dto: UpdateTaskCommentDto,
    currentUser: AuthenticatedUser,
  ) {
    const comment = await this.findCommentOrThrow(projectId, taskId, commentId);
    this.ensureCanManageComment(comment, currentUser);

    try {
      comment.content = dto.content.trim();
      const saved = await this.taskCommentRepository.save(comment);

      return successResponse({
        message: 'Cap nhat comment thanh cong',
        data: {
          id: saved.id,
          content: saved.content,
          author: {
            id: saved.author.id,
            email: saved.author.email,
            username: saved.author.username,
            fullName: saved.author.fullName,
            avatarUrl: saved.author.avatarUrl,
          },
          attachments: (saved.attachments || []).map((attachment) => ({
            id: attachment.id,
            fileName: attachment.fileName,
            fileUrl: this.getAttachmentDownloadUrl(projectId, taskId, attachment.id),
            mimeType: attachment.mimeType,
            sizeBytes: Number(attachment.sizeBytes || 0),
          })),
          createdAt: saved.createdAt,
          updatedAt: saved.updatedAt,
        },
      });
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      console.error('TASK_COMMENT_UPDATE_ERROR:', error);
      throw AppErrors.task.commentUpdateFailed();
    }
  }

  private getAttachmentDownloadUrl(projectId: string, taskId: string, attachmentId: string) {
    return `/api/v1/projects/${projectId}/tasks/${taskId}/attachments/${attachmentId}/download`;
  }

  async deleteComment(
    projectId: string,
    taskId: string,
    commentId: string,
    currentUser: AuthenticatedUser,
  ) {
    const comment = await this.findCommentOrThrow(projectId, taskId, commentId);
    this.ensureCanManageComment(comment, currentUser);

    try {
      await this.taskCommentRepository.remove(comment);

      return successResponse({
        message: 'Xoa comment thanh cong',
        data: {
          id: commentId,
        },
      });
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }

      console.error('TASK_COMMENT_DELETE_ERROR:', error);
      throw AppErrors.task.commentDeletionFailed();
    }
  }

  private buildReactionSummary(reactions: TaskCommentReaction[] = [], currentUserId?: string) {
    const reactionMap = new Map<string, { emoji: string; count: number; reactedByMe: boolean }>();

    for (const reaction of reactions) {
      const existing = reactionMap.get(reaction.emoji);

      if (!existing) {
        reactionMap.set(reaction.emoji, {
          emoji: reaction.emoji,
          count: 1,
          reactedByMe: reaction.user?.id === currentUserId,
        });
        continue;
      }

      existing.count += 1;
      if (reaction.user?.id === currentUserId) {
        existing.reactedByMe = true;
      }
    }

    return Array.from(reactionMap.values());
  }

  async addReaction(
    projectId: string,
    taskId: string,
    commentId: string,
    dto: ToggleTaskCommentReactionDto,
    currentUser: AuthenticatedUser,
  ) {
    const comment = await this.findCommentOrThrow(projectId, taskId, commentId);

    const user = await this.userRepository.findOne({
      where: { id: currentUser.id },
    });

    if (!user) {
      throw AppErrors.auth.userNotFound();
    }

    try {
      const existing = await this.taskCommentReactionRepository.findOne({
        where: {
          comment: { id: comment.id },
          user: { id: user.id },
          emoji: dto.emoji,
        },
        relations: {
          user: true,
          comment: true,
        },
      });

      if (!existing) {
        const reaction = this.taskCommentReactionRepository.create({
          comment,
          user,
          emoji: dto.emoji,
        });

        await this.taskCommentReactionRepository.save(reaction);
      }

      const freshComment = await this.findCommentOrThrow(projectId, taskId, commentId);

      return successResponse({
        message: 'Them reaction thanh cong',
        data: {
          commentId: freshComment.id,
          reactions: this.buildReactionSummary(freshComment.reactions || [], currentUser.id),
        },
      });
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }

      console.error('TASK_COMMENT_ADD_REACTION_ERROR:', error);
      throw new InternalServerErrorException('Them reaction that bai');
    }
  }

  async removeReaction(
    projectId: string,
    taskId: string,
    commentId: string,
    emoji: string,
    currentUser: AuthenticatedUser,
  ) {
    const comment = await this.findCommentOrThrow(projectId, taskId, commentId);

    const user = await this.userRepository.findOne({
      where: { id: currentUser.id },
    });

    if (!user) {
      throw AppErrors.auth.userNotFound();
    }

    try {
      const existing = await this.taskCommentReactionRepository.findOne({
        where: {
          comment: { id: comment.id },
          user: { id: user.id },
          emoji,
        },
        relations: {
          user: true,
          comment: true,
        },
      });

      if (existing) {
        await this.taskCommentReactionRepository.remove(existing);
      }

      const freshComment = await this.findCommentOrThrow(projectId, taskId, commentId);

      return successResponse({
        message: 'Xoa reaction thanh cong',
        data: {
          commentId: freshComment.id,
          reactions: this.buildReactionSummary(freshComment.reactions || [], currentUser.id),
        },
      });
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }

      console.error('TASK_COMMENT_REMOVE_REACTION_ERROR:', error);
      throw new InternalServerErrorException('Xoa reaction that bai');
    }
  }
}
