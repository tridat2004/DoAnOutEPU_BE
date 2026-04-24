import { IsUUID } from "class-validator";

export class UpdateTaskStatusDto{
    @IsUUID('4', {message: 'statusId khong hop le'})
    statusId: string
}