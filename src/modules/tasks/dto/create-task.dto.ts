import {
  IsInt,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateTaskDto {
  @IsString({ message: 'Tieu de task phai la chuoi' })
  @IsNotEmpty({ message: 'Tieu de task khong duoc de trong' })
  @MaxLength(255, { message: 'Tieu de task toi da 255 ky tu' })
  title: string;

  @IsOptional()
  @IsString({ message: 'Mo ta phai la chuoi' })
  description?: string;

  @IsOptional()
  @IsUUID('4', { message: 'taskTypeId khong hop le' })
  taskTypeId?: string;

  @IsUUID('4', { message: 'statusId khong hop le' })
  @IsNotEmpty({ message: 'statusId khong duoc de trong' })
  statusId: string;

  @IsOptional()
  @IsUUID('4', { message: 'priorityId khong hop le' })
  priorityId?: string;

  @IsOptional()
  @IsUUID('4', { message: 'assigneeUserId khong hop le' })
  assigneeUserId?: string;

  @IsOptional()
  @IsUUID('4', { message: 'parentTaskId khong hop le' })
  parentTaskId?: string;

  @IsOptional()
  @IsDateString({}, { message: 'dueDate khong hop le' })
  dueDate?: string;

  @IsOptional()
  @IsInt({ message: 'estimatedHours phai la so nguyen' })
  @Min(0, { message: 'estimatedHours phai lon hon hoac bang 0' })
  estimatedHours?: number;
}
