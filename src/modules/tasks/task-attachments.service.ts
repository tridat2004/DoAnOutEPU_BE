import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { unlink } from 'fs/promises';
import { access } from 'fs/promises';
import { join, resolve, sep } from 'path';

import { Task } from './entities/task.entity';
import { User } from '../users/entities/user.entity';
import { TaskCommentAttachment } from './entities/task-comment-attachment.entity';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { AppErrors, AppException } from '../../common/exceptions/exception';
import { successResponse } from '../../common/response';
import { normalizeUploadedFileName } from '../../common/utils/file-name.util';

type UploadedTaskAttachmentFile = {
  originalname: string;
  filename: string;
  mimetype: string;
  size: number;
};

@Injectable()
export class TaskAttachmentsService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(TaskCommentAttachment)
    private readonly taskCommentAttachmentRepository: Repository<TaskCommentAttachment>,
  ) {}

  async createTaskAttachments(
    projectId: string,
    taskId: string,
    currentUser: AuthenticatedUser,
    files: UploadedTaskAttachmentFile[] = [],
  ) {
    if (!files.length) {
      throw new BadRequestException('Vui lòng chọn ít nhất 1 tệp đính kèm');
    }

    const task = await this.taskRepository.findOne({
      where: {
        id: taskId,
        project: { id: projectId },
      },
      relations: {
        project: true,
      },
    });

    if (!task) {
      throw AppErrors.task.taskNotFound();
    }

    const user = await this.userRepository.findOne({
      where: { id: currentUser.id },
    });

    if (!user) {
      throw AppErrors.auth.userNotFound();
    }

    if (!user.isActive) {
      throw AppErrors.auth.accountDisabled();
    }

    try {
      const attachments = files.map((file) =>
        this.taskCommentAttachmentRepository.create({
          task,
          comment: null,
          uploadedBy: user,
          fileName: normalizeUploadedFileName(file.originalname),
          fileUrl: `/uploads/task-attachments/${file.filename}`,
          mimeType: file.mimetype,
          sizeBytes: file.size,
        }),
      );

      const savedAttachments = await this.taskCommentAttachmentRepository.save(attachments);

      return successResponse({
        message: 'Them tep dinh kem task thanh cong',
        data: savedAttachments.map((attachment) =>
          this.toAttachmentResponse(attachment, projectId, taskId),
        ),
      });
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }

      console.error('TASK_ATTACHMENT_CREATE_ERROR:', error);
      throw AppErrors.common.internalServerError('Them tep dinh kem task that bai');
    }
  }

  async getTaskAttachments(projectId: string, taskId: string) {
    const task = await this.taskRepository.findOne({
      where: {
        id: taskId,
        project: { id: projectId },
      },
    });

    if (!task) {
      throw AppErrors.task.taskNotFound();
    }

    const attachments = await this.taskCommentAttachmentRepository.find({
      where: {
        task: { id: taskId },
        comment: IsNull(),
      },
      relations: {
        uploadedBy: true,
      },
      order: {
        createdAt: 'DESC',
      },
    });

    return successResponse({
      message: 'Lay danh sach tep dinh kem task thanh cong',
      data: attachments.map((attachment) =>
        this.toAttachmentResponse(attachment, projectId, taskId),
      ),
    });
  }

  async deleteTaskAttachment(projectId: string, taskId: string, attachmentId: string) {
    const attachment = await this.taskCommentAttachmentRepository.findOne({
      where: {
        id: attachmentId,
        task: {
          id: taskId,
          project: { id: projectId },
        },
        comment: IsNull(),
      },
      relations: {
        task: {
          project: true,
        },
      },
    });

    if (!attachment) {
      throw AppErrors.common.notFound('Khong tim thay tep dinh kem');
    }

    try {
      await this.taskCommentAttachmentRepository.remove(attachment);
      await this.safeDeletePhysicalFile(attachment.fileUrl);

      return successResponse({
        message: 'Xoa tep dinh kem task thanh cong',
        data: {
          id: attachmentId,
        },
      });
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }

      console.error('TASK_ATTACHMENT_DELETE_ERROR:', error);
      throw AppErrors.common.internalServerError('Xoa tep dinh kem task that bai');
    }
  }

  async getAttachmentFile(projectId: string, taskId: string, attachmentId: string) {
    const attachment = await this.taskCommentAttachmentRepository.findOne({
      where: {
        id: attachmentId,
        task: {
          id: taskId,
          project: { id: projectId },
        },
      },
    });

    if (!attachment) {
      throw AppErrors.common.notFound('Khong tim thay tep dinh kem');
    }

    const uploadsRoot = resolve(process.cwd(), 'uploads');
    const physicalPath = resolve(process.cwd(), attachment.fileUrl.replace(/^\//, ''));
    if (!physicalPath.startsWith(`${uploadsRoot}${sep}`)) {
      throw AppErrors.common.notFound('Duong dan tep dinh kem khong hop le');
    }

    try {
      await access(physicalPath);
    } catch {
      throw AppErrors.common.notFound('Tep dinh kem khong ton tai');
    }

    return {
      physicalPath,
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
      sizeBytes: Number(attachment.sizeBytes || 0),
    };
  }

  private toAttachmentResponse(
    attachment: TaskCommentAttachment,
    projectId: string,
    taskId: string,
  ) {
    return {
      id: attachment.id,
      fileName: attachment.fileName,
      fileUrl: this.getDownloadUrl(projectId, taskId, attachment.id),
      mimeType: attachment.mimeType,
      sizeBytes: Number(attachment.sizeBytes || 0),
      createdAt: attachment.createdAt,
      uploadedBy: attachment.uploadedBy
        ? {
            id: attachment.uploadedBy.id,
            email: attachment.uploadedBy.email,
            username: attachment.uploadedBy.username,
            fullName: attachment.uploadedBy.fullName,
            avatarUrl: attachment.uploadedBy.avatarUrl,
          }
        : null,
    };
  }

  private getDownloadUrl(projectId: string, taskId: string, attachmentId: string) {
    return `/api/v1/projects/${projectId}/tasks/${taskId}/attachments/${attachmentId}/download`;
  }

  private async safeDeletePhysicalFile(fileUrl: string) {
    if (!fileUrl.startsWith('/uploads/')) return;

    const relativePath = fileUrl.replace(/^\//, '');
    const physicalPath = join(process.cwd(), relativePath);

    try {
      await unlink(physicalPath);
    } catch {
      // Không throw vì DB đã xóa rồi.
      // File vật lý không tồn tại thì bỏ qua.
    }
  }
}
