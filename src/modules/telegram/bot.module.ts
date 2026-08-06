import { Module } from "@nestjs/common";
import { SequelizeModule } from "@nestjs/sequelize";
import { User } from "../users/model/user.model";
import { Doctor } from "../doctors/model/doctors.model";
import { Schedule } from "../schedule/model/schedule.model";
import { Appointment } from "../appointments/model/appointments.model";
import { UserService } from "../users/user.service";
import { DoctorService } from "../doctors/doctors.service";
import { ScheduleService } from "../schedule/schedule.service";
import { AppointmentService } from "../appointments/appointment.service";
import { BotUpdate } from "./bot.update";
import { BotService } from "./bot.service";

@Module({
    imports: [SequelizeModule.forFeature([User, Doctor, Schedule, Appointment])],
    providers: [BotService, BotUpdate, UserService, DoctorService, ScheduleService, AppointmentService]
})

export class BotModule {}