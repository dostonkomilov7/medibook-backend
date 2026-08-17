import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { Appointment } from "./model/appointments.model";
import { CreateAppointmentDto } from "./dto/create-appointment.dto";
import { UpdateAppointmentDto } from "./dto/update.appointment.dto";
import { User } from "../users/model/user.model";
import { Doctor } from "../doctors/model/doctors.model";
import { AppointmentStatus } from "@/core/constants/constants";
import { Op } from "sequelize";
import { BotService } from "../telegram/bot.service";
import { UserService } from "../users/user.service";
import { DoctorService } from "../doctors/doctors.service";

@Injectable()
export class AppointmentService {
    constructor(
        @InjectModel(Appointment) private readonly appointmentModel: typeof Appointment,
        private readonly userService: UserService,
        private readonly doctorService: DoctorService,
        private readonly botService: BotService,
    ) { }

    async getAppointment() {
        const appointments = await this.appointmentModel.findAll()

        return {
            appointments
        }
    }
    async getAppointments(id: string) {
        try {
            const appointments = await this.appointmentModel.findAndCountAll({
                include: [
                    {
                        model: User,
                        where: { id }
                    },
                    {
                        model: Doctor,
                        include: [User]
                    }
                ]
            })

            // Was filtering on { id: id } — the appointment's own primary
            // key — instead of { patient_id: id }, so these counts almost
            // never matched the actual signed-in user's appointments (only
            // by coincidence, when some appointment's own row id happened
            // to equal their user id). That made every summary-strip value
            // and tab count on my-appointments effectively random/wrong.
            const totalUpcoming = await this.appointmentModel.count({
                where: {
                    [Op.and]: [
                        { patient_id: id },
                        { status: 'Confirmed' }
                    ]
                }
            });
            const totalPending = await this.appointmentModel.count({
                where: {
                    [Op.and]: [
                        { patient_id: id },
                        { status: 'Pending' }
                    ]
                }
            });
            const totalCompleted = await this.appointmentModel.count({
                where: {
                    [Op.and]: [
                        { patient_id: id },
                        { status: 'Completed' }
                    ]
                }
            });
            const totalCancelled = await this.appointmentModel.count({
                where: {
                    [Op.and]: [
                        { patient_id: id },
                        { status: 'Cancelled' }
                    ]
                }
            });

            return {
                success: true,
                appointments,
                totalUpcoming,
                totalPending,
                totalCompleted,
                totalCancelled,
            }

        } catch (error) {
            console.log(error)
            throw error
        }
    }

    async createAppointment(dto: CreateAppointmentDto) {
        try {
            const appointment = await this.appointmentModel.create({
                patient_id: dto.patient_id,
                doctor_id: dto.doctor_id,
                appointment_date: dto.appointment_date,
                appointment_time: dto.appointment_time,
                reason: dto.reason,
                notes: dto.notes,
                // Was silently dropped here — the booking form's urgency
                // picker was fully wired up client-side but every created
                // appointment still landed on the DB default (Routine)
                // since this field was never listed for .create(), which
                // is why "Urgent Cases" on the doctor dashboard never
                // moved for real bookings.
                urgency: dto.urgency,
                status: AppointmentStatus.PENDING
            })


            const user = await this.userService.getUser(String(dto.patient_id))
            const doctor = await this.doctorService.getSingleDoctor(String(dto.doctor_id))

            if (doctor?.doctors[0].dataValues.user.dataValues.telegram_id) {
                await this.botService.sendMessage(doctor?.doctors[0].dataValues.user.dataValues.telegram_id, `You have an new appointment 🆕\n\n Please, check and respond to the appointment in the website ✅.\n\n\n Thank You Mr Doctor😊`)
            }
            if (user.users[0].dataValues.telegram_id) {
                await this.botService.sendMessage(user.users[0].dataValues.telegram_id, `Appointment successfully created 🎉\n\n Now, status is pending ⏳. We will respond soon`)
            }

            return {
                success: true,
                message: "Successfully created",
                // The frontend uses this as the real booking reference
                // (e.g. "MB-42") — without it, it had no way to tie the
                // reference shown to the user back to the actual row and
                // silently fell back to a client-side Date.now() stamp.
                appointment: { id: appointment.id }
            }

        } catch (error) {
            console.log(error)
            throw error
        }
    }

    async updateAppointment(id: string) {
        try {
            const existing = await this.appointmentModel.findByPk(id)

            if (!existing) {
                throw new NotFoundException("Appointment is not found")
            }
            const user = await this.userService.getUser(String(existing.dataValues.patient_id))
            const doctor = await this.doctorService.getSingleDoctor(String(existing.dataValues.doctor_id))

            if (existing.dataValues.status === 'Pending') {
                await this.appointmentModel.update({ status: AppointmentStatus.CONFIRMED }, { where: { id } })
                if (doctor?.doctors[0].dataValues.user.dataValues.telegram_id) {
                    await this.botService.sendMessage(doctor?.doctors[0].dataValues.user.dataValues.telegram_id, `You have confirmed appointment 🎉\n\n Check the appointment.`)
                }
                if (user.users[0].dataValues.telegram_id) {
                    await this.botService.sendMessage(user.users[0].dataValues.telegram_id, `Appointment has been confirmed 🎉\n\n Now, status is confirmed ✅. Check the appointment.`)
                }
            } else {
                await this.appointmentModel.update({ status: AppointmentStatus.COMPLETED }, { where: { id } })
                if (doctor?.doctors[0].dataValues.user.dataValues.telegram_id) {
                    await this.botService.sendMessage(doctor?.doctors[0].dataValues.user.dataValues.telegram_id, `You have successfully completed an appointment 🎉\n\n We wish you success in your work 🤝🏻`)
                }
                if (user.users[0].dataValues.telegram_id) {
                    await this.botService.sendMessage(user.users[0].dataValues.telegram_id, `Appointment has been completed 🎉\n\n We are glad for working with you. Thank You for your choice 😊`)
                }
            }

            return {
                success: true,
                message: "Appointment has been successfully updated"
            }

        } catch (error) {
            console.log(error)
            throw error
        }
    }

    async deleteAppointment(id: string) {
        try {
            const existing = await this.appointmentModel.findByPk(id)

            if (!existing) {
                throw new NotFoundException("Appointment is not found")
            }

            await this.appointmentModel.update({ status: AppointmentStatus.CANCELLED }, { where: { id } })

            return {
                success: true,
                message: "Appointment has been successfully cancelled"
            }

        } catch (error) {
            console.log(error)
            throw error
        }
    }
}