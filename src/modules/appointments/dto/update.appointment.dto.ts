import { AppointmentStatus } from "@/core/constants/constants";
import { IsString } from "class-validator";

export class UpdateAppointmentDto {
    @IsString()
    status: AppointmentStatus;
}