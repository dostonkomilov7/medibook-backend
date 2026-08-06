import { UserRole } from "@/core/constants/constants";
import { IsInt, IsOptional, IsString, MinLength } from "class-validator";

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

    @IsString()
    role: UserRole;
    
    @IsString()
    phone: string;

}