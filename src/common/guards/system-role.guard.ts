import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SYSTEM_ROLES_KEY } from '../../modules/auth/constants/auth.constants';
import { SystemRole } from '../../modules/auth/constants/system-role.constant';
import { AppErrors } from '../exceptions/exception';
import { Request } from 'express';

@Injectable()
export class SystemRoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles =
      this.reflector.getAllAndOverride<SystemRole[]>(SYSTEM_ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) || [];

    if (requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user;

    if (!user || !requiredRoles.includes(user.systemRole)) {
      throw AppErrors.auth.forbidden();
    }

    return true;
  }
}
