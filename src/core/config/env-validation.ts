import { IsInt, IsString, Max, Min, validateSync } from "class-validator";
import { plainToInstance } from "class-transformer";

class EnvVariables {
    @IsInt()
    @Min(0)
    @Max(65535)
    PORT: number;

    @IsInt()
    @Min(0)
    @Max(65535)
    DB_PORT: number;

    @IsString()
    DB_HOST: string;

    @IsString()
    DB_USER: string;

    @IsString()
    DB_NAME: string;

    @IsString()
    DB_PASS: string;
}

export function validate(config: Record<string, unknown>) {
    const validatedConfig = plainToInstance(EnvVariables, config, {
        enableImplicitConversion: true
    })

    const errors = validateSync(validatedConfig, {
        skipMissingProperties: false
    })

    if( errors.length > 0) {
        throw new Error(errors.toString())
    }
    
    return validatedConfig
}