import { Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import signed, { Signature } from "signed"

@Injectable()
export class SigantureService {
    private readonly signature: Signature;
    constructor(private readonly configService: ConfigService) {
        const secret = this.configService.get('signature.signature_key');

        if (!secret) {
            throw new NotFoundException("Signature key is not found")
        }

        this.signature = signed({ secret })
    }

    getSignature() {
        return this.signature
    }
}