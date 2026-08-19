import { createTransport, Transporter } from "nodemailer";
import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import Handlebars from "handlebars";
import path from "path";
import fs  from "fs";

@Injectable()
export class MailerService implements OnModuleInit {
    private readonly logger = new Logger(MailerService.name);
    private readonly transport: Transporter
    private compiledTemplate: HandlebarsTemplateDelegate | null = null;

    constructor() {
        this.transport = createTransport({
            service: 'gmail',
            auth: {
                user: process.env.GOOGLE_EMAIL,
                pass: process.env.APP_PASS
            }
        })
    }

    // Every send call below already swallows its own errors (an activation
    // code / reset link failing to send shouldn't fail the whole request),
    // which means a broken SMTP setup fails completely silently — no
    // email ever arrives, and nothing in the API response or an obvious
    // place in the logs says why. This checks the connection and
    // credentials once at boot and logs a clear pass/fail, so a
    // deployment missing GOOGLE_EMAIL/APP_PASS (env vars set in a local
    // .env file are NOT carried over to a host like Render automatically —
    // they have to be added there separately) or with a revoked app
    // password shows up immediately in the startup logs instead of only
    // as "a user says they never got the email."
    async onModuleInit() {
        if (!process.env.GOOGLE_EMAIL || !process.env.APP_PASS) {
            this.logger.error('GOOGLE_EMAIL / APP_PASS is not set in this environment — no email will ever send.');
            return;
        }
        try {
            await this.transport.verify();
            this.logger.log(`SMTP connection OK — sending as ${process.env.GOOGLE_EMAIL}`);
        } catch (error) {
            this.logger.error(`SMTP connection/auth failed — emails will not send: ${error instanceof Error ? error.message : String(error)}`);
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

    async sendResetPassword({ user, resetUrl, expirationMinutes }: { user: any, resetUrl: string, expirationMinutes: number }) {
        try {
            const htmlContent = this.getTemplate()({
                isReset: true,
                userName: user?.full_name || 'there',
                userEmail: user?.email,
                resetUrl,
                expirationMinutes,
                year: new Date().getFullYear(),
            });

            await this.transport.sendMail({
                to: user.email,
                html: htmlContent,
                subject: 'Reset your MediBook password',
            })

        } catch (error) {
            this.logger.error(`Failed to send password reset email to ${user?.email}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    async sendActivationCode({user, activationCode}: { user: any, activationCode: number }) {
        try {
            const htmlContent = this.getTemplate()({
                isReset: false,
                userName: user?.full_name || 'there',
                userEmail: user?.email,
                activationCode,
                year: new Date().getFullYear(),
            });

            await this.transport.sendMail({
                to: user.email,
                html: htmlContent,
                subject: 'Activate Your Account - Welcome! 🎉',
            })

        } catch (error) {
            this.logger.error(`Failed to send activation email to ${user?.email}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}
