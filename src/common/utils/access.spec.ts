/// <reference types="jest" />
// (tsconfig limits global types to "node", so jest's globals are pulled in here)
import { ForbiddenException } from "@nestjs/common";
import { UserRole } from "@/core/constants/constants";
import { assertSelfOrAdmin } from "./access";

describe("assertSelfOrAdmin", () => {
    const patient = { id: 7, role: UserRole.user };

    it("lets people reach their own records, whatever the id's type", () => {
        expect(() => assertSelfOrAdmin(patient, 7)).not.toThrow();
        expect(() => assertSelfOrAdmin(patient, "7")).not.toThrow();
        expect(() => assertSelfOrAdmin({ id: "7", role: UserRole.doctor }, 7)).not.toThrow();
    });

    it("keeps everyone out of other people's records", () => {
        expect(() => assertSelfOrAdmin(patient, 8)).toThrow(ForbiddenException);
        expect(() => assertSelfOrAdmin(patient, "70")).toThrow(ForbiddenException);
        expect(() => assertSelfOrAdmin({ id: 3, role: UserRole.doctor }, 7)).toThrow(ForbiddenException);
    });

    it("lets admins reach anyone's", () => {
        expect(() => assertSelfOrAdmin({ id: 1, role: UserRole.admin }, 7)).not.toThrow();
    });

    it("does not treat a missing id on both sides as 'own'", () => {
        const nobody = { id: undefined as unknown as number, role: UserRole.user };

        expect(() => assertSelfOrAdmin(nobody, undefined as unknown as number)).toThrow(ForbiddenException);
        expect(() => assertSelfOrAdmin({ id: "", role: UserRole.user }, "")).toThrow(ForbiddenException);
        expect(() => assertSelfOrAdmin(patient, undefined as unknown as number)).toThrow(ForbiddenException);
        expect(() => assertSelfOrAdmin({ id: 0, role: UserRole.user }, 7)).toThrow(ForbiddenException);
    });
});
