import { Body, Controller, Delete, Get, Param, Patch, Post, Put } from "@nestjs/common";
import { AppointmentService } from "./appointment.service";
import { CreateAppointmentDto } from "./dto/create-appointment.dto";
import { UpdateAppointmentDto } from "./dto/update.appointment.dto";
import { Protected } from "@/common/decorators/protected.decorator";
import { UserRole } from "@/core/constants/constants";
import { Roles } from "@/common/decorators/roles.decorator";

@Controller('appointments')
export class AppointmentController {
    constructor(private readonly appointmentService: AppointmentService) { }

    // @Protected(true)
    // @Roles([UserRole.admin, UserRole.doctor, UserRole.user])
    @Get(':id')
    async getAppointments(@Param('id') id: string) {
        return await this.appointmentService.getAppointments(id)
    }

    @Get()
    async getAppointment() {
        return await this.appointmentService.getAppointment()
    }

    // @Protected(true)
    // @Roles([UserRole.admin, UserRole.doctor])
    @Post()
    async createAppointment(@Body() dto: CreateAppointmentDto) {
        return await this.appointmentService.createAppointment(dto)
    }

    // @Protected(true)
    // @Roles([UserRole.admin, UserRole.doctor])
    @Patch(':id')
    async updateAppointment(@Param('id') id: string) {
        return await this.appointmentService.updateAppointment(id)
    }

    // @Protected(true)
    // @Roles([UserRole.admin, UserRole.doctor])
    @Delete(':id')
    async deleteAppointment(@Param('id') id: string) {
        return await this.appointmentService.deleteAppointment(id)
    }
}