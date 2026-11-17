import { IsEnum, IsOptional } from 'class-validator';
import { RegisterDto } from './register.dto';
import { SystemRole } from '../constants/system-role.constant';

export class CreateManagedUserDto extends RegisterDto {
  @IsOptional()
  @IsEnum(SystemRole, { message: 'systemRole khong hop le' })
  systemRole?: SystemRole;
}
