import { HealthMetricType } from "@/core/constants/constants";
import { User } from "@/modules/users/model/user.model";
import { BelongsTo, Column, DataType, ForeignKey, Model, Table } from "sequelize-typescript";

// One row per (patient_id, type) — editing a metric overwrites its
// current value rather than accumulating a history log, matching how
// the dashboard shows a single current reading per metric type.
@Table({ tableName: 'health_metrics', timestamps: true })
export class HealthMetric extends Model {
    @ForeignKey(() => User)
    @Column({ type: DataType.INTEGER, allowNull: false, unique: 'patient_metric_type' })
    patient_id: number;

    @BelongsTo(() => User)
    patient: User;

    @Column({ type: DataType.ENUM(...Object.values(HealthMetricType)), allowNull: false, unique: 'patient_metric_type' })
    type: HealthMetricType;

    @Column({ type: DataType.STRING, allowNull: false })
    value: string;

    @Column({ type: DataType.STRING, allowNull: true })
    unit: string;

    @Column({ type: DataType.DATE, allowNull: true })
    recordedAt: Date;
}
