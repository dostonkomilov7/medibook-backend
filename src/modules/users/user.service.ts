import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { User } from "./model/user.model";
import { UpdateUserDto } from "./dto/update-user.dto";
import { Doctor } from "../doctors/model/doctors.model";
import { Op } from 'sequelize'

@Injectable()
export class UserService {
    constructor(@InjectModel(User) private readonly userModel: typeof User) { }

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

    async deleteUser(id: string) {
        try {
            const user = await this.userModel.findOne({ where: { id } })

            if (!user) {
                throw new NotFoundException("User is not found")
            }

            await this.userModel.destroy({ where: { id } })

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