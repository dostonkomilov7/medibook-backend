import { UserRole, UserStatus } from "@/core/constants/constants";
import { Appointment } from "@/modules/appointments/model/appointments.model";
import { Doctor } from "@/modules/doctors/model/doctors.model";
import { Column, DataType, HasMany, Model, Table } from "sequelize-typescript"

@Table({ tableName: 'users', timestamps: true, paranoid: true })
export class User extends Model {
    @Column({ type: DataType.STRING, allowNull: false })
    full_name: string;

    @Column({ type: DataType.DATEONLY, allowNull: true })
    age: string;

    @Column({ type: DataType.STRING, allowNull: false, unique: true })
    email: string

    @Column({ type: DataType.STRING, allowNull: false })
    password: string;

    @Column({ type: DataType.STRING, allowNull: false, unique: true })
    phone: string;

    @Column({ type: DataType.STRING(6), allowNull: true })
    otp: string;

    @Column({type: DataType.STRING, allowNull: true, unique: true})
    telegram_id: string;
    
    @Column({type: DataType.STRING, allowNull: true, unique: true})
    chat_id: string;

    @Column({ type: DataType.ENUM(...Object.values(UserRole)), defaultValue: UserRole.user })
    role: UserRole;

    @Column({ type: DataType.ENUM(...Object.values(UserStatus)), defaultValue: UserStatus.inactive })
    status: UserStatus;

    @HasMany(() => Doctor, {
        onDelete: 'CASCADE',
        hooks: true
    })
    doctors: Doctor;

    @HasMany(() => Appointment)
    appointments: Appointment[]
}