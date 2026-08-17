import { CanActivate, ConflictException, ExecutionContext, Injectable, InternalServerErrorException, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import { JsonWebTokenError, JwtService, TokenExpiredError } from "@nestjs/jwt";
import { PROTECTED_KEY } from "../decorators/protected.decorator";
import type { Request, Response } from "express";
import { UserRole } from "@/core/constants/constants";

@Injectable()
export class AuthGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService
    ) { }

    async canActivate(context: ExecutionContext) {
        const isProtected = this.reflector.get<boolean>(PROTECTED_KEY, context.getHandler())

        if (!isProtected) return true

        const ctx = context.switchToHttp()
        const request = ctx.getRequest<Request & { user: any }>()
        const response = ctx.getResponse<Response>()

        // Login/activateUser set these cookies with `signed: true`, which
        // makes cookie-parser move them into req.signedCookies (verified,
        // "s:"-prefix stripped) instead of req.cookies — req.cookies never
        // sees them at all. Reading from req.cookies here meant accessToken
        // and refreshToken were always undefined, so every @Protected()
        // route unconditionally threw "Token is not given". That's why it
        // had been commented out on almost every route in the codebase.
        const accessToken = request.signedCookies?.['accessToken']
        const refreshToken = request.signedCookies?.['refreshToken']

        if (!accessToken || !refreshToken) {
            throw new UnauthorizedException("Token is not given")
        }

        const decoded = await this.verifyAndRefreshToken(accessToken, refreshToken, response);
        request.user = decoded;

        return true
    }

    private async verifyAndRefreshToken(
        accessToken: string | undefined,
        refreshToken: string | undefined,
        response: Response
    ) {
        if (accessToken) {
            try {
                return await this.verifyToken(accessToken)
            } catch (error) {
                if(error instanceof TokenExpiredError && refreshToken) {
                    return await this.refreshAccessToken(refreshToken, response)
                }

                if(error instanceof JsonWebTokenError) {
                    throw new ConflictException("Access token is invalid")
                }

                throw error
            }
        }

        if(refreshToken){
            return await this.refreshAccessToken(refreshToken, response)
        }
    }

    private async verifyToken(token: string) {
        try {
            const payload = await this.jwtService.verify(token, {
                secret: this.configService.get('jwt.access_key')
            })

            return payload

        } catch (error) {
            if (error instanceof TokenExpiredError) {
                throw error
            }

            if (error instanceof JsonWebTokenError) {
                throw new ConflictException("Access token is invalid")
            }

            throw new InternalServerErrorException()
        }
    }

    private async refreshAccessToken(token: string, response: Response) {
        try {
            const payload = await this.jwtService.verify(token, {
                secret: this.configService.get('jwt.refresh_key')
            })

            const newAccessToken = await this.generateAccessToken(payload)

            response.cookie('accessToken', newAccessToken, {
                signed: true,
                httpOnly: true,
                expires: new Date(
                    Date.now() + (this.configService.get('jwt.access_time')) * 1000,
                )
            })

            return payload

        } catch (error) {
            if (error instanceof TokenExpiredError) {
                throw new ConflictException("Refresh Token is expired")
            }

            if (error instanceof JsonWebTokenError) {
                throw new ConflictException("Refresh token is invalid")
            }

            throw new InternalServerErrorException()
        }
    }

    private async generateAccessToken(payload: { id: string, role: UserRole, iat?: number, exp?: number }) {
        const { iat, exp, ...cleanPayload } = payload;
        
        const token = await this.jwtService.signAsync(cleanPayload, {
            secret: this.configService.get('jwt.access_key'),
            expiresIn: this.configService.get('jwt.access_time')
        })

        return token
    }
}