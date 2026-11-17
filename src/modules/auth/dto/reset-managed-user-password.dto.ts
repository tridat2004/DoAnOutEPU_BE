import { IsString, Matches, MinLength } from 'class-validator';

export class ResetManagedUserPasswordDto {
  @IsString({ message: 'Password phai la chuoi' })
  @MinLength(8, { message: 'Password phai co it nhat 8 ky tu' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/, {
    message: 'Password phai co chu hoa, chu thuong, so va ky tu dac biet',
  })
  password: string;
}
