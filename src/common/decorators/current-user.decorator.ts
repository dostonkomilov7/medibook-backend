import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { Request } from "express";
import { UserRole } from "@/core/constants/constants";

// The payload AuthGuard stores on the request once the access token checks out.
export interface AuthUser {
    id: number | string;
    role: UserRole;
}

export const CurrentUser = createParamDecorator(
    (_data: unknown, ctx: ExecutionContext): AuthUser =>
        ctx.switchToHttp().getRequest<Request & { user: AuthUser }>().user,
);
