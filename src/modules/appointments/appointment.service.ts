import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectConnection, InjectModel } from "@nestjs/sequelize";
import { Sequelize } from "sequelize-typescript";
import { Appointment } from "./model/appointments.model";
import { CreateAppointmentDto } from "./dto/create-appointment.dto";
import { UpdateAppointmentDto } from "./dto/update.appointment.dto";
import { User } from "../users/model/user.model";
import { Doctor } from "../doctors/model/doctors.model";
import { AppointmentStatus, AppointmentUrgency, UserRole } from "@/core/constants/constants";
import { AuthUser } from "@/common/decorators/current-user.decorator";
import { Op } from "sequelize";
import { BotService } from "../telegram/bot.service";
import { UserService } from "../users/user.service";
import { DoctorService } from "../doctors/doctors.service";
import { isInThePast, isValidCalendarDate, resolveClinicTimeZone, timeToMinutes } from "./appointment-time.util";

// Forward-only: Pending -> Confirmed -> Completed. Cancelling goes through
// deleteAppointment, and Completed/Cancelled are final.
const NEXT_STATUS: Partial<Record<AppointmentStatus, AppointmentStatus>> = {
    [AppointmentStatus.PENDING]: AppointmentStatus.CONFIRMED,
    [AppointmentStatus.CONFIRMED]: AppointmentStatus.COMPLETED,
}

// One plain row of the findAll in getManagementList (only the selected columns).
interface ManagementRow {
    id: number
    status: AppointmentStatus
    appointment_date: string
    appointment_time: string
    urgency: AppointmentUrgency
    reason: string | null
    user?: { id: number, full_name: string, phone: string | null }
    doctor?: { id: number, specialization: string, user?: { full_name: string } }
}

@Injectable()
export class AppointmentService {
    private readonly logger = new Logger(AppointmentService.name);

    constructor(
        @InjectModel(Appointment) private readonly appointmentModel: typeof Appointment,
        @InjectModel(Doctor) private readonly doctorModel: typeof Doctor,
        @InjectConnection() private readonly sequelize: Sequelize,
        private readonly userService: UserService,
        private readonly doctorService: DoctorService,
        private readonly botService: BotService,
    ) { }

    // Admin pages get the full rows (site-wide stats). Everyone else — in
    // practice the booking wizard checking which slots are taken — only gets
    // the columns that say "this doctor is busy then", never who the patient
    // is or why they are coming.
    async getAppointment(user: AuthUser) {
        const appointments = await this.appointmentModel.findAll(
            user.role === UserRole.admin
                ? {}
                : { attributes: ['id', 'doctor_id', 'appointment_date', 'appointment_time', 'status'] }
        )

        return {
            appointments
        }
    }

    // One flat row per appointment for the admin "Appointment Management"
    // table. Only the columns the table shows are selected for the patient
    // and the doctor's account.
    async getManagementList() {
        try {
            const rows = await this.appointmentModel.findAll({
                attributes: ['id', 'status', 'appointment_date', 'appointment_time', 'urgency', 'reason'],
                include: [
                    { model: User, attributes: ['id', 'full_name', 'phone'] },
                    {
                        model: Doctor,
                        attributes: ['id', 'specialization'],
                        include: [{ model: User, attributes: ['id', 'full_name'] }]
                    }
                ],
                order: [['appointment_date', 'DESC'], ['createdAt', 'DESC']]
            })

            const appointments = rows.map((row) => {
                const a = row.get({ plain: true }) as ManagementRow

                return {
                    id: a.id,
                    status: a.status,
                    appointment_date: a.appointment_date,
                    appointment_time: a.appointment_time,
                    urgency: a.urgency,
                    reason: a.reason,
                    patient: {
                        id: a.user?.id,
                        full_name: a.user?.full_name,
                        phone: a.user?.phone,
                    },
                    doctor: {
                        id: a.doctor?.id,
                        full_name: a.doctor?.user?.full_name,
                        specialization: a.doctor?.specialization,
                    },
                }
            })

            return {
                success: true,
                appointments
            }

        } catch (error) {
            console.log(error)
            throw error
        }
    }

    // `id` is the patient whose appointments are listed. No access check here
    // on purpose: the Telegram bot calls this for the user it has already
    // identified, so the HTTP controller does the self-or-admin check.
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

