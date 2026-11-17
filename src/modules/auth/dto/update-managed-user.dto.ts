import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateManagedUserDto {
  @IsOptional()
  @IsEmail({}, { message: 'Email khong hop le' })
  email?: string;

  @IsOptional()
  @IsString({ message: 'Full name phai la chuoi' })
  @IsNotEmpty({ message: 'Full name khong duoc de trong' })
  @MaxLength(150, { message: 'Full name toi da 150 ky tu' })
  fullName?: string;

  @IsOptional()
  @IsString({ message: 'Username phai la chuoi' })
  @MinLength(3, { message: 'Username toi thieu 3 ky tu' })
  @MaxLength(100, { message: 'Username toi da 100 ky tu' })
  @Matches(/^[a-zA-Z0-9._]+$/, {
    message: 'Username chi duoc chua chu, so, dau cham va dau gach duoi',
  })
  userName?: string;
}
