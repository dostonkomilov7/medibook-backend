import { Body, Controller, Get, Param, Post, Query, Res } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
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

    @Post('activate')
    async activateUser(@Body('email') email: string, @Body('code') code: string, @Res() res: Response) {
        return this.authService.activateUser(email, code, res)
    }

    @Post('forgot-password')
    async forgotPassword(@Body() email: string) {
        return this.authService.forgotPassword(email)
    }

    @Post('reset-password')
    async resetPassword(@Query('id') id: string, @Body() password: string) {
        return this.authService.resetPassword(id, password)
    }
}