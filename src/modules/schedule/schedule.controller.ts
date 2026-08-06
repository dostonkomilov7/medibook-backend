import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { ScheduleService } from "./schedule.service";
import { CreateScheduleDto } from "./dto/create-schedule.dto";
import { UpdateScheduleDto } from "./dto/update-schedule.dto";
import { Protected } from "@/common/decorators/protected.decorator";
import { UserRole } from "@/core/constants/constants";
import { Roles } from "@/common/decorators/roles.decorator";

@Controller('schedules')
export class ScheduleController {
    constructor(private readonly scheduleService: ScheduleService) { }

    @Protected(true)
    @Roles([UserRole.admin, UserRole.doctor])
    @Get()
    async getSchedules() {
        return await this.scheduleService.getSchedules()
    }

    // @Protected(true)
    // @Roles([UserRole.admin, UserRole.doctor])
    @Post()
    async createSchedule(@Body() dto: CreateScheduleDto) {
        return await this.scheduleService.createSchedule(dto)
    }
    
    @Protected(true)
    @Roles([UserRole.admin, UserRole.doctor])
    @Patch('id')
    async updateSchedule(@Param('id') id: string, @Body() dto: UpdateScheduleDto) {
        return await this.scheduleService.updateSchedule(id, dto)
    }
    
    @Protected(true)
    @Roles([UserRole.admin, UserRole.doctor])
    @Delete('id')
    async deleteSchedule(@Param('id') id: string) {
        return await this.scheduleService.deleteSchedule(id)
    }
}