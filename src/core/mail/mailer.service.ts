import { createTransport, Transporter } from "nodemailer";
import { Injectable } from "@nestjs/common";
import Handlebars from "handlebars";
import path from "path";
import fs  from "fs";

@Injectable()
export class MailerService {
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
            console.log(error)
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
            console.log(error)
        }
    }
}
