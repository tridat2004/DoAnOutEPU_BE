import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from "class-validator";

export class CreateProjectDto{
    @IsString({message: 'Name must be a string'})
    @IsNotEmpty({message: 'Name is required'})
    @MaxLength(255, {message: 'Name must not exceed 255 characters'})
    name: string;

    @IsString({message:'Project key must be a string'})
    @IsNotEmpty({message: 'Project key is required'})
    @MaxLength(20, {message: 'Project key must not exceed 20 characters'})
    @Matches(/^[A-Z0-9_]+$/, {
        message: 'Project key can only contain uppercase letters, numbers and underscores',
    })
    projectKey: string;

    @IsOptional()
    @IsString({message: 'Description must be a string'})
    @MaxLength(1000, {message: 'Description must not exceed 1000 characters'})
    description?: string;
}