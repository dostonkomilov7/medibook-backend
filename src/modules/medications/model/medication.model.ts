import { User } from "@/modules/users/model/user.model";
import { BelongsTo, Column, DataType, ForeignKey, Model, Table } from "sequelize-typescript";

@Table({ tableName: 'medications', timestamps: true, paranoid: true })
export class Medication extends Model {
    @ForeignKey(() => User)
    @Column({ type: DataType.INTEGER, allowNull: false })
    patient_id: number;

    @BelongsTo(() => User)
    patient: User;

    @Column({ type: DataType.STRING, allowNull: false })
    name: string;

    @Column({ type: DataType.STRING, allowNull: false })
    schedule: string;

    @Column({ type: DataType.STRING, allowNull: true })
    notes: string;
}
