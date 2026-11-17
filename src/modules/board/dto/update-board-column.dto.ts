import {
  IsHexColor,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateBoardColumnDto {
  @IsOptional()
  @IsString({ message: 'name phai la chuoi' })
  @IsNotEmpty({ message: 'name khong duoc de trong' })
  @MaxLength(100, { message: 'name toi da 100 ky tu' })
  name?: string;

  @IsOptional()
  @IsHexColor({ message: 'color phai la ma mau hex' })
  color?: string;

  @IsOptional()
  @IsInt({ message: 'wipLimit phai la so nguyen' })
  @Min(1, { message: 'wipLimit phai lon hon 0' })
  @Max(10000, { message: 'wipLimit toi da 10000' })
  wipLimit?: number | null;
}
