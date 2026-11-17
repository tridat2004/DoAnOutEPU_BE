import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { TimelineController } from './timeline.controller';
import { TimelineService } from './timeline.service';

import { Task } from '../tasks/entities/task.entity';
import { Project } from '../projects/entities/project.entity';
import { TaskStatus } from '../tasks/entities/task-status.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Task, Project, TaskStatus])],
  controllers: [TimelineController],
  providers: [TimelineService],
  exports: [TimelineService],
})
export class TimelineModule {}
