import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Task } from './entities/task.entity';
import { TaskType } from './entities/task-type.entity';
import { TaskStatus } from './entities/task-status.entity';
import { Priority } from './entities/priority.entity';
import { TaskComment } from './entities/task-comment.entity';
import { TaskHistory } from './entities/task-history.entity';

import { Project } from '../projects/entities/project.entity';
import { ProjectMember } from '../projects/entities/project-member.entity';
import { User } from '../users/entities/user.entity';

import { TasksService } from './tasks.service';
import { TaskCommentsService } from './task-comments.service';
import { TaskHistoriesService } from './task-histories.service';

import { TasksController } from './tasks.controller';
import { TaskMetaController } from './task-meta.controller';
import { TaskCommentsController } from './task-comments.controller';
import { TaskHistoriesController } from './task-histories.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { ActivityModule } from '../activity/activity.module';
import { TaskCommentAttachment } from './entities/task-comment-attachment.entity';
import { TaskCommentReaction } from './entities/task-comment-reaction.entity';
import { TaskAttachmentsController } from './task-attachments.controller';
import { TaskAttachmentsService } from './task-attachments.service';
import { BoardColumn } from '../board/entities/board-column.entity';

@Module({
  imports: [
    NotificationsModule,
    ActivityModule,
    TypeOrmModule.forFeature([
      Task,
      TaskType,
      TaskStatus,
      Priority,
      TaskComment,
      TaskHistory,
      Project,
      ProjectMember,
      User,
      TaskCommentAttachment,
      TaskCommentReaction,
      BoardColumn,
    ]),
  ],
  controllers: [
    TasksController,
    TaskMetaController,
    TaskCommentsController,
    TaskHistoriesController,
    TaskAttachmentsController
  ],
  providers: [
    TasksService,
    TaskCommentsService,
    TaskHistoriesService,
    TaskAttachmentsService
  ],
  exports: [
    TasksService,
    TaskCommentsService,
    TaskHistoriesService,
    TypeOrmModule,
    TaskAttachmentsService,
  ],
})
export class TasksModule {}
