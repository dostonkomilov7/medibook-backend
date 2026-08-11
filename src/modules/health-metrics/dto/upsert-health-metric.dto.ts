import { HealthMetricType } from "@/core/constants/constants";
import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString } from "class-validator";

export class UpsertHealthMetricDto {
    @Type(() => Number)
    @IsInt()
    patient_id: number;

    @IsEnum(HealthMetricType)
    type: HealthMetricType;

    @IsString()
    value: string;

    @IsOptional()
    @IsString()
    unit: string;
}
