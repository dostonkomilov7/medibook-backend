import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { Doctor } from "./model/doctors.model";
import { CreateDoctorDto } from "./dto/create-doctor.dto";
import { UpdateDoctorDto } from "./dto/update-doctor.dto";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import type { Response } from "express";
import { UserRole } from "@/core/constants/constants";
import { User } from "../users/model/user.model";
import { Appointment } from "../appointments/model/appointments.model";

@Injectable()
export class DoctorService {
    constructor(
        @InjectModel(Doctor) private readonly doctorModel: typeof Doctor,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
    ) { }

    async getDoctors() {
        try {
            const doctors = await this.doctorModel.findAll({ include: [User] })
            const countActive = await this.doctorModel.count({
                include: [{
                    model: User,
                    where: { status: 'Active' }
                }]
            })
            
            const countInactive = await this.doctorModel.count({
                include: [{
                    model: User,
                    where: { status: 'Inactive' }
                }]
            })
            return {
                success: true,
                doctors,
                countActive,
                countInactive,
            }
            
        } catch (error) {
            console.log(error)
            throw error
        }
    }
    
    async getSingleDoctor(id: string) {
        try {
            const doctors = await this.doctorModel.findAll({ include: [User], where: { id } });

            return {
                success: true,
                doctors
            }
        } catch (error) {
            throw error
        }
    }

    async getDoctorWithPatients(id: string) {
        try {
            const doctorId = await this.doctorModel.findOne({ where: { user_id: id } });
            if(!doctorId) return {success: false, doctors: []}
            const doctors = await this.doctorModel.findAll({
                include: [
                    {
                        model: Appointment,
                        where: { doctor_id: doctorId?.id },
                        include: [{
                            model: User,
                        }],
                    }
                ]
            })

            // doctors.forEach(doctor => {
            //     doctor.dataValues.appointments = [
            //         ...new Map(
            //             doctor.dataValues.appointments.map((app: any) => [
            //                 app?.dataValues?.user?.dataValues?.id,
            //                 app
            //             ])
            //         ).values()
            //     ]
            // })

            return {
                success: true,
                doctors
            }

        } catch (error) {
            console.log(error)
            throw error
        }
    }

    async createDoctor(dto: CreateDoctorDto, res: Response) {
        try {
            const newDoctor = await this.doctorModel.create({
                specialization: dto.specialization,
                room_number: dto.room_number,
                experience: dto.experience,
                department: dto.department,
                bio: dto.bio,
                type: dto.type,
                user_id: dto.user_id,
            })

            // const accessToken = await this.generateAccessToken({ id: newDoctor.dataValues.user_id, role: UserRole.doctor })
            // const refreshToken = await this.generateRefreshToken({ id: newDoctor.dataValues.user_id, role: UserRole.doctor })

            // res.cookie('accessToken', accessToken, {
            //     signed: true,
            //     maxAge: this.configService.get('jwt.access_time') * 1000,
            // })

            // res.cookie('refreshToken', refreshToken, {
            //     signed: true,
            //     maxAge: 7 * 24 * 60 * 60 * 1000,
            // })

            return res.send({
                success: true,
                userId: newDoctor.id,
            })
        } catch (error) {
            console.log(error)
            throw error
        }
    }

    async updateDoctor(id: string, dto: UpdateDoctorDto) {
        try {
            const existing = await this.doctorModel.findByPk(id);

            if (!existing) {
                throw new NotFoundException("Doctor is not found")
            }

            await this.doctorModel.update(dto, { where: { id } })

            return {
                success: true,
                message: "Successfully updated"
            }
        } catch (error) {
            console.log(error)
            throw error
        }
    }

    async deleteDoctor(id: string) {
        try {
            const existing = await this.doctorModel.findByPk(id);

            if (!existing) {
                throw new NotFoundException("Doctor is not found")
            }

            await this.doctorModel.destroy({ where: { id } })

            return {
                success: true,
                message: "Successfully deleted"
            }
        } catch (error) {
            console.log(error)
            throw error
        }
    }
    private async generateAccessToken(payload: { id: string, role: UserRole }) {
        const token = await this.jwtService.signAsync(payload, {
            secret: this.configService.get('jwt.access_key'),
            expiresIn: this.configService.get('jwt.access_time')
        })

        return token
    }

    private async generateRefreshToken(payload: { id: string, role: UserRole }) {
        const token = await this.jwtService.signAsync(payload, {
            secret: this.configService.get('jwt.refresh_key'),
            expiresIn: this.configService.get('jwt.refresh_time')
        })

        return token
    }
}