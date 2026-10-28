import { AppointmentUrgency } from "@/core/constants/constants";
import { Type } from "class-transformer";
import { IsDefined, IsEnum, IsInt, IsOptional, IsString, Matches } from "class-validator";
import { APPOINTMENT_DATE_PATTERN, APPOINTMENT_TIME_PATTERN } from "../appointment-time.util";

// The global ValidationPipe runs with skipUndefinedProperties/skipNullProperties,
// which silently skips every validator on a missing field — @IsDefined() is the
// one validator it still runs, so the required fields below carry it.
export class CreateAppointmentDto{
    @IsDefined()
    @Type(() => Number)
    @IsInt()
    patient_id: number;

    @IsDefined()
    @Type(() => Number)
    @IsInt()
    doctor_id: number;

    // Impossible dates that still match the pattern ("2025-02-30") are
    // rejected by the service, which also knows what "today" is.
    @IsDefined()
    @IsString()
    @Matches(APPOINTMENT_DATE_PATTERN, { message: "appointment_date must be in YYYY-MM-DD format" })
    appointment_date: string;

    @IsDefined()
    @IsString()
    @Matches(APPOINTMENT_TIME_PATTERN, { message: 'appointment_time must look like "9:30 AM"' })
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
