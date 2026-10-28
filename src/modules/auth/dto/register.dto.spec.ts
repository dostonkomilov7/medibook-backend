/// <reference types="jest" />
// (tsconfig limits global types to "node", so jest's globals are pulled in here)
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { RegisterDto } from "./register.dto";

// Same options as the global ValidationPipe in main.ts.
const pipeOptions = { whitelist: true, forbidNonWhitelisted: true, skipUndefinedProperties: true, skipNullProperties: true };

const signUp = {
    full_name: "Jane Doe",
    email: "jane@example.com",
    password: "Passw0rd!",
    phone: "+998901234567",
};

const errorsFor = (role: unknown) => validate(plainToInstance(RegisterDto, { ...signUp, role }), pipeOptions);

describe("RegisterDto.role", () => {
    it.each(["User", "Doctor"])("accepts %s, the two roles on the sign-up form", async (role) => {
        expect(await errorsFor(role)).toHaveLength(0);
    });

    it("refuses Admin — nobody may sign themselves up as an administrator", async () => {
        const errors = await errorsFor("Admin");

        expect(errors).toHaveLength(1);
        expect(errors[0].property).toBe("role");
    });

    it.each(["admin", "ADMIN", "Superuser", "", "User ", 1, true])("refuses %p", async (role) => {
        expect(await errorsFor(role)).not.toHaveLength(0);
    });

    it("refuses a missing or null role instead of creating a role-less account", async () => {
        expect(await errorsFor(undefined)).not.toHaveLength(0);
        expect(await errorsFor(null)).not.toHaveLength(0);
    });
});
