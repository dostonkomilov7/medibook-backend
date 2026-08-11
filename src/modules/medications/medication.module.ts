import { Module } from "@nestjs/common";
import { SequelizeModule } from "@nestjs/sequelize";
import { Medication } from "./model/medication.model";
import { MedicationController } from "./medication.controller";
import { MedicationService } from "./medication.service";

@Module({
    imports: [SequelizeModule.forFeature([Medication])],
    controllers: [MedicationController],
    providers: [MedicationService],
    exports: [MedicationService],
})

export class MedicationModule { }
