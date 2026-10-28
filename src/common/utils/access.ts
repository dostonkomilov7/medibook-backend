import { ForbiddenException } from "@nestjs/common";
import { UserRole } from "@/core/constants/constants";
import type { AuthUser } from "../decorators/current-user.decorator";

const isPresent = (id: unknown) => id !== undefined && id !== null && id !== "";

// For records that belong to one person (profile, appointments, health data):
// admins may reach anyone's, everybody else only their own. A missing id on
// either side never counts as "own" (String(undefined) === String(undefined)).
export function assertSelfOrAdmin(user: AuthUser, ownerId: string | number) {
    if (user.role === UserRole.admin) return;

    if (!isPresent(user.id) || !isPresent(ownerId) || String(user.id) !== String(ownerId)) {
        throw new ForbiddenException("Access denied");
    }
}
