import { Doctor } from "@/modules/doctors/model/doctors.model";
import { BelongsTo, Column, DataType, ForeignKey, Model, Table } from "sequelize-typescript";

@Table({tableName: 'schedule', timestamps: true, paranoid: true})
export class Schedule extends Model {
    @ForeignKey(() => Doctor)
    @Column({type: DataType.INTEGER, allowNull: false})
    doctor_id: number;

    @BelongsTo(() => Doctor)
    doctor: Doctor;

    @Column({type: DataType.STRING, allowNull: false})
    work_day: string;

    @Column({type: DataType.TIME, allowNull: false})
    start_time: string;

    @Column({type: DataType.TIME, allowNull: false})
    end_time: string;
}