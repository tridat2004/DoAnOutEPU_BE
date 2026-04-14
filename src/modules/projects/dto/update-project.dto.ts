import {
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class UpdateProjectDto {
  @IsOptional()
  @IsString({ message: 'Tên project phải là chuỗi' })
  @ValidateIf((_, value) => value !== undefined)
  @MaxLength(150, { message: 'Tên project tối đa 150 ký tự' })
  name?: string;

  @IsOptional()
  @IsString({ message: 'Mô tả phải là chuỗi' })
  description?: string;
}