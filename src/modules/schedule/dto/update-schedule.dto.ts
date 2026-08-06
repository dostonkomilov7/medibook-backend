import { IsInt, IsOptional, IsString } from "class-validator";

export class UpdateScheduleDto {
    @IsOptional()
    @IsInt()
    work_day: number;
    
    @IsOptional()
    @IsString()
    start_time: string;
    
    @IsOptional()
    @IsString()
    end_time: string;
}