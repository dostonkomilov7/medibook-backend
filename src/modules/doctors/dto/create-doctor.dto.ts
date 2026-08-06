import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString } from "class-validator";

export class CreateDoctorDto {
    @IsString()
    specialization: string;
    
    @IsString()
    department: string;
    
    @IsString()
    experience: string;

    @IsOptional()
    @IsString()
    bio: string;

    @IsOptional()
    @IsString()
    type: string;

    @Type(() => Number)
    @IsInt()
    room_number: number;
    
    @Type(() => Number)
    @IsInt()
    user_id: number
}