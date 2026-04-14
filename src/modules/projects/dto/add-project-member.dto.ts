import { IsNotEmpty, IsUUID } from 'class-validator';

export class AddProjectMemberDto {
  @IsUUID('4', { message: 'userId khong hop le' })
  @IsNotEmpty({ message: 'userId khong duoc de trong' })
  userId: string;

  @IsUUID('4', { message: 'roleId khong hop le' })
  @IsNotEmpty({ message: 'roleId khong duoc de trong' })
  roleId: string;
}