import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString } from "class-validator";

export class CreateMedicationDto {
    @Type(() => Number)
    @IsInt()
    patient_id: number;

    @IsString()
    name: string;

    @IsString()
    schedule: string;

    @IsOptional()
    @IsString()
    notes: string;
}
