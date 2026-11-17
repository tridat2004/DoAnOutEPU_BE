import { SetMetadata } from '@nestjs/common';
import { SYSTEM_ROLES_KEY } from '../constants/auth.constants';
import { SystemRole } from '../constants/system-role.constant';

export const SystemRoles = (...roles: SystemRole[]) => SetMetadata(SYSTEM_ROLES_KEY, roles);
