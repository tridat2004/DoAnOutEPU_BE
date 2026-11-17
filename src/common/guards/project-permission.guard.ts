import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { validate as validateUUID } from 'uuid';
import { AppErrors } from '../exceptions/exception';
import { PROJECT_PERMISSIONS_KEY } from '../../modules/auth/constants/auth.constants';
import { ProjectMembersService } from '../../modules/projects/project-members.service';
import { SystemRole } from '../../modules/auth/constants/system-role.constant';

@Injectable()
export class ProjectPermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly projectMembersService: ProjectMembersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions =
      this.reflector.getAllAndOverride<string[]>(PROJECT_PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) || [];

    if (requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user;

    if (!user) {
      throw AppErrors.project.authRequired();
    }

    if (user.systemRole === SystemRole.ADMIN) {
      return true;
    }

    const projectId = this.extractProjectId(request);

    if (!projectId) {
      throw AppErrors.project.projectIdMissing();
    }

    const projectMember = await this.projectMembersService.findByProjectAndUser(projectId, user.id);

    if (!projectMember) {
      throw AppErrors.project.membershipRequired();
    }

    const grantedPermissions =
      projectMember.role?.rolePermissions?.map((rp) => rp.permission.code) || [];

    const hasAllPermissions = requiredPermissions.every((permission) =>
      grantedPermissions.includes(permission),
    );

    if (!hasAllPermissions) {
      throw AppErrors.project.permissionDenied();
    }

    return true;
  }

  private extractProjectId(request: Request): string | undefined {
    const params = request.params as Record<string, string | undefined>;
    const body = request.body as Record<string, unknown> | undefined;
    const query = request.query as Record<string, string | undefined>;

    const projectId =
      params?.projectId ||
      params?.id ||
      (typeof body?.projectId === 'string' ? body.projectId : undefined) ||
      query?.projectId;

    // Validate that projectId is a valid UUID
    if (projectId && !validateUUID(projectId)) {
      return undefined;
    }

    return projectId;
  }
}
