import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    description: 'Email cua tai khoan moi.',
    example: 'admin@example.com',
    format: 'email',
  })
  @IsEmail({}, { message: 'Email khong hop le' })
  email: string;

  @ApiProperty({
    description: 'Ho va ten hien thi cua nguoi dung.',
    example: 'Nguyen Van A',
    maxLength: 150,
  })
  @IsString({ message: 'Full name phai la chuoi' })
  @IsNotEmpty({ message: 'Full name khong duoc de trong' })
  @MaxLength(150, { message: 'Full name toi da 150 ky tu' })
  fullName: string;

  @ApiProperty({
    description: 'Username duy nhat, chi gom chu, so, dau cham va dau gach duoi.',
    example: 'nguyenvana',
    minLength: 3,
    maxLength: 100,
    pattern: '^[a-zA-Z0-9._]+$',
  })
  @IsString({ message: 'Username phai la chuoi' })
  @IsNotEmpty({ message: 'Username khong duoc de trong' })
  @MinLength(3, { message: 'Username toi thieu 3 ky tu' })
  @MaxLength(100, { message: 'Username toi da 100 ky tu' })
  @Matches(/^[a-zA-Z0-9._]+$/, {
    message: 'Username chi duoc chua chu, so, dau cham va dau gach duoi',
  })
  userName: string;

  @ApiProperty({
    description: 'Mat khau phai co chu hoa, chu thuong, so va ky tu dac biet.',
    example: 'Secret123!',
    minLength: 8,
    writeOnly: true,
    pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z\\d]).+$',
  })
  @IsString({ message: 'Password phai la chuoi' })
  @MinLength(8, { message: 'Password phai co it nhat 8 ky tu' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/, {
    message: 'Password phai co chu hoa, chu thuong, so va ky tu dac biet',
  })
  password: string;
}
