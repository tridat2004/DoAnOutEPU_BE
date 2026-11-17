import { IsInt, IsDateString, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

export class UpdateTaskDto {
  @IsOptional()
  @IsString({ message: 'Tieu de task phai la chuoi' })
  @MaxLength(255, { message: 'Tieu de task toi da 255 ky tu' })
  title?: string;

  @IsOptional()
  @IsString({ message: 'Mo ta phai la chuoi' })
  description?: string;

  @IsOptional()
  @IsUUID('4', { message: 'taskTypeId khong hop le' })
  taskTypeId?: string;

  @IsOptional()
  @IsUUID('4', { message: 'priorityId khong hop le' })
  priorityId?: string;

  @IsOptional()
  @IsUUID('4', { message: 'assigneeUserId khong hop le' })
  assigneeUserId?: string | null;

  @IsOptional()
  @IsUUID('4', { message: 'parentTaskId khong hop le' })
  parentTaskId?: string | null;

  @IsOptional()
  @IsDateString({}, { message: 'dueDate khong hop le' })
  dueDate?: string | null;

  @IsOptional()
  @IsInt({ message: 'estimatedHours phai la so nguyen' })
  @Min(0, { message: 'estimatedHours phai lon hon hoac bang 0' })
  estimatedHours?: number | null;
}
