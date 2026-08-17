export enum UserStatus {
    active = 'Active',
    inactive = 'Inactive',
}

export enum DoctorStatus {
    active = 'Active',
    inactive = 'inactive',
    suspended = 'Suspended'
}

export enum UserRole {
    admin = 'Admin',
    doctor = 'Doctor',
    user = 'User',
}

export enum AppointmentStatus {
    PENDING = 'Pending',
    CONFIRMED = 'Confirmed',
    CANCELLED = 'Cancelled',
    COMPLETED = 'Completed',
}

export enum AppointmentUrgency {
    ROUTINE = 'Routine',
    SOON = 'Soon',
    URGENT = 'Urgent',
}

export enum HealthMetricType {
    bloodPressure = 'bloodPressure',
    heartRate = 'heartRate',
    bloodSugar = 'bloodSugar',
    bmi = 'bmi',
    weight = 'weight',
    cholesterol = 'cholesterol',
}

