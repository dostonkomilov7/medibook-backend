import { Module } from "@nestjs/common";
import { SequelizeModule } from "@nestjs/sequelize";
import { User } from "../users/model/user.model";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { JwtModule, JwtService } from "@nestjs/jwt";
import { MailerService } from "@/core/mail/mailer.service";
import { SigantureService } from "@/core/config/signature.service";

@Module({
    imports: [
        SequelizeModule.forFeature([User]),
        JwtModule.register({
            global: true,
            secret: process.env.ACCESS_TOKEN_KEY,
            signOptions: { expiresIn: Number(process.env.ACCESS_TOKEN_EXPIRE) }
        }),
    ],
    controllers: [AuthController],
    providers: [AuthService, MailerService, SigantureService],
})

export class AuthModule { }