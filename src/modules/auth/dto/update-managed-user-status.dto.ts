import { IsBoolean } from 'class-validator';

export class UpdateManagedUserStatusDto {
  @IsBoolean({ message: 'isActive phai la boolean' })
  isActive: boolean;
}
