import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { User } from "../users/model/user.model";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { UserRole, UserStatus } from "@/core/constants/constants";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import bcrypt from "bcrypt"
import { SigantureService } from "@/core/config/signature.service";
import { Signature } from "signed"
import { MailerService } from "@/core/mail/mailer.service";
import type { Response } from 'express'

@Injectable()
export class AuthService {
    private readonly signature: Signature;
    private readonly BASE_URL = process.env.BASE_URL;
    constructor(
        @InjectModel(User) private readonly userModel: typeof User,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        private readonly signatureService: SigantureService,
        private readonly mailerService: MailerService,

    ) { this.signature = this.signatureService.getSignature(); }

    async register(dto: RegisterDto, res: Response) {
        try {
            const existingEmail = await this.userModel.findOne({ where: { email: dto.email } });
            const existingPhone = await this.userModel.findOne({ where: { phone: dto.phone } });

            if (existingEmail || existingPhone) {
                res.send({
                    success: false,
                    message: "User has already existed"
                })
                throw new ConflictException('User has already exist')
            }

            const hashedPassword = await this.hashPassword(dto.password)
            const activationCode = Math.floor(100000 + Math.random() * 900000);

            const newUser = await this.userModel.create({
                full_name: dto.full_name,
                age: dto.age || null,
                email: dto.email,
                phone: dto.phone,
                password: hashedPassword,
                otp: activationCode,
                role: dto.role,
                status: UserStatus.inactive,
            })

            // const fullUrl = `${this.BASE_URL}/auth/activate?userId=${newUser.id}`
            // const activationUrl = this.signature.sign(fullUrl, {
            //     ttl: 24 * 60 * 60,
            // })

            this.mailerService.sendActivationCode({
                user: newUser.dataValues,
                activationCode: activationCode,
            })

            return res.send({
                success: true,
                userId: newUser.id,
                role: newUser.dataValues.role,
            })

        } catch (error) {
            console.log(error)
            throw error
        }
    }

    async login(dto: LoginDto, res: Response) {
        try {
            const existingUser = await this.userModel.findOne({ where: { email: dto.email } });

            if (!existingUser) {
                res.send({
                    success: false,
                    message: "User is not found"
                })
                throw new NotFoundException('User is not found')
            }

            const isSame = await this.comparePassword(dto.password, existingUser.dataValues.password)

            if (!isSame) {
                res.send({
                    success: false,
                    message: "Password is invalid"
                })
                throw new ConflictException('Password is invalid')
            }

            const accessToken = await this.generateAccessToken({ id: existingUser.dataValues.id, role: existingUser.dataValues.role })
            const refreshToken = await this.generateRefreshToken({ id: existingUser.dataValues.id, role: existingUser.dataValues.role })

            res.cookie('accessToken', accessToken, {
                signed: true,
                httpOnly: true,
                maxAge: this.configService.get('jwt.access_time') * 1000,
            })

            res.cookie('refreshToken', refreshToken, {
                signed: true,
                httpOnly: true,
                maxAge: 7 * 24 * 60 * 60 * 1000,
            })

            return res.send({
                success: true,
                accessToken,
                refreshToken,
                userId: existingUser.id,
                role: existingUser.dataValues.role
            })

        } catch (error) {
            console.log(error)
            throw error
        }
    }

    async activateUser(email: string, code: string, res: Response) {
        const existingUser = await this.userModel.findOne({ where: { email } });
        console.log(code)
        console.log(email)
        if (!existingUser) {
            res.send({
                success: false,
                message: "User is not found"
            })
            throw new NotFoundException("User is not found")
        }

        if (code !== existingUser.dataValues.otp) {
            res.send({
                success: false,
                message: "Otp is invalid"
            })
            throw new ConflictException("Otp is invalid")
        }

        if (existingUser.dataValues.createdAt + (10 * 60 * 1000) < Date.now()) {
            await this.userModel.update({ otp: null }, { where: { email } })
            res.send({
                success: false,
                message: "Otp has expired"
            })
            throw new ConflictException("Otp is expired")
        }

        await this.userModel.update({ status: UserStatus.active, otp: null }, { where: { email } })
        const accessToken = await this.generateAccessToken({ id: existingUser.dataValues.id, role: existingUser.dataValues.role })
        const refreshToken = await this.generateRefreshToken({ id: existingUser.dataValues.id, role: existingUser.dataValues.role })

        res.cookie('accessToken', accessToken, {
            signed: true,
            httpOnly: true,
            maxAge: this.configService.get('jwt.access_time') * 1000,
        })

        res.cookie('refreshToken', refreshToken, {
            signed: true,
            httpOnly: true,
            maxAge: 7 * 24 * 60 * 60 * 1000,
        })

        res.send({
            success: true,
            accessToken,
            refreshToken,
            userId: existingUser.id,
            role: existingUser.dataValues.role,
        })
    }

    async forgotPassword(email: string) {

    }

    async resetPassword(id: string, password: string) {

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

    private async hashPassword(password: string) {
        const hashedPassword = await bcrypt.hash(password, 10);

        return hashedPassword
    }
    private async comparePassword(originalPassword: string, hashedPassword: string) {
        const isSame = await bcrypt.compare(originalPassword, hashedPassword);

        return isSame
    }
}