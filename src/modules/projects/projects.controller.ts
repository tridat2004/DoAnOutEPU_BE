import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { RequireProjectPermissions } from '../auth/decorators/project-permissions.decorator';

@Controller('projects')
export class ProjectController {
  constructor(private readonly projectsService: ProjectsService){}

  @Post()
  createProject(
    @Body() body : CreateProjectDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ){
    return this.projectsService.createProject(body, currentUser);
  }

  @Get()
  getMyProject(
    @CurrentUser() currentUser : AuthenticatedUser,
  ){
    return this.projectsService.getMyProject(currentUser);
  }

  @RequireProjectPermissions('project.view')
  @Get(':projectId')
  getProjectDetail(
    @Param('projectId') projectId: string,
    @CurrentUser() user : AuthenticatedUser,
  ){
    return this.projectsService.getProjectDetail(projectId, user);
  }

  @RequireProjectPermissions('project.update')
  @Patch(':projectId')
  updateProject(
    @Param('projectId') projectId: string,
    @Body() body : UpdateProjectDto,
    @CurrentUser() user : AuthenticatedUser,
  ){
    return this.projectsService.updateProject(projectId, body, user);
  }
  
  @RequireProjectPermissions('project.delete')
  @Delete(':projectId')
  deleteProject(
    @Param('projectId') projectId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.projectsService.deleteProject(projectId, currentUser);
  }
}