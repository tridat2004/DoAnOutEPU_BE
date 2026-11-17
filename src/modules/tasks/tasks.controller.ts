import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';

import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';
import { MoveTaskDto } from './dto/move-task.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { RequireProjectPermissions } from '../auth/decorators/project-permissions.decorator';
import { Query } from '@nestjs/common';
import { ListProjectTasksDto } from './dto/list-project-tasks.dto';
import { ListDeletedTasksDto } from './dto/list-deleted-tasks.dto';
@Controller('projects/:projectId/tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @RequireProjectPermissions('task.create')
  @Post()
  createTask(
    @Param('projectId') projectId: string,
    @Body() dto: CreateTaskDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.tasksService.createTask(projectId, dto, currentUser);
  }

  @RequireProjectPermissions('task.view')
  @Get()
  getTasks(
    @Param('projectId') projectId: string,
    @Query() query: ListProjectTasksDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.tasksService.getTasks(projectId, query, currentUser);
  }

  @RequireProjectPermissions('task.delete')
  @Get('trash')
  getDeletedTasks(
    @Param('projectId') projectId: string,
    @Query() query: ListDeletedTasksDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.tasksService.getDeletedTasks(projectId, query, currentUser);
  }

  @RequireProjectPermissions('task.view')
  @Get(':taskId')
  getTaskDetail(@Param('projectId') projectId: string, @Param('taskId') taskId: string) {
    return this.tasksService.getTaskDetails(projectId, taskId);
  }

  @RequireProjectPermissions('task.update')
  @Patch(':taskId')
  updateTask(
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Body() dto: UpdateTaskDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.tasksService.updateTask(projectId, taskId, dto, currentUser);
  }

  @RequireProjectPermissions('task.delete')
  @Delete(':taskId')
  deleteTask(
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.tasksService.deleteTask(projectId, taskId, currentUser);
  }

  @RequireProjectPermissions('task.delete')
  @Post(':taskId/restore')
  restoreTask(
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.tasksService.restoreTask(projectId, taskId, currentUser);
  }

  @RequireProjectPermissions('task.update')
  @Patch(':taskId/status')
  updateTaskStatus(
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Body() dto: UpdateTaskStatusDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.tasksService.updateTaskStatus(projectId, taskId, dto, currentUser);
  }

  @RequireProjectPermissions('task.update')
  @Patch(':taskId/move')
  moveTask(
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Body() dto: MoveTaskDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.tasksService.moveTask(projectId, taskId, dto, currentUser);
  }
}
