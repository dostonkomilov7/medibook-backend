import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { Medication } from "./model/medication.model";
import { CreateMedicationDto } from "./dto/create-medication.dto";

@Injectable()
export class MedicationService {
    constructor(@InjectModel(Medication) private readonly medicationModel: typeof Medication) { }

    async getMedications(patientId: string) {
        try {
            const medications = await this.medicationModel.findAll({ where: { patient_id: patientId } });
            return {
                success: true,
                medications,
            };
        } catch (error) {
            console.log(error);
            throw error;
        }
    }

    async createMedication(dto: CreateMedicationDto) {
        try {
            const medication = await this.medicationModel.create({ ...dto });
            return {
                success: true,
                message: "Successfully added",
                medication,
            };
        } catch (error) {
            console.log(error);
            throw error;
        }
    }

    async deleteMedication(id: string) {
        try {
            const existing = await this.medicationModel.findByPk(id);

            if (!existing) {
                throw new NotFoundException("Medication is not found");
            }

            await this.medicationModel.destroy({ where: { id } });

            return {
                success: true,
                message: "Successfully removed"
            };
        } catch (error) {
            console.log(error);
            throw error;
        }
    }
}
