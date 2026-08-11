import { Module } from "@nestjs/common";
import { SequelizeModule } from "@nestjs/sequelize";
import { HealthMetric } from "./model/health-metric.model";
import { HealthMetricController } from "./health-metric.controller";
import { HealthMetricService } from "./health-metric.service";

@Module({
    imports: [SequelizeModule.forFeature([HealthMetric])],
    controllers: [HealthMetricController],
    providers: [HealthMetricService],
    exports: [HealthMetricService],
})

export class HealthMetricModule { }
