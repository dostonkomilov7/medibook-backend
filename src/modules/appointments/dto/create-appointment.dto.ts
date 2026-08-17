import { AppointmentUrgency } from "@/core/constants/constants";
import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString } from "class-validator";

export class CreateAppointmentDto{
    @Type(() => Number)
    @IsInt()
    patient_id: number;

    @Type(() => Number)
    @IsInt()
    doctor_id: number;

    @IsString()
    appointment_date: string;

    @IsString()
    appointment_time: string;

    @IsOptional()
    @IsString()
    reason: string;

    @IsOptional()
    @IsString()
    notes: string;

    @IsOptional()
    @IsEnum(AppointmentUrgency)
    urgency: AppointmentUrgency;

}
