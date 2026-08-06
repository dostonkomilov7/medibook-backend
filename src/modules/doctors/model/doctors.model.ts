import { DoctorStatus } from "@/core/constants/constants";
import { Appointment } from "@/modules/appointments/model/appointments.model";
import { Schedule } from "@/modules/schedule/model/schedule.model";
import { User } from "@/modules/users/model/user.model";
import { BelongsTo, Column, DataType, ForeignKey, HasMany, Model, Table } from "sequelize-typescript";

@Table({ tableName: 'doctors', timestamps: true, paranoid: true })
export class Doctor extends Model {
    @Column({ type: DataType.STRING, allowNull: false })
    specialization: string;

    @Column({ type: DataType.STRING, allowNull: false })
    department: string;

    @Column({ type: DataType.STRING, defaultValue: 'no experience' })
    experience: string;

    @Column({ type: DataType.STRING, allowNull: true })
    bio: string;

    @Column({ type: DataType.STRING, allowNull: true })
    type: string;

    @Column({ type: DataType.ENUM(...Object.values(DoctorStatus)), defaultValue: DoctorStatus.active })
    status: DoctorStatus;

    @Column({ type: DataType.INTEGER, allowNull: true })
    room_number: number;

    @ForeignKey(() => User)
    @Column({ type: DataType.INTEGER, allowNull: false })
    user_id: number

    @BelongsTo(() => User)
    user: User

    @HasMany(() => Appointment)
    appointments: Appointment[]

    @HasMany(() => Schedule, {
        onDelete: 'CASCADE',
        hooks: true
    })
    schedules: Schedule[]
}