import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

import { Project } from '../projects/entities/project.entity';
import { Task } from '../tasks/entities/task.entity';
import { TaskStatus } from '../tasks/entities/task-status.entity';
import { Priority } from '../tasks/entities/priority.entity';
import { ProjectMember } from '../projects/entities/project-member.entity';
import { TaskHistory } from '../tasks/entities/task-history.entity';
import { AiAssignmentLog } from '../ai-assignment/entities/ai-assignment-log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Project,
      Task,
      TaskStatus,
      Priority,
      ProjectMember,
      TaskHistory,
      AiAssignmentLog,
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}