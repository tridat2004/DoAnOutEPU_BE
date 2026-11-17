import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Project } from './entities/project.entity';
import { ProjectMember } from './entities/project-member.entity';
import { Role } from '../auth/entities/role.entity';
import { User } from '../users/entities/user.entity';

import { ProjectController } from './projects.controller';
import { ProjectMembersController } from './project-members.controller';
import { ProjectsService } from './projects.service';
import { ProjectMembersService } from './project-members.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { ActivityModule } from '../activity/activity.module';
import { AdminProjectsController } from './admin-projects.controller';
import { Permission } from '../auth/entities/permission.entity';
import { Board } from '../board/entities/board.entity';
import { BoardColumn } from '../board/entities/board-column.entity';
import { TaskStatus } from '../tasks/entities/task-status.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Project,
      ProjectMember,
      Role,
      User,
      Permission,
      Board,
      BoardColumn,
      TaskStatus,
    ]),
    NotificationsModule,
    ActivityModule,
  ],
  controllers: [ProjectController, ProjectMembersController, AdminProjectsController],
  providers: [ProjectsService, ProjectMembersService],
  exports: [ProjectsService, ProjectMembersService, TypeOrmModule],
})
export class ProjectsModule {}
