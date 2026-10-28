import { Body, Controller, Delete, Get, Param, Patch, Post, Put } from "@nestjs/common";
import { AppointmentService } from "./appointment.service";
import { CreateAppointmentDto } from "./dto/create-appointment.dto";
import { UpdateAppointmentDto } from "./dto/update.appointment.dto";
import { Protected } from "@/common/decorators/protected.decorator";
import { AuthUser, CurrentUser } from "@/common/decorators/current-user.decorator";
import { assertSelfOrAdmin } from "@/common/utils/access";
import { UserRole } from "@/core/constants/constants";
import { Roles } from "@/common/decorators/roles.decorator";

@Controller('appointments')
export class AppointmentController {
    constructor(private readonly appointmentService: AppointmentService) { }

    // Admin "Appointment Management" table (patient + doctor names, phone).
    // Must stay above ':id' — otherwise Express treats "management" as an id.
    @Protected(true)
    @Roles([UserRole.admin])
    @Get('management')
    async getManagementList() {
        return await this.appointmentService.getManagementList()
    }

    // The signed-in patient's own appointments (the dashboards pass their own
    // user id); admins may look at anyone's.
    @Protected(true)
    @Roles([UserRole.admin, UserRole.user])
    @Get(':id')
    async getAppointments(@Param('id') id: string, @CurrentUser() user: AuthUser) {
        assertSelfOrAdmin(user, id)
        return await this.appointmentService.getAppointments(id)
    }

    // Global list. Admin pages (dashboard / doctor-management) get the full
    // rows for site-wide stats; book-appointment reads it as a patient purely
    // to learn which slots are taken, so non-admins only get the slot columns
    // (see AppointmentService.getAppointment).
    @Protected(true)
    @Roles([UserRole.admin, UserRole.user])
    @Get()
    async getAppointment(@CurrentUser() user: AuthUser) {
        return await this.appointmentService.getAppointment(user)
    }

    // Patients book for themselves, doctors into their own calendar (schedule
    // page), admins for anyone — enforced in the service.
    @Protected(true)
    @Roles([UserRole.admin, UserRole.doctor, UserRole.user])
    @Post()
    async createAppointment(@Body() dto: CreateAppointmentDto, @CurrentUser() user: AuthUser) {
        return await this.appointmentService.createAppointment(dto, user)
    }

    // Body is optional: with no body it advances to the next status, with
    // `{ status }` it must name that next status (see UpdateAppointmentDto).
    // A doctor can only do this for their own appointments.
    @Protected(true)
    @Roles([UserRole.admin, UserRole.doctor])
    @Patch(':id')
    async updateAppointment(@Param('id') id: string, @Body() dto: UpdateAppointmentDto, @CurrentUser() user: AuthUser) {
        return await this.appointmentService.updateAppointment(id, dto, user)
    }

    // Any signed-in role can cancel — but only their own: patients cancel
    // their own visit, doctors cancel from schedule/all-patients (their own
    // appointments), admins from either panel. Enforced in the service.
    @Protected(true)
    @Delete(':id')
    async deleteAppointment(@Param('id') id: string, @CurrentUser() user: AuthUser) {
        return await this.appointmentService.deleteAppointment(id, user)
    }
}
