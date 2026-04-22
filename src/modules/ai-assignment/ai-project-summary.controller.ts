import { Controller, Get, Param } from "@nestjs/common";
import { AiAssignmentService } from "./ai-assignment.service";
import { RequireProjectPermissions } from "../auth/decorators/project-permissions.decorator";

@Controller('project/:projectId/ai')
export class AiProjectSummaryController{
    constructor(
        private readonly aiAssignmentService: AiAssignmentService,
    ){}

    @RequireProjectPermissions('project.view')
    @Get('summary')
    getProjectSummary(
        @Param('projectId') projectId: string,

    ){
        return this.aiAssignmentService.getProjectSummary(projectId);
    }
}