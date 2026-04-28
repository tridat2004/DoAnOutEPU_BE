import {
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class UpdateProjectDto {
  @IsOptional()
  @IsString({ message: 'Name must be a string' })
  @ValidateIf((_, value) => value !== undefined)
  @MaxLength(150, { message: 'Name must not exceed 150 characters' })
  name?: string;

  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  description?: string;
}