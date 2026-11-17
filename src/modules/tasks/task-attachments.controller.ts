import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  StreamableFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { existsSync, mkdirSync } from 'fs';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { createReadStream } from 'fs';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { TaskAttachmentsService } from './task-attachments.service';
import { RequireProjectPermissions } from '../auth/decorators/project-permissions.decorator';

const TASK_ATTACHMENT_UPLOAD_DIR = join(process.cwd(), 'uploads', 'task-attachments');

function ensureUploadDir() {
  if (!existsSync(TASK_ATTACHMENT_UPLOAD_DIR)) {
    mkdirSync(TASK_ATTACHMENT_UPLOAD_DIR, { recursive: true });
  }
}

@Controller('projects/:projectId/tasks/:taskId/attachments')
export class TaskAttachmentsController {
  constructor(private readonly taskAttachmentsService: TaskAttachmentsService) {}

  @RequireProjectPermissions('task.update')
  @Post()
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          ensureUploadDir();
          cb(null, TASK_ATTACHMENT_UPLOAD_DIR);
        },
        filename: (_req, file, cb) => {
          const ext = extname(file.originalname);
          cb(null, `${randomUUID()}${ext}`);
        },
      }),
      limits: {
        fileSize: 20 * 1024 * 1024,
      },
    }),
  )
  async createTaskAttachments(
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.taskAttachmentsService.createTaskAttachments(projectId, taskId, currentUser, files);
  }

  @RequireProjectPermissions('task.view')
  @Get()
  async getTaskAttachments(@Param('projectId') projectId: string, @Param('taskId') taskId: string) {
    return this.taskAttachmentsService.getTaskAttachments(projectId, taskId);
  }

  @RequireProjectPermissions('task.view')
  @Get(':attachmentId/download')
  async downloadTaskAttachment(
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Param('attachmentId') attachmentId: string,
  ) {
    const file = await this.taskAttachmentsService.getAttachmentFile(
      projectId,
      taskId,
      attachmentId,
    );

    return new StreamableFile(createReadStream(file.physicalPath), {
      type: file.mimeType ?? 'application/octet-stream',
      length: file.sizeBytes,
      disposition: `attachment; filename*=UTF-8''${encodeURIComponent(file.fileName)}`,
    });
  }

  @RequireProjectPermissions('task.update')
  @Delete(':attachmentId')
  async deleteTaskAttachment(
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Param('attachmentId') attachmentId: string,
  ) {
    return this.taskAttachmentsService.deleteTaskAttachment(projectId, taskId, attachmentId);
  }
}
