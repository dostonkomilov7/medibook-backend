import { UserRole } from "@/core/constants/constants";
import { IsDefined, IsIn, IsInt, IsOptional, IsString, MinLength } from "class-validator";

export class RegisterDto {
    @IsString()
    @MinLength(3)
    full_name: string;
    
    @IsOptional()
    @IsString()
    age: number;
    
    @IsString()
    email: string;
    
    @IsString()
    password: string;

    // Visitors can only sign up as a patient or a doctor — the two options on
    // the sign-up form (and what the admin panel sends for a new doctor).
    // Admin accounts come from `pnpm seed:admin`; accepting "Admin" here would
    // let anyone make themselves one. @IsDefined() because the global pipe
    // skips every other validator on a missing/null field.
    @IsDefined()
    @IsIn([UserRole.user, UserRole.doctor])
    role: UserRole;
    
    @IsString()
    phone: string;

}