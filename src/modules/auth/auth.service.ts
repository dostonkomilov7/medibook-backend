import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { User } from "../users/model/user.model";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { UserRole, UserStatus } from "@/core/constants/constants";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import bcrypt from "bcrypt"
import { randomBytes } from "crypto"
import { SigantureService } from "@/core/config/signature.service";
import { Signature, ExpiredSignatureError } from "signed"
import { MailerService } from "@/core/mail/mailer.service";
import { OAuth2Client } from "google-auth-library"
import type { Response } from 'express'

@Injectable()
export class AuthService {
    private readonly signature: Signature;
    // Where the *frontend* reset-password page lives — the signed link
    // emailed to users has to point there, not at this API.
    private readonly FRONT_URL = process.env.FRONT_URL || 'http://localhost:3000';
    private readonly googleClient: OAuth2Client;

    constructor(
        @InjectModel(User) private readonly userModel: typeof User,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        private readonly signatureService: SigantureService,
        private readonly mailerService: MailerService,

    ) {
        this.signature = this.signatureService.getSignature();
        this.googleClient = new OAuth2Client(this.configService.get('google.client_id'));
    }

    async register(dto: RegisterDto, res: Response) {
        try {
            const existingEmail = await this.userModel.findOne({ where: { email: dto.email } });
            const existingPhone = await this.userModel.findOne({ where: { phone: dto.phone } });

            if (existingEmail || existingPhone) {
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
                throw new NotFoundException('User is not found')
            }

            const isSame = await this.comparePassword(dto.password, existingUser.dataValues.password)

            if (!isSame) {
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

    // "Continue with Google" — the frontend gets an ID token from Google
    // Identity Services and hands it to us; we verify it was really issued
    // by Google for our client ID (not just decode it) before trusting any
    // of its claims. Finds-or-creates the account and logs in exactly like
    // a normal email/password login (same cookies, same response shape).
    async googleLogin(idToken: string, res: Response) {
        try {
            const ticket = await this.googleClient.verifyIdToken({
                idToken,
                audience: this.configService.get('google.client_id'),
            });
            const payload = ticket.getPayload();

            if (!payload?.email) {
                throw new UnauthorizedException("Invalid Google token");
            }

            let existingUser = await this.userModel.findOne({ where: { email: payload.email } });

            if (!existingUser) {
                // Google already verified this email, so there's no OTP step
                // to run. There's no phone number or usable password either —
                // a random, never-shown hash keeps the `password` column
                // satisfied without producing a guessable/usable password.
                const randomPassword = await this.hashPassword(randomBytes(32).toString('hex'));
                existingUser = await this.userModel.create({
                    full_name: payload.name || payload.email.split('@')[0],
                    email: payload.email,
                    password: randomPassword,
                    role: UserRole.user,
                    status: UserStatus.active,
                    google_id: payload.sub,
                });
            } else {
                const updates: Partial<{ google_id: string; status: UserStatus }> = {};
                // Existing email/password account signing in with Google for
                // the first time — link it instead of creating a duplicate.
                if (!existingUser.dataValues.google_id) updates.google_id = payload.sub;
                // An account that never finished OTP activation — Google's
                // already-verified email is good enough to trust it now.
                if (existingUser.dataValues.status !== UserStatus.active) updates.status = UserStatus.active;
                if (Object.keys(updates).length) await existingUser.update(updates);
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
                userId: existingUser.dataValues.id,
                role: existingUser.dataValues.role,
            })
        } catch (error) {
            console.log(error)
            throw error instanceof UnauthorizedException ? error : new UnauthorizedException("Google sign-in failed")
        }
    }

    async logout(res: Response) {
        res.clearCookie('accessToken')
        res.clearCookie('refreshToken')
        return res.send({ success: true, message: "Logged out" })
    }

    async activateUser(email: string, code: string, res: Response) {
        const existingUser = await this.userModel.findOne({ where: { email } });

        if (!existingUser) {
            throw new NotFoundException("User is not found")
        }

        if (code !== existingUser.dataValues.otp) {
            throw new ConflictException("Otp is invalid")
        }

        if (existingUser.dataValues.createdAt + (10 * 60 * 1000) < Date.now()) {
            await this.userModel.update({ otp: null }, { where: { email } })
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
        try {
            const existingUser = await this.userModel.findOne({ where: { email } });

            // Deliberately the same response whether or not the email is
            // registered — confirming/denying an account's existence here
            // would let anyone enumerate real user emails.
            if (!existingUser) {
                return { success: true, message: "If that email is registered, we've sent a password reset link." };
            }

            const ttlSeconds = 15 * 60;
            const resetUrl = `${this.FRONT_URL}/reset-password?userId=${existingUser.dataValues.id}`;
            const signedUrl = this.signature.sign(resetUrl, { ttl: ttlSeconds });

            await this.mailerService.sendResetPassword({
                user: existingUser.dataValues,
                resetUrl: signedUrl,
                expirationMinutes: 15,
            })

            return { success: true, message: "If that email is registered, we've sent a password reset link." };
        } catch (error) {
            console.log(error)
            throw error
        }
    }

    async resetPassword(token: string, password: string) {
        try {
            // Reconstruct the exact URL that was signed in forgotPassword()
            // above — the signature covers the full string, so the token
            // (everything after "?") has to be replayed verbatim.
            const urlToVerify = `${this.FRONT_URL}/reset-password?${token}`;
            let originalUrl: string;
            try {
                originalUrl = this.signature.verify(urlToVerify);
            } catch (error) {
                if (error instanceof ExpiredSignatureError) {
                    throw new ConflictException("Reset link has expired");
                }
                throw new ConflictException("Reset link is invalid");
            }

            const userId = new URL(originalUrl).searchParams.get('userId');
            if (!userId) {
                throw new ConflictException("Reset link is invalid");
            }

            const existingUser = await this.userModel.findByPk(userId);
            if (!existingUser) {
                throw new NotFoundException("User is not found");
            }

            const hashedPassword = await this.hashPassword(password);
            await this.userModel.update({ password: hashedPassword }, { where: { id: userId } });

            return { success: true, message: "Password has been reset successfully" };
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

    private async hashPassword(password: string) {
        const hashedPassword = await bcrypt.hash(password, 10);

        return hashedPassword
    }
    private async comparePassword(originalPassword: string, hashedPassword: string) {
        const isSame = await bcrypt.compare(originalPassword, hashedPassword);

        return isSame
    }
}
