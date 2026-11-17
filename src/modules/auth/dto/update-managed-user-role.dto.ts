import { IsEnum } from 'class-validator';
import { SystemRole } from '../constants/system-role.constant';

export class UpdateManagedUserRoleDto {
  @IsEnum(SystemRole, { message: 'systemRole khong hop le' })
  systemRole: SystemRole;
}
