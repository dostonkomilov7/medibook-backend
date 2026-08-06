import { Module } from "@nestjs/common";
import { SequelizeModule } from "@nestjs/sequelize";
import { Schedule } from "./model/schedule.model";
import { ScheduleController } from "./schedule.controller";
import { ScheduleService } from "./schedule.service";

@Module({
    imports: [SequelizeModule.forFeature([Schedule])],
    controllers: [ScheduleController],
    providers: [ScheduleService]
})

export class ScheduleModule {}