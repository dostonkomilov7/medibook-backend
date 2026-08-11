import { createTransport, Transporter } from "nodemailer";
import { Injectable } from "@nestjs/common";
import Handlebars from "handlebars";
import path from "path";
import fs  from "fs";

@Injectable()
export class MailerService {
    private readonly transport: Transporter
    constructor() {
        this.transport = createTransport({
            service: 'gmail',
            auth: {
                user: process.env.GOOGLE_EMAIL,
                pass: process.env.APP_PASS
            }
        })
    }

    async sendResetPassword({user, activationUrl, expirationDate, expirationHours}) {
        try {
            const templatePath = path.join(__dirname, 'templates', 'activation-email.hbs')
    
            const templateSource = fs.readFileSync(templatePath, 'utf-8')
            const compiledTemplate = Handlebars.compile(templateSource);
    
            const templateData = {
                user: user || 'User',
                userEmail: user.email,
                activationUrl: activationUrl,
                expirationDate: expirationDate,
                expirationHours: expirationHours,
            }
    
            const htmlContent = compiledTemplate(templateData);
    
            await this.transport.sendMail({
                to: user.email,
                html: htmlContent,
                subject: 'Verification for Reset Your Password',
            })
            
        } catch (error) {
            console.log(error)
        }
    }

    async sendActivationCode({user, activationCode}) {
        try {
            const templatePath = path.join(__dirname, 'templates', 'activation-email.hbs')
    
            const templateSource = fs.readFileSync(templatePath, 'utf-8')
            const compiledTemplate = Handlebars.compile(templateSource);
    
            const templateData = {
                user: user || 'User',
                userEmail: user.email,
                year: new Date().getFullYear(),
                activationCode: activationCode,
            }
    
            const htmlContent = compiledTemplate(templateData);
    
            await this.transport.sendMail({
                // to: user?.email,
                to: 'dostonkomilov070@gmail.com', // for testing
                html: htmlContent,
                subject: 'Activate Your Account - Welcome! 🎉',
            })
            
        } catch (error) {
            console.log(error)
        }
    }
}