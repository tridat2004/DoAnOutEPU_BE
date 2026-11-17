import { Controller, Get, Query } from '@nestjs/common';
import { SystemRoles } from '../auth/decorators/system-roles.decorator';
import { SystemRole } from '../auth/constants/system-role.constant';
import { ProjectsService } from './projects.service';
import { ListDeletedProjectsDto } from './dto/list-deleted-projects.dto';

@Controller('admin/projects')
@SystemRoles(SystemRole.ADMIN)
export class AdminProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get('trash')
  getDeletedProjects(@Query() query: ListDeletedProjectsDto) {
    return this.projectsService.getDeletedProjects(query);
  }
}