    async createAppointment(dto: CreateAppointmentDto, user: AuthUser) {
        try {
            await this.assertCanBook(user, dto)

            this.assertSlotIsInTheFuture(dto.appointment_date, dto.appointment_time)

            const appointment = await this.sequelize.transaction(async (transaction) => {
                // Row-locking the doctor makes simultaneous bookings for the
                // same doctor queue up here, so the "is this slot taken?"
                // check below can't be raced by a second request.
                const lockedDoctor = await this.doctorModel.findByPk(dto.doctor_id, {
                    transaction,
                    lock: transaction.LOCK.UPDATE,
                })

                if (!lockedDoctor) {
                    throw new NotFoundException("Doctor is not found")
                }

                // A cancelled appointment frees its slot again.
                const sameDay = await this.appointmentModel.findAll({
                    attributes: ['appointment_time'],
                    where: {
                        doctor_id: dto.doctor_id,
                        appointment_date: dto.appointment_date,
                        status: { [Op.ne]: AppointmentStatus.CANCELLED }
                    },
                    transaction,
                })

                if (this.isSlotTaken(sameDay, dto.appointment_time)) {
                    throw new ConflictException("This time slot is already booked")
                }

                return await this.appointmentModel.create({
                    patient_id: dto.patient_id,
                    doctor_id: dto.doctor_id,
                    appointment_date: dto.appointment_date,
                    appointment_time: dto.appointment_time,
                    reason: dto.reason,
                    notes: dto.notes,
                    urgency: dto.urgency,
                    status: AppointmentStatus.PENDING
                }, { transaction })
            })

            await this.notifyParticipants(dto.patient_id, dto.doctor_id, {
                doctor: `You have an new appointment 🆕\n\n Please, check and respond to the appointment in the website ✅.\n\n\n Thank You Mr Doctor😊`,
                patient: `Appointment successfully created 🎉\n\n Now, status is pending ⏳. We will respond soon`,
            })

            return {
                success: true,
                message: "Successfully created",
                appointment: { id: appointment.id }
            }

        } catch (error) {
            console.log(error)
            throw error
        }
    }

    // Without a body this advances the appointment one step (the doctor
    // panels call it that way); with `{ status }` the status has to be that
    // same next step, so a stale or hand-made request can't skip or undo one.
    async updateAppointment(id: string, dto: UpdateAppointmentDto | undefined, user: AuthUser) {
        try {
            const existing = await this.appointmentModel.findByPk(id)

            if (!existing) {
                throw new NotFoundException("Appointment is not found")
            }

            // Confirming / completing is for staff: the appointment's own doctor or an admin.
            await this.assertCanTouch(user, existing, true)

            const current = existing.get('status')
            const next = NEXT_STATUS[current]

            if (!next) {
                throw new BadRequestException(`A ${current.toLowerCase()} appointment can't be changed`)
            }

            if (dto?.status === AppointmentStatus.CANCELLED) {
                throw new BadRequestException("Use DELETE /appointments/:id to cancel an appointment")
            }

            if (dto?.status && dto.status !== next) {
                throw new BadRequestException(`Appointment can't move from ${current} to ${dto.status}`)
            }

            // Matching on the status we just read keeps two simultaneous
            // changes from both "succeeding" (and both notifying).
            const [changed] = await this.appointmentModel.update({ status: next }, { where: { id, status: current } })

            if (!changed) {
                throw new ConflictException("Appointment status has just changed, please refresh")
            }

            await this.notifyParticipants(
                existing.get('patient_id'),
                existing.get('doctor_id'),
                next === AppointmentStatus.CONFIRMED
                    ? {
                        doctor: `You have confirmed appointment 🎉\n\n Check the appointment.`,
                        patient: `Appointment has been confirmed 🎉\n\n Now, status is confirmed ✅. Check the appointment.`,
                    }
                    : {
                        doctor: `You have successfully completed an appointment 🎉\n\n We wish you success in your work 🤝🏻`,
                        patient: `Appointment has been completed 🎉\n\n We are glad for working with you. Thank You for your choice 😊`,
                    },
            )

            return {
                success: true,
                message: "Appointment has been successfully updated"
            }

        } catch (error) {
            console.log(error)
            throw error
        }
    }

