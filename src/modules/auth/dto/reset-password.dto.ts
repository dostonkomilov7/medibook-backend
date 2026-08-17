import { IsString, MinLength } from "class-validator";

export class ResetPasswordDto {
    // The query string (everything after "?") off the signed link emailed
    // to the user — e.g. "userId=42&signed=e_...-r_...-<hash>". Verified
    // as a whole against the `signed` package's signature, not decoded
    // ourselves, so it can't be tampered with (changed userId, extended
    // expiry, etc.) without invalidating the hash.
    @IsString()
    token: string;

    @IsString()
    @MinLength(8)
    password: string;
}
