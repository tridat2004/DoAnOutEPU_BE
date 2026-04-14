import { IsNotEmpty, IsUUID } from 'class-validator';

export class UpdateProjectMemberRoleDto {
  @IsUUID('4', { message: 'roleId khong hop le' })
  @IsNotEmpty({ message: 'roleId khong duoc de trong' })
  roleId: string;
}