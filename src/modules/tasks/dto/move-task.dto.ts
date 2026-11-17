import { IsInt, IsUUID, Min } from 'class-validator';

export class MoveTaskDto {
  @IsUUID('4', { message: 'statusId khong hop le' })
  statusId: string;

  @IsInt({ message: 'targetIndex phai la so nguyen' })
  @Min(0, { message: 'targetIndex phai lon hon hoac bang 0' })
  targetIndex: number;
}
