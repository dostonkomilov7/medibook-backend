import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Max, Min } from "class-validator";

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
    @Type(() => Number)
    @IsInt()
    @Min(0)
    // the column is a Postgres INTEGER — beyond this the database answers 500
    @Max(2147483647)
    consultation_fee: number;

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