import { Body, Controller, Delete, Get, Param, Post } from "@nestjs/common";
import { MedicationService } from "./medication.service";
import { CreateMedicationDto } from "./dto/create-medication.dto";
import { Protected } from "@/common/decorators/protected.decorator";
import { Roles } from "@/common/decorators/roles.decorator";
import { UserRole } from "@/core/constants/constants";

@Controller('medications')
export class MedicationController {
    constructor(private readonly medicationService: MedicationService) { }

    @Protected(true)
    @Get(':userId')
    async getMedications(@Param('userId') userId: string) {
        return await this.medicationService.getMedications(userId);
    }

    @Protected(true)
    @Roles([UserRole.user, UserRole.admin])
    @Post()
    async createMedication(@Body() dto: CreateMedicationDto) {
        return await this.medicationService.createMedication(dto);
    }

    @Protected(true)
    @Roles([UserRole.user, UserRole.admin])
    @Delete(':id')
    async deleteMedication(@Param('id') id: string) {
        return await this.medicationService.deleteMedication(id);
    }
}
