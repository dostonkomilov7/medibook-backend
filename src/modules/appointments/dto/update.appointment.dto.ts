import { AppointmentStatus } from "@/core/constants/constants";
import { IsEnum, IsOptional } from "class-validator";

export class UpdateAppointmentDto {
    // Optional on purpose: the doctor panels call PATCH without a body to
    // push an appointment one step forward. When a status is given it must
    // be that next step (Pending -> Confirmed -> Completed).
    @IsOptional()
    @IsEnum(AppointmentStatus)
    status?: AppointmentStatus;
}
