import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class ListProjectsDto {
  @IsOptional()
  @IsString({ message: 'keyword phai la chuoi' })
  @MaxLength(255, { message: 'keyword toi da 255 ky tu' })
  keyword?: string;

  @IsOptional()
  @Transform(({ value }) => Number(value ?? 1))
  @IsInt({ message: 'page phai la so nguyen' })
  @Min(1, { message: 'page phai lon hon hoac bang 1' })
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => Number(value ?? 20))
  @IsInt({ message: 'limit phai la so nguyen' })
  @Min(1, { message: 'limit phai lon hon hoac bang 1' })
  @Max(100, { message: 'limit toi da 100' })
  limit?: number = 20;
}
