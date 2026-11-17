import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { RequireProjectPermissions } from '../auth/decorators/project-permissions.decorator';
import { SystemRoles } from '../auth/decorators/system-roles.decorator';
import { SystemRole } from '../auth/constants/system-role.constant';
import { ListProjectsDto } from './dto/list-projects.dto';

@Controller('projects')
export class ProjectController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  createProject(@Body() body: CreateProjectDto, @CurrentUser() currentUser: AuthenticatedUser) {
    return this.projectsService.createProject(body, currentUser);
  }

  @Get()
  getMyProject(@Query() query: ListProjectsDto, @CurrentUser() currentUser: AuthenticatedUser) {
    return this.projectsService.getMyProject(query, currentUser);
  }

  @RequireProjectPermissions('project.view')
  @Get(':projectId')
  getProjectDetail(@Param('projectId') projectId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.projectsService.getProjectDetail(projectId, user);
  }

  @RequireProjectPermissions('project.update')
  @Patch(':projectId')
  updateProject(
    @Param('projectId') projectId: string,
    @Body() body: UpdateProjectDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectsService.updateProject(projectId, body, user);
  }

  @RequireProjectPermissions('project.update')
  @Patch(':projectId/archive')
  archiveProject(
    @Param('projectId') projectId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.projectsService.setProjectArchived(projectId, true, currentUser);
  }

  @RequireProjectPermissions('project.update')
  @Patch(':projectId/unarchive')
  unarchiveProject(
    @Param('projectId') projectId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.projectsService.setProjectArchived(projectId, false, currentUser);
  }

  @RequireProjectPermissions('project.view')
  @Post(':projectId/leave')
  leaveProject(
    @Param('projectId') projectId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.projectsService.leaveProject(projectId, currentUser);
  }

  @RequireProjectPermissions('project.delete')
  @Delete(':projectId')
  deleteProject(
    @Param('projectId') projectId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.projectsService.deleteProject(projectId, currentUser);
  }

  @SystemRoles(SystemRole.ADMIN)
  @Post(':projectId/restore')
  restoreProject(
    @Param('projectId') projectId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.projectsService.restoreProject(projectId, currentUser);
  }
}
