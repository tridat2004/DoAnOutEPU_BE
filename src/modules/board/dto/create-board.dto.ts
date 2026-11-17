import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateBoardDto {
  @IsString({ message: 'name phai la chuoi' })
  @IsNotEmpty({ message: 'name khong duoc de trong' })
  @MaxLength(150, { message: 'name toi da 150 ky tu' })
  name!: string;
}
