import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class GetActivityDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page phai la so nguyen' })
  @Min(1, { message: 'page phai lon hon hoac bang 1' })
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit phai la so nguyen' })
  @Min(1, { message: 'limit phai lon hon hoac bang 1' })
  @Max(100, { message: 'limit khong duoc vuot qua 100' })
  limit?: number = 10;

  @IsOptional()
  @IsString({ message: 'actionType khong hop le' })
  actionType?: string;
}