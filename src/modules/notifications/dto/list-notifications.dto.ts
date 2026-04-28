import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListNotificationsDto {
  @IsOptional()
  @Transform(({ value }) => Number(value ?? 1))
  @IsInt({ message: 'page must be an integer' })
  @Min(1, { message: 'page must be greater than or equal to 1' })
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => Number(value ?? 20))
  @IsInt({ message: 'limit must be an integer' })
  @Min(1, { message: 'limit must be greater than or equal to 1' })
  @Max(100, { message: 'limit maximum 100' })
  limit?: number = 20;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined) return undefined;
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  isRead?: boolean;

  @IsOptional()
  @IsString({ message: 'type must be a string' })
  type?: string;
}