    // Soft cancel: the row stays (history, stats) and only its status
    // changes. Only appointments that are still open can be cancelled, and
    // only by the patient it belongs to, its doctor, or an admin.
    async deleteAppointment(id: string, user: AuthUser) {
        try {
            const existing = await this.appointmentModel.findByPk(id)

            if (!existing) {
                throw new NotFoundException("Appointment is not found")
            }

            await this.assertCanTouch(user, existing)

            const current = existing.get('status')

            if (current === AppointmentStatus.CANCELLED) {
                throw new BadRequestException("Appointment is already cancelled")
            }

            if (current === AppointmentStatus.COMPLETED) {
                throw new BadRequestException("A completed appointment can't be cancelled")
            }

            const [changed] = await this.appointmentModel.update({ status: AppointmentStatus.CANCELLED }, { where: { id, status: current } })

            if (!changed) {
                throw new ConflictException("Appointment status has just changed, please refresh")
            }

            return {
                success: true,
                message: "Appointment has been successfully cancelled"
            }

        } catch (error) {
            console.log(error)
            throw error
        }
    }

    // Who may put an appointment on the calendar: a patient for themself, a
    // doctor into their own calendar (the schedule page), an admin for anyone.
    private async assertCanBook(user: AuthUser, dto: CreateAppointmentDto) {
        if (user.role === UserRole.admin) return

        if (user.role === UserRole.user && String(dto.patient_id) === String(user.id)) return

        if (user.role === UserRole.doctor && await this.isOwnDoctorRecord(user, dto.doctor_id)) return

        throw new ForbiddenException("Access denied")
    }

    // Who may act on an existing appointment: an admin, the doctor it is
    // booked with and — unless `staffOnly` — the patient it belongs to.
    private async assertCanTouch(user: AuthUser, appointment: Appointment, staffOnly = false) {
        if (user.role === UserRole.admin) return

        if (!staffOnly && user.role === UserRole.user && String(appointment.get('patient_id')) === String(user.id)) return

        if (user.role === UserRole.doctor && await this.isOwnDoctorRecord(user, appointment.get('doctor_id'))) return

        throw new ForbiddenException("Access denied")
    }

    // The JWT carries the user's id; appointments point at the doctors table.
    private async isOwnDoctorRecord(user: AuthUser, doctorId: number | string) {
        const own = await this.doctorModel.findOne({ where: { user_id: user.id }, attributes: ['id'] })

        return !!own && String(own.get('id')) === String(doctorId)
    }

    // Telegram is a courtesy channel. By the time this runs the booking or
    // status change is already saved, so a blocked bot, an unlinked chat or an
    // API hiccup is logged and swallowed instead of turning a success into a
    // 500 (the client would retry and run into the "slot already booked" check
    // against its own booking).
    private async notifyParticipants(patientId: number | string, doctorId: number | string, messages: { doctor: string, patient: string }) {
        let doctorChatId: string | null | undefined
        let patientChatId: string | null | undefined

        try {
            const user = await this.userService.getUser(String(patientId))
            const doctor = await this.doctorService.getSingleDoctor(String(doctorId))

            patientChatId = user.users[0]?.dataValues.telegram_id
            doctorChatId = doctor.doctors[0]?.dataValues.user.dataValues.telegram_id
        } catch (error) {
            this.logger.warn(`Could not look up Telegram ids: ${error instanceof Error ? error.message : String(error)}`)
            return
        }

        await this.sendTelegram(doctorChatId, messages.doctor)
        await this.sendTelegram(patientChatId, messages.patient)
    }

    private async sendTelegram(chatId: string | null | undefined, text: string) {
        if (!chatId) return

        try {
            await this.botService.sendMessage(chatId, text)
        } catch (error) {
            this.logger.warn(`Telegram message to ${chatId} failed: ${error instanceof Error ? error.message : String(error)}`)
        }
    }

    private assertSlotIsInTheFuture(date: string, time: string) {
        if (!isValidCalendarDate(date)) {
            throw new BadRequestException("appointment_date is not a valid calendar date")
        }

        // CLINIC_TIMEZONE is optional; the default is the clinic's own zone.
        const timeZone = resolveClinicTimeZone(process.env.CLINIC_TIMEZONE)

        if (isInThePast(date, time, timeZone)) {
            throw new BadRequestException("Appointments can't be booked in the past")
        }
    }

    // Compares the times as minutes, not as strings, so "9:30 AM" and a
    // stored "09:30 am" count as the same slot.
    private isSlotTaken(sameDay: Appointment[], time: string) {
        const wanted = timeToMinutes(time)

        return sameDay.some((row) => {
            const stored: string = row.get('appointment_time')
            const storedMinutes = timeToMinutes(stored)

            return wanted !== null && storedMinutes !== null
                ? storedMinutes === wanted
                : stored === time
        })
    }
}
