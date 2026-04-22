import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';

import { AiAssignmentService } from './ai-assignment.service';
import { AiAssignmentController } from './ai-assignment.controller';
import { AiRecommendationController } from './ai-recommendation.controller';

import { UserSkill } from './entities/user-skill.entity';
import { AiAssignmentLog } from './entities/ai-assignment-log.entity';
import { User } from '../users/entities/user.entity';
import { Task } from '../tasks/entities/task.entity';
import { Project } from '../projects/entities/project.entity';
import { ProjectMember } from '../projects/entities/project-member.entity';
import { TasksModule } from '../tasks/tasks.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AiProjectSummaryController } from './ai-project-summary.controller';
import { TaskType } from '../tasks/entities/task-type.entity';
import { Priority } from '../tasks/entities/priority.entity';
import { TaskStatus } from '../tasks/entities/task-status.entity';
import { DashboardModule } from '../dashboard/dashboard.module';

@Module({
  imports: [
    HttpModule,
    TasksModule,
    NotificationsModule,
    DashboardModule,
    TypeOrmModule.forFeature([
      UserSkill,
      AiAssignmentLog,
      User,
      Task,
      Project,
      ProjectMember,
      TaskType,
      Priority,
      TaskStatus,
    ]),
  ],
  controllers: [AiAssignmentController, AiRecommendationController, AiProjectSummaryController],
  providers: [AiAssignmentService],
  exports: [AiAssignmentService, TypeOrmModule],
})
export class AiAssignmentModule {}
