import { UserRole } from "@/core/constants/constants";
import { Reflector } from "@nestjs/core";

export const ROLES_KEY = 'Roles';

export const Roles = Reflector.createDecorator<UserRole[]>({
    key: ROLES_KEY
})