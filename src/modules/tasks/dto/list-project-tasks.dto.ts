import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class ListProjectTasksDto {
  @IsOptional()
  @IsUUID('4', { message: 'statusId khong hop le' })
  statusId?: string;

  @IsOptional()
  @IsUUID('4', { message: 'priorityId khong hop le' })
  priorityId?: string;

  @IsOptional()
  @IsUUID('4', { message: 'assigneeUserId khong hop le' })
  assigneeUserId?: string;

  @IsOptional()
  @IsString({ message: 'keyword phai la chuoi' })
  @MaxLength(255, { message: 'keyword toi da 255 ky tu' })
  keyword?: string;

  @IsOptional()
  @IsDateString({}, { message: 'dueFrom khong hop le' })
  dueFrom?: string;

  @IsOptional()
  @IsDateString({}, { message: 'dueTo khong hop le' })
  dueTo?: string;

  @IsOptional()
  @IsIn(['mine', 'due_soon', 'overdue'], { message: 'quickFilter khong hop le' })
  quickFilter?: 'mine' | 'due_soon' | 'overdue';

  @IsOptional()
  @Transform(({ value }) => Number(value ?? 1))
  @IsInt({ message: 'page phai la so nguyen' })
  @Min(1, { message: 'page phai lon hon hoac bang 1' })
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => Number(value ?? 10))
  @IsInt({ message: 'limit phai la so nguyen' })
  @Min(1, { message: 'limit phai lon hon hoac bang 1' })
  @Max(100, { message: 'limit toi da 100' })
  limit?: number = 10;
}
