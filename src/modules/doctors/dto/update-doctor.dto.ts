import { DoctorStatus } from "@/core/constants/constants";
import { IsInt, IsOptional, IsString } from "class-validator";

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