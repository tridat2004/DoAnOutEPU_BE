import { IsOptional, IsString, MaxLength, ValidateIf, IsDateString, IsEnum } from 'class-validator';
import { ProjectStatus } from '../constants/project-status.constant';

export class UpdateProjectDto {
  @IsOptional()
  @IsString({ message: 'Name must be a string' })
  @ValidateIf((_, value) => value !== undefined)
  @MaxLength(150, { message: 'Name must not exceed 150 characters' })
  name?: string;

  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  description?: string;

  @IsOptional()
  @IsDateString({}, { message: 'startDate khong hop le' })
  startDate?: string | null;

  @IsOptional()
  @IsDateString({}, { message: 'endDate khong hop le' })
  endDate?: string | null;

  @IsOptional()
  @IsEnum(ProjectStatus, { message: 'status khong hop le' })
  status?: ProjectStatus;
}
