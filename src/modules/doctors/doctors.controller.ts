import { Body, Controller, Delete, Get, Param, Patch, Post, Res } from "@nestjs/common";
import { DoctorService } from "./doctors.service";
import { CreateDoctorDto } from "./dto/create-doctor.dto";
import { UpdateDoctorDto } from "./dto/update-doctor.dto";
import { Protected } from "@/common/decorators/protected.decorator";
import { Roles } from "@/common/decorators/roles.decorator";
import { AuthUser, CurrentUser } from "@/common/decorators/current-user.decorator";
import { assertSelfOrAdmin } from "@/common/utils/access";
import { UserRole } from "@/core/constants/constants";
import type { Response } from "express";

@Controller('doctors')
export class DoctorController {
    constructor(private readonly doctorService: DoctorService) { }

    // Any signed-in role — the admin doctor-management list and a
    // patient's book-appointment doctor picker both need this. What each
    // role gets back differs (see DoctorService.getDoctors).
    @Protected(true)
    @Get()
    async getDoctors(@CurrentUser() user: AuthUser) {
        return await this.doctorService.getDoctors(user.role)
    }

    // A doctor's own record with their patients and appointments: the
    // dashboard, schedule and all-patients pages call it with the signed-in
    // doctor's user id. Patients and other doctors have no business here;
    // admins may open any doctor's.
    @Protected(true)
    @Roles([UserRole.admin, UserRole.doctor])
    @Get(':id')
    async getDoctorWithPatient(@Param('id') id: string, @CurrentUser() user: AuthUser) {
        assertSelfOrAdmin(user, id)
        return await this.doctorService.getDoctorWithPatients(id)
    }

    // A doctor creates their own profile (third-page onboarding sends their
    // own user id); the admin panel creates it for the account it just made.
    @Protected(true)
    @Roles([UserRole.admin, UserRole.doctor])
    @Post()
    async createDoctor(@Body() dto: CreateDoctorDto, @Res() res: Response, @CurrentUser() user: AuthUser) {
        assertSelfOrAdmin(user, dto.user_id)
        return await this.doctorService.createDoctor(dto, res)
    }

    // A doctor can edit only their own profile; admins any (checked in the service).
    @Protected(true)
    @Roles([UserRole.admin, UserRole.doctor])
    @Patch(':id')
    async updateDoctor(@Param('id') id: string, @Body() dto: UpdateDoctorDto, @CurrentUser() user: AuthUser) {
        return await this.doctorService.updateDoctor(id, dto, user)
    }

    @Protected(true)
    @Roles([UserRole.admin])
    @Delete(':id')
    async deleteDoctor(@Param('id') id: string) {
        return await this.doctorService.deleteDoctor(id)
    }
}
