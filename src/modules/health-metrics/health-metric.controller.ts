import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { HealthMetricService } from "./health-metric.service";
import { UpsertHealthMetricDto } from "./dto/upsert-health-metric.dto";
import { Protected } from "@/common/decorators/protected.decorator";
import { Roles } from "@/common/decorators/roles.decorator";
import { AuthUser, CurrentUser } from "@/common/decorators/current-user.decorator";
import { assertSelfOrAdmin } from "@/common/utils/access";
import { UserRole } from "@/core/constants/constants";

@Controller('health-metrics')
export class HealthMetricController {
    constructor(private readonly healthMetricService: HealthMetricService) { }

    // Medical data: a patient reads only their own (the dashboard and the
    // health-metrics page pass the signed-in user's id); admins read anyone's.
    @Protected(true)
    @Get(':userId')
    async getHealthMetrics(@Param('userId') userId: string, @CurrentUser() user: AuthUser) {
        assertSelfOrAdmin(user, userId);
        return await this.healthMetricService.getHealthMetrics(userId);
    }

    @Protected(true)
    @Roles([UserRole.user, UserRole.admin])
    @Post()
    async upsertHealthMetric(@Body() dto: UpsertHealthMetricDto, @CurrentUser() user: AuthUser) {
        assertSelfOrAdmin(user, dto.patient_id);
        return await this.healthMetricService.upsertHealthMetric(dto);
    }
}
