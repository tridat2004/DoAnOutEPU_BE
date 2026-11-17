import { Body, Controller, Get, Post } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskTypeDto } from './dto/create-task-type.dto';
import { CreateTaskStatusDto } from './dto/create-task-status.dto';
import { CreatePriorityDto } from './dto/create-priority.dto';
import { SystemRoles } from '../auth/decorators/system-roles.decorator';
import { SystemRole } from '../auth/constants/system-role.constant';

@Controller('task-meta')
export class TaskMetaController {
  constructor(private readonly tasksService: TasksService) {}

  @SystemRoles(SystemRole.ADMIN)
  @Post('types')
  createTaskType(@Body() dto: CreateTaskTypeDto) {
    return this.tasksService.createTaskType(dto);
  }

  @Get('types')
  getTaskTypes() {
    return this.tasksService.getTaskTypes();
  }

  @SystemRoles(SystemRole.ADMIN)
  @Post('statuses')
  createTaskStatus(@Body() dto: CreateTaskStatusDto) {
    return this.tasksService.createTaskStatus(dto);
  }

  @Get('statuses')
  getTaskStatuses() {
    return this.tasksService.getTaskStatuses();
  }

  @SystemRoles(SystemRole.ADMIN)
  @Post('priorities')
  createPriority(@Body() dto: CreatePriorityDto) {
    return this.tasksService.createPriority(dto);
  }

  @Get('priorities')
  getPriorities() {
    return this.tasksService.getPriorites();
  }
}
