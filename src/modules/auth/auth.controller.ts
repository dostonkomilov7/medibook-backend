import { Body, Controller, Post, Res } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { GoogleLoginDto } from "./dto/google-login.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import type { Response } from "express";

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post('register')
    async register(@Body() dto: RegisterDto, @Res() res: Response) {
        return this.authService.register(dto, res)
    }

    @Post('login')
    async login(@Body() dto: LoginDto, @Res() res: Response) {
        return this.authService.login(dto, res)
    }

    @Post('google')
    async googleLogin(@Body() dto: GoogleLoginDto, @Res() res: Response) {
        return this.authService.googleLogin(dto.idToken, res)
    }

    @Post('logout')
    async logout(@Res() res: Response) {
        return this.authService.logout(res)
    }

    @Post('activate')
    async activateUser(@Body('email') email: string, @Body('code') code: string, @Res() res: Response) {
        return this.authService.activateUser(email, code, res)
    }

    @Post('forgot-password')
    async forgotPassword(@Body() dto: ForgotPasswordDto) {
        return this.authService.forgotPassword(dto.email)
    }

    @Post('reset-password')
    async resetPassword(@Body() dto: ResetPasswordDto) {
        return this.authService.resetPassword(dto.token, dto.password)
    }
}
