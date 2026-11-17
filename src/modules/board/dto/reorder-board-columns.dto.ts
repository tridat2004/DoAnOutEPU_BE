import { ArrayMinSize, ArrayUnique, IsArray, IsUUID } from 'class-validator';

export class ReorderBoardColumnsDto {
  @IsArray({ message: 'columnIds phai la mang' })
  @ArrayMinSize(1, { message: 'columnIds khong duoc de trong' })
  @ArrayUnique({ message: 'columnIds khong duoc trung lap' })
  @IsUUID('4', { each: true, message: 'columnIds khong hop le' })
  columnIds!: string[];
}
