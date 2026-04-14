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

@Module({
  imports: [TypeOrmModule.forFeature([Project, ProjectMember, Role, User])],
  controllers: [ProjectController, ProjectMembersController],
  providers: [ProjectsService, ProjectMembersService],
  exports: [ProjectsService, ProjectMembersService, TypeOrmModule],
})
export class ProjectsModule {}