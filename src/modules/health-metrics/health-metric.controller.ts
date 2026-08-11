import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { HealthMetricService } from "./health-metric.service";
import { UpsertHealthMetricDto } from "./dto/upsert-health-metric.dto";
import { Protected } from "@/common/decorators/protected.decorator";
import { Roles } from "@/common/decorators/roles.decorator";
import { UserRole } from "@/core/constants/constants";

@Controller('health-metrics')
export class HealthMetricController {
    constructor(private readonly healthMetricService: HealthMetricService) { }

    @Get(':userId')
    async getHealthMetrics(@Param('userId') userId: string) {
        return await this.healthMetricService.getHealthMetrics(userId);
    }

    // @Protected(true)
    // @Roles([UserRole.user, UserRole.admin])
    @Post()
    async upsertHealthMetric(@Body() dto: UpsertHealthMetricDto) {
        return await this.healthMetricService.upsertHealthMetric(dto);
    }
}
