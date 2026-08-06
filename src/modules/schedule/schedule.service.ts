import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { Schedule } from "./model/schedule.model";
import { CreateScheduleDto } from "./dto/create-schedule.dto";
import { UpdateScheduleDto } from "./dto/update-schedule.dto";

@Injectable()
export class ScheduleService {
    constructor(@InjectModel(Schedule) private readonly scheduleService: typeof Schedule) {}

    async getSchedules() {
        try {
            const schedules = await this.scheduleService.findAll()
    
            return {
                success: true,
                data: schedules
            }
            
        } catch (error) {
            console.log(error)
            throw error
        }
    }

    async createSchedule(dto: CreateScheduleDto) {
        try {
            await this.scheduleService.create({
                doctor_id: dto.doctor_id,
                work_day: dto.work_day,
                start_time: dto.start_time,
                end_time: dto.end_time
            })
    
            return {
                success: true,
                message: "Successfully created"
            }
            
        } catch (error) {
            console.log(error)
            throw error
        }
    }

    async updateSchedule(id: string, dto: UpdateScheduleDto) {
        try {
            const existing = await this.scheduleService.findByPk(id);
    
            if(!existing) {
                throw new NotFoundException('Schedule is not found')
            }
    
            await this.scheduleService.update(dto, {where: {id}})
    
            return {
                success: true,
                message: "Successfully updated"
            }
            
        } catch (error) {
            console.log(error)
            throw error
        }
    }

    async deleteSchedule(id: string) {
        try {
            const existing = await this.scheduleService.findByPk(id);
    
            if(!existing) {
                throw new NotFoundException('Schedule is not found')
            }
    
            await this.scheduleService.destroy({where: {id}})
    
            return {
                success: true,
                message: "Successfully deleted"
            }
            
        } catch (error) {
            console.log(error)
            throw error
        }
    }
}