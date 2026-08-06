import { UserRole } from "@/core/constants/constants";
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Observable } from "rxjs";
import { ROLES_KEY } from "../decorators/roles.decorator";
import type { Request } from "express";

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
        const roles = this.reflector.get<UserRole[]>(ROLES_KEY, context.getHandler())

        if(!roles) return true

        const ctx = context.switchToHttp()
        const request = ctx.getRequest<Request & {user: any}>()

        if(!roles.includes(request.user.role)){
            throw new ForbiddenException("Access denied")
        }

        return true

    }
}