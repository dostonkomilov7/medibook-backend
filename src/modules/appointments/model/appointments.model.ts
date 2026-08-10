import { AppointmentStatus } from "@/core/constants/constants";
import { Doctor } from "@/modules/doctors/model/doctors.model";
import { User } from "@/modules/users/model/user.model";
import { BelongsTo, Column, DataType, ForeignKey, Model, Table } from "sequelize-typescript";

@Table({tableName: 'appointments', timestamps: true })
export class Appointment extends Model {
    @ForeignKey(() => User)
    @Column({type: DataType.INTEGER, allowNull: false})
    patient_id: number;

    @BelongsTo(() => User)
    user: User;
    
    @ForeignKey(() => Doctor)
    @Column({type: DataType.INTEGER, allowNull: false})
    doctor_id: number;

    @BelongsTo(() => Doctor)
    doctor: Doctor;

    @Column({type: DataType.DATEONLY, allowNull: false})
    appointment_date: string;

    @Column({type: DataType.STRING, allowNull: false})
    appointment_time: string;

    @Column({type: DataType.ENUM(...Object.values(AppointmentStatus)), defaultValue: AppointmentStatus.PENDING})
    status: AppointmentStatus;

    @Column({type: DataType.STRING, allowNull: true})
    reason: string;

    @Column({type: DataType.TEXT, allowNull: true})
    notes: string;

}