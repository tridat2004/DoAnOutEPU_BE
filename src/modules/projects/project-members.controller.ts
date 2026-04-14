import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequireProjectPermissions } from '../auth/decorators/project-permissions.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

import { ProjectMembersService } from './project-members.service';
import { AddProjectMemberDto } from './dto/add-project-member.dto';
import { UpdateProjectMemberRoleDto } from './dto/update-project-member-role.dto';

@Controller('projects/:projectId/members')
export class ProjectMembersController {
  constructor(
    private readonly projectMembersService: ProjectMembersService,
  ) {}

  @RequireProjectPermissions('project.view')
  @Get()
  getMembers(@Param('projectId') projectId: string) {
    return this.projectMembersService.getMember(projectId);
  }

  @RequireProjectPermissions('project.manage_members')
  @Post()
  addMember(
    @Param('projectId') projectId: string,
    @Body() dto: AddProjectMemberDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.projectMembersService.addMember(projectId, dto, currentUser);
  }

  @RequireProjectPermissions('project.manage_members')
  @Patch(':memberId/role')
  updateMemberRole(
    @Param('projectId') projectId: string,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateProjectMemberRoleDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.projectMembersService.updateMemberRole(
      projectId,
      memberId,
      dto,
      currentUser,
    );
  }

  @RequireProjectPermissions('project.manage_members')
  @Delete(':memberId')
  removeMember(
    @Param('projectId') projectId: string,
    @Param('memberId') memberId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.projectMembersService.removeMember(
      projectId,
      memberId,
      currentUser,
    );
  }
}