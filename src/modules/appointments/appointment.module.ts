import { Module } from "@nestjs/common";
import { SequelizeModule } from "@nestjs/sequelize";
import { Appointment } from "./model/appointments.model";
import { AppointmentController } from "./appointment.controller";
import { AppointmentService } from "./appointment.service";
import { BotService } from "../telegram/bot.service";
import { UserModule } from "../users/user.module";
import { DoctorModule } from "../doctors/doctors.module";

@Module({
    imports: [SequelizeModule.forFeature([Appointment]), UserModule, DoctorModule],
    controllers: [AppointmentController],
    providers: [AppointmentService, BotService],
})

export class AppointmentModule {}