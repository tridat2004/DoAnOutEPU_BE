import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BoardController } from './board.controller';
import { BoardService } from './board.service';

import { Task } from '../tasks/entities/task.entity';
import { TaskStatus } from '../tasks/entities/task-status.entity';
import { Project } from '../projects/entities/project.entity';
import { Board } from './entities/board.entity';
import { BoardColumn } from './entities/board-column.entity';
import { User } from '../users/entities/user.entity';
import { ActivityModule } from '../activity/activity.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Task, TaskStatus, Project, Board, BoardColumn, User]),
    ActivityModule,
  ],
  controllers: [BoardController],
  providers: [BoardService],
  exports: [BoardService],
})
export class BoardModule {}
