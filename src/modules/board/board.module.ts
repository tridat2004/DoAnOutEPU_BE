import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BoardController } from './board.controller';
import { BoardService } from './board.service';

import { Task } from '../tasks/entities/task.entity';
import { TaskStatus } from '../tasks/entities/task-status.entity';
import { Project } from '../projects/entities/project.entity';
import { User } from '../users/entities/user.entity';
import { TasksModule } from '../tasks/tasks.module';
import { ActivityModule } from '../activity/activity.module';

@Module({
  imports: [
    TasksModule,
    TypeOrmModule.forFeature([Task, TaskStatus, Project, User]),
    ActivityModule,
  ],
  controllers: [BoardController],
  providers: [BoardService],
  exports: [BoardService],
})
export class BoardModule {}