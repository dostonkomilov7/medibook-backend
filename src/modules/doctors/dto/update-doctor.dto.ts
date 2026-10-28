import { DoctorStatus } from "@/core/constants/constants";
import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class UpdateDoctorDto {
    @IsOptional()
    @IsString()
    specialization: string;
    
    @IsOptional()
    @IsString()
    department: string;
    
    @IsOptional()
    @IsString()
    experience: string;

    @IsOptional()
    @IsString()
    bio: string;

    // null clears the price (IsOptional lets null through).
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

    @IsOptional()
    @IsString()
    status: DoctorStatus;

    @IsOptional()
    @IsInt()
    room_number: number;
}