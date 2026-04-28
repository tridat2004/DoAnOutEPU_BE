import { Controller, Get, Param, Query } from '@nestjs/common';
import { ActivityService } from './activity.service';
import { GetActivityDto } from './dto/get-activity.dto';
import { RequireProjectPermissions } from '../auth/decorators/project-permissions.decorator';

@Controller()
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get('activity')
  getAllActivities(@Query() query: GetActivityDto) {
    return this.activityService.getAllActivities(query);
  }

  @RequireProjectPermissions('project.view')
  @Get('projects/:projectId/activity')
  getProjectActivities(
    @Param('projectId') projectId: string,
    @Query() query: GetActivityDto,
  ) {
    return this.activityService.getProjectActivities(projectId, query);
  }
}