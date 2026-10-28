import { Body, Controller, Delete, Get, Param, Post } from "@nestjs/common";
import { MedicationService } from "./medication.service";
import { CreateMedicationDto } from "./dto/create-medication.dto";
import { Protected } from "@/common/decorators/protected.decorator";
import { Roles } from "@/common/decorators/roles.decorator";
import { AuthUser, CurrentUser } from "@/common/decorators/current-user.decorator";
import { assertSelfOrAdmin } from "@/common/utils/access";
import { UserRole } from "@/core/constants/constants";

@Controller('medications')
export class MedicationController {
    constructor(private readonly medicationService: MedicationService) { }

    // Medical data: a patient reads only their own (the dashboard and the
    // medical-records page pass the signed-in user's id); admins read anyone's.
    @Protected(true)
    @Get(':userId')
    async getMedications(@Param('userId') userId: string, @CurrentUser() user: AuthUser) {
        assertSelfOrAdmin(user, userId);
        return await this.medicationService.getMedications(userId);
    }

    @Protected(true)
    @Roles([UserRole.user, UserRole.admin])
    @Post()
    async createMedication(@Body() dto: CreateMedicationDto, @CurrentUser() user: AuthUser) {
        assertSelfOrAdmin(user, dto.patient_id);
        return await this.medicationService.createMedication(dto);
    }

    @Protected(true)
    @Roles([UserRole.user, UserRole.admin])
    @Delete(':id')
    async deleteMedication(@Param('id') id: string, @CurrentUser() user: AuthUser) {
        return await this.medicationService.deleteMedication(id, user);
    }
}
