import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { Resend } from "resend";
import Handlebars from "handlebars";
import path from "path";
import fs  from "fs";

// Nodemailer + Gmail SMTP couldn't work here: Render silently drops
// outbound traffic on SMTP ports (465/587/25) — packets go out and just
// never get a reply, which is exactly what "Connection timeout" is (as
// opposed to e.g. ENETUNREACH, which is a routing failure, not a
// firewall). No DNS/IP fix can get around a port-level block; the actual
// fix is not using raw SMTP at all. Resend sends over a plain HTTPS POST
// (port 443, never blocked), so this replaces the whole SMTP transport.
const FROM_ADDRESS = process.env.MAIL_FROM || "MediBook <onboarding@resend.dev>";

@Injectable()
export class MailerService implements OnModuleInit {
    private readonly logger = new Logger(MailerService.name);
    private readonly resend: Resend | null;
    private compiledTemplate: HandlebarsTemplateDelegate | null = null;

    constructor() {
        this.resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
    }

    // Every send call below already swallows its own errors (an activation
    // code / reset link failing to send shouldn't fail the whole request),
    // which means a missing/invalid key would otherwise fail completely
    // silently — no email ever arrives, and nothing in the API response or
    // an obvious place in the logs says why. Fail loudly at boot instead.
    async onModuleInit() {
        if (!process.env.RESEND_API_KEY) {
            this.logger.error('RESEND_API_KEY is not set in this environment — no email will ever send.');
            return;
        }
        this.logger.log(`Resend configured — sending as ${FROM_ADDRESS}`);
        if (FROM_ADDRESS.includes('onboarding@resend.dev')) {
            this.logger.warn("Using Resend's sandbox sender (onboarding@resend.dev) — this can only deliver to the email address your Resend account itself is registered with. Verify a real domain in the Resend dashboard and set MAIL_FROM to send to real users.");
        }
    }

    private getTemplate() {
        if (!this.compiledTemplate) {
            const templatePath = path.join(__dirname, 'templates', 'email.hbs')
            const templateSource = fs.readFileSync(templatePath, 'utf-8')
            this.compiledTemplate = Handlebars.compile(templateSource);
        }
        return this.compiledTemplate;
    }

    private async send(to: string, subject: string, html: string, context: string) {
        if (!this.resend) {
            this.logger.error(`Cannot send "${subject}" to ${to}: RESEND_API_KEY is not set.`);
            return;
        }
        const { error } = await this.resend.emails.send({ from: FROM_ADDRESS, to, subject, html });
        if (error) {
            this.logger.error(`Failed to send ${context} to ${to}: ${error.message}`);
        }
    }

    async sendResetPassword({ user, resetUrl, expirationMinutes }: { user: any, resetUrl: string, expirationMinutes: number }) {
        const htmlContent = this.getTemplate()({
            isReset: true,
            userName: user?.full_name || 'there',
            userEmail: user?.email,
            resetUrl,
            expirationMinutes,
            year: new Date().getFullYear(),
        });
        await this.send(user.email, 'Reset your MediBook password', htmlContent, 'password reset email');
    }

    async sendActivationCode({user, activationCode}: { user: any, activationCode: number }) {
        const htmlContent = this.getTemplate()({
            isReset: false,
            userName: user?.full_name || 'there',
            userEmail: user?.email,
            activationCode,
            year: new Date().getFullYear(),
        });
        await this.send(user.email, 'Activate Your Account - Welcome! 🎉', htmlContent, 'activation email');
    }
}
