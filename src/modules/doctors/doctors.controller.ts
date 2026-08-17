import { Body, Controller, Delete, Get, Param, Patch, Post, Res } from "@nestjs/common";
import { DoctorService } from "./doctors.service";
import { CreateDoctorDto } from "./dto/create-doctor.dto";
import { UpdateDoctorDto } from "./dto/update-doctor.dto";
import { Protected } from "@/common/decorators/protected.decorator";
import { Roles } from "@/common/decorators/roles.decorator";
import { UserRole } from "@/core/constants/constants";
import type { Response } from "express";

@Controller('doctors')
export class DoctorController {
    constructor(private readonly doctorService: DoctorService) { }

    // Any signed-in role — the admin doctor-management list and a
    // patient's book-appointment doctor picker both need this.
    @Protected(true)
    @Get()
    async getDoctors() {
        return await this.doctorService.getDoctors()
    }

    // Same: doctors/schedule/all-patients read their own record this way,
    // and patients read a specific doctor's detail while booking.
    @Protected(true)
    @Get(':id')
    async getDoctorWithPatient(@Param('id') id: string) {
        return await this.doctorService.getDoctorWithPatients(id)
    }

    @Protected(true)
    @Roles([UserRole.admin, UserRole.doctor])
    @Post()
    async createDoctor(@Body() dto: CreateDoctorDto, @Res() res: Response) {
        return await this.doctorService.createDoctor(dto, res)
    }

    @Protected(true)
    @Roles([UserRole.admin, UserRole.doctor])
    @Patch(':id')
    async updateDoctor(@Param('id') id: string, @Body() dto: UpdateDoctorDto) {
        return await this.doctorService.updateDoctor(id, dto)
    }

    @Protected(true)
    @Roles([UserRole.admin])
    @Delete(':id')
    async deleteDoctor(@Param('id') id: string) {
        return await this.doctorService.deleteDoctor(id)
    }
}
