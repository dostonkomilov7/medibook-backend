import { Reflector } from "@nestjs/core";

export const PROTECTED_KEY = 'Protected';

export const Protected = Reflector.createDecorator<boolean>({
    key: PROTECTED_KEY
})