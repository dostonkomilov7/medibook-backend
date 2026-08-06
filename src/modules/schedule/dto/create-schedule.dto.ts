import { Type } from "class-transformer";
import { IsInt, IsString } from "class-validator";

export class CreateScheduleDto {
    @Type(() => Number)
    @IsInt()
    doctor_id: number;

    @IsString()
    work_day: string;

    @IsString()
    start_time: string;
    
    @IsString()
    end_time: string;
}