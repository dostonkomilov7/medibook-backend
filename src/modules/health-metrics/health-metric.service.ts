import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { HealthMetric } from "./model/health-metric.model";
import { UpsertHealthMetricDto } from "./dto/upsert-health-metric.dto";

@Injectable()
export class HealthMetricService {
    constructor(@InjectModel(HealthMetric) private readonly healthMetricModel: typeof HealthMetric) { }

    async getHealthMetrics(patientId: string) {
        try {
            const metrics = await this.healthMetricModel.findAll({ where: { patient_id: patientId } });
            return {
                success: true,
                metrics,
            };
        } catch (error) {
            console.log(error);
            throw error;
        }
    }

    async upsertHealthMetric(dto: UpsertHealthMetricDto) {
        try {
            const existing = await this.healthMetricModel.findOne({ where: { patient_id: dto.patient_id, type: dto.type } });

            if (existing) {
                await existing.update({ value: dto.value, unit: dto.unit, recordedAt: new Date() });
            } else {
                await this.healthMetricModel.create({ ...dto, recordedAt: new Date() });
            }

            return {
                success: true,
                message: "Successfully saved"
            };
        } catch (error) {
            console.log(error);
            throw error;
        }
    }
}
