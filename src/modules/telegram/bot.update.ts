import { Injectable } from "@nestjs/common";
import { Command, Ctx, Help, Start, Update } from "nestjs-telegraf";
import { Context, Scenes } from "telegraf";
import { UserService } from "../users/user.service";
import { AppointmentService } from "../appointments/appointment.service";
import { DoctorService } from "../doctors/doctors.service";
import { ScheduleService } from "../schedule/schedule.service";
import { BotService } from "./bot.service";
import { UpdateUserDto } from "../users/dto/update-user.dto";

@Update()
@Injectable()
export class BotUpdate {
    constructor(
        private readonly userService: UserService,
        private readonly appointmentService: AppointmentService,
        private readonly doctorsService: DoctorService,
        private readonly scheduleService: ScheduleService,
        private readonly botService: BotService,
    ) { }

    @Start()
    async start(@Ctx() ctx: any) {
        const telegramId = ctx.from?.id;
        const payload = ctx.message?.text.split(' ')[1];

        if (payload) {
            await this.userService.updateUser(payload as string, { telegram_id: telegramId } as UpdateUserDto)
        }

        const userData = await this.userService.getUser(String(telegramId));

        if (!userData) {
            return await ctx.reply('Please, sign up in the Medibook\'s website')
        }

        const message = `Your informations 📄\n
        \n👤 Full Name: ${userData.users[0]?.dataValues.full_name},
        \n📧 Email: ${userData.users[0]?.dataValues.email},
        \n☎️ Phone: ${userData.users[0]?.dataValues.phone},
        \n🔰 Status: ${userData.users[0]?.dataValues.status},
        \n🧑🏻‍💻 Role: ${userData.users[0]?.dataValues.role},
        `

        await ctx.reply('Welcome to Medibook Clinic Bot, Dear, ' + userData.users[0]?.dataValues.full_name)
        await this.botService.sendMessage(telegramId, message)

    }

    @Command('appointments')
    async stats(@Ctx() ctx: Scenes.SceneContext) {
        const telegram_user_id = ctx.from?.id;
        const userData = await this.userService.getUser(String(telegram_user_id));


        if (userData.users[0].dataValues.role === 'User') {
            const appointments = await this.appointmentService.getAppointments(userData.users[0].id);
            const flatData = appointments.appointments.rows;

            if (appointments.appointments.count === 0) {
                await ctx.reply('📅 No available appointments')
                return
            }

            await ctx.reply(`
                Your Appointments 📅 🏥
                ${flatData.map((el: any, i: any) =>
                `\n${i + 1}. 📍 Location: MediBook Clinic
                    \n👨🏻‍⚕️ Doctor name: ${el.dataValues.doctor.dataValues.user.dataValues.full_name}
                    \n🏨 Doctor department: ${el.dataValues.doctor.dataValues.department}
                    \n👤 Doctor specialty: ${el.dataValues.doctor.dataValues.specialization}
                    \n🗓️ Appointment date: ${el.dataValues.appointment_date}
                    \n⏰ Appointment time: ${el.dataValues.appointment_time}\n
                `)}
            `);
        }

        if (userData.users[0].dataValues.role === 'Doctor') {
            const appointments = await this.doctorsService.getDoctorWithPatients(userData.users[0].id);
            const flatData = appointments.doctors[0].dataValues.appointments;

            if (flatData.length === 0) {
                await ctx.reply('📅 No available appointments')
                return
            }

            await ctx.reply(`
                \nYour Appointments 📅 🏥\n
                ${flatData.map((el: any, i: any) =>
                `\n${i + 1}. 📍 Location: MediBook Clinic
                    \n👤 User name: ${el.dataValues.user.dataValues.full_name}
                    \n📧 User email: ${el.dataValues.user.dataValues.email}
                    \n☎️ User phone: ${el.dataValues.user.dataValues.phone}
                    \n🗓️ Appointment date: ${el.dataValues.appointment_date}
                    \n⏰ Appointment time: ${el.dataValues.appointment_time}\n
                    `
            )}
            `);
        }

    }

    // // @Command('delete')
    // // async deleteExpense(@Ctx() ctx: Scenes.SceneContext) {
    // //     await ctx.scene.enter('delete_expense_scene');
    // // }

    @Command('exit')
    async exitCommand(@Ctx() ctx: Scenes.SceneContext) {
        await ctx.scene.leave();
    }
}