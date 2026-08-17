import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { User } from "./model/user.model";
import { UpdateUserDto } from "./dto/update-user.dto";
import { Doctor } from "../doctors/model/doctors.model";
import { Op } from 'sequelize'
import { UserStatus } from "@/core/constants/constants";

@Injectable()
export class UserService {
    constructor(
        @InjectModel(User) private readonly userModel: typeof User,
        @InjectModel(Doctor) private readonly doctorModel: typeof Doctor,
    ) { }

    async getUsers() {
        try {
            const users = await this.userModel.findAndCountAll({
                where: {
                    role: {
                        [Op.ne]: 'Admin'
                    }
                }
            })

            const countActive = await this.userModel.count({ where: { status: 'Active' } });
            const countInactive = await this.userModel.count({ where: { status: 'Inactive' } });
            const countDoctors = await this.userModel.count({ where: { role: 'Doctor' } });
            const countPatients = await this.userModel.count({ where: { role: 'User' } });

            return {
                success: true,
                users,
                countActive,
                countInactive,
                countDoctors,
                countPatients,
            }

        } catch (error) {
            console.log(error)
            throw error
        }
    }

    async getUser(id: string) {
        try {
            const users = await this.userModel.findAll({
                include: [Doctor],
                where: {
                    [Op.or]: [
                        { id: id },
                        { telegram_id: id }
                    ]
                }
            })

            return {
                success: true,
                users
            }

        } catch (error) {
            console.log(error)
            throw error
        }
    }

    async updateUser(id: string, dto: UpdateUserDto) {
        try {

            const user = await this.userModel.findOne({ where: { id } })

            if (!user) {
                throw new NotFoundException("User is not found")
            }

            await this.userModel.update(dto, { where: { id } })

            return {
                success: true,
                message: "Successfully updated"
            }

        } catch (error) {
            console.log(error)
            throw error
        }
    }

    // Unauthenticated by design (see the controller) — only ever meant to
    // let the verify-email flow clean up an account that never finished
    // OTP activation. Refusing anything but an Inactive account is what
    // keeps this safe to leave open.
    async cancelUnverifiedRegistration(id: string) {
        try {
            const user = await this.userModel.findOne({ where: { id } })

            if (!user) {
                throw new NotFoundException("User is not found")
            }

            if (user.dataValues.status !== UserStatus.inactive) {
                throw new ForbiddenException("This account is already active")
            }

            await this.doctorModel.destroy({ where: { user_id: id }, force: true })
            await this.userModel.destroy({ where: { id }, force: true })

            return {
                success: true,
                message: "Successfully deleted"
            }

        } catch (error) {
            console.log(error)
            throw error
        }
    }

    async deleteUser(id: string) {
        try {
            const user = await this.userModel.findOne({ where: { id } })

            if (!user) {
                throw new NotFoundException("User is not found")
            }

            // Explicit hard-delete cascade: Doctor is `paranoid: true`, so
            // its own destroy() only soft-deletes (sets deletedAt), and a
            // bulk `Model.destroy({ where })` call like the one below does
            // NOT run Sequelize's association-level cascade hooks (those
            // only fire for instance.destroy() with individualHooks) — so
            // without this, a deleted user's doctor row was left behind
            // instead of actually being removed. `force: true` bypasses
            // the paranoid flag so this is a real delete, not a soft one.
            await this.doctorModel.destroy({ where: { user_id: id }, force: true })
            await this.userModel.destroy({ where: { id }, force: true })

            return {
                success: true,
                message: "Successfully deleted"
            }

        } catch (error) {
            console.log(error)
            throw error
        }
    }
}