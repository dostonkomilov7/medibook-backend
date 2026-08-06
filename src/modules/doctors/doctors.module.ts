import { Module } from "@nestjs/common";
import { SequelizeModule } from "@nestjs/sequelize";
import { Doctor } from "./model/doctors.model";
import { DoctorController } from "./doctors.controller";
import { DoctorService } from "./doctors.service";

@Module({
    imports: [SequelizeModule.forFeature([Doctor])],
    controllers: [DoctorController],
    providers: [DoctorService],
    exports: [DoctorService],
})

export class DoctorModule {}