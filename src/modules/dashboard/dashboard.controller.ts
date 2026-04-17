import { Controller, Get, Param } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { RequireProjectPermissions } from '../auth/decorators/project-permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

@Controller('projects/:projectId/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @RequireProjectPermissions('project.view')
  @Get()
  getProjectDashboard(
    @Param('projectId') projectId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.dashboardService.getProjectDashboard(projectId, currentUser);
  }
}