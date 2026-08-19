import { createTransport, Transporter } from "nodemailer";
import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import Handlebars from "handlebars";
import path from "path";
import fs  from "fs";
import dns from "dns";

const GMAIL_SMTP_HOST = "smtp.gmail.com";
const GMAIL_SMTP_PORT = 465;
// Re-resolved this often rather than pinning forever — Google rotates
// smtp.gmail.com across a small pool of server IPs (we saw two different
// ones across two failures), so caching indefinitely risks pinning to one
// that later goes down.
const DNS_CACHE_MS = 5 * 60 * 1000;

// NOTE: on Render specifically, this whole SMTP approach doesn't actually
// work — Render blocks outbound SMTP ports (465/587/25) entirely, which
// showed up as "Connection timeout" even after fixing DNS/IP resolution
// below. It's kept active here (per request) for local development/other
// hosts where SMTP isn't blocked; the Resend (HTTPS API) version that
// does work on Render is further down, commented out, ready to swap back
// in once a real domain is available to verify there (Resend's sandbox
// sender can only deliver to the account's own email).
@Injectable()
export class MailerService implements OnModuleInit {
    private readonly logger = new Logger(MailerService.name);
    private compiledTemplate: HandlebarsTemplateDelegate | null = null;
    private cachedIPv4: { host: string; expiresAt: number } | null = null;

    // smtp.gmail.com resolves to both an IPv4 and an IPv6 address. Node's
    // own dns.lookup() order doesn't matter here: nodemailer does its own
    // resolve4()+resolve6() and picks *at random* from the combined list
    // (see nodemailer/lib/shared/index.js's formatDNSValue), so on a host
    // with no outbound IPv6 route it fails with ENETUNREACH roughly half
    // the time. Resolving the A record ourselves and handing nodemailer a
    // literal IPv4 address as `host` sidesteps that random pick entirely —
    // resolveHostname() special-cases an already-IP host and skips its own
    // resolution.
    private async getIPv4Host(): Promise<string> {
        const now = Date.now();
        if (this.cachedIPv4 && this.cachedIPv4.expiresAt > now) {
            return this.cachedIPv4.host;
        }
        const addresses = await dns.promises.resolve4(GMAIL_SMTP_HOST);
        const host = addresses[Math.floor(Math.random() * addresses.length)];
        this.cachedIPv4 = { host, expiresAt: now + DNS_CACHE_MS };
        return host;
    }

    // Connecting to a literal IP means the TLS handshake gets no hostname
    // to derive SNI/certificate validation from on its own — explicitly
    // passing `servername` keeps that checked against smtp.gmail.com's
    // real certificate exactly as if we'd connected by hostname.
    private async getTransport(): Promise<Transporter> {
        let host: string;
        try {
            host = await this.getIPv4Host();
        } catch (error) {
            this.logger.warn(`Could not resolve ${GMAIL_SMTP_HOST}'s A record, falling back to hostname (may hit the IPv6 ENETUNREACH issue again): ${error instanceof Error ? error.message : String(error)}`);
            host = GMAIL_SMTP_HOST;
        }
        return createTransport({
            host,
            port: GMAIL_SMTP_PORT,
            secure: true,
            auth: {
                user: process.env.GOOGLE_EMAIL,
                pass: process.env.APP_PASS
            },
            tls: { servername: GMAIL_SMTP_HOST },
        });
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
            const transport = await this.getTransport();
            await transport.verify();
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

            const transport = await this.getTransport();
            await transport.sendMail({
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

            const transport = await this.getTransport();
            await transport.sendMail({
                to: user.email,
                html: htmlContent,
                subject: 'Activate Your Account - Welcome! 🎉',
            })

        } catch (error) {
            this.logger.error(`Failed to send activation email to ${user?.email}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}

// ---------------------------------------------------------------------
// Resend (HTTPS API) version — this is the one that actually works on
// Render, since it sends over port 443 instead of raw SMTP. Swap it back
// in (and remove the class above) once a real domain is verified in the
// Resend dashboard — until then its sandbox sender (onboarding@resend.dev)
// can only deliver to the Resend account's own registered email, which
// isn't usable for real users. Needs RESEND_API_KEY set in the
// environment, and optionally MAIL_FROM once a domain is verified.
// ---------------------------------------------------------------------
//
// import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
// import { Resend } from "resend";
// import Handlebars from "handlebars";
// import path from "path";
// import fs  from "fs";
//
// const FROM_ADDRESS = process.env.MAIL_FROM || "MediBook <onboarding@resend.dev>";
//
// @Injectable()
// export class MailerService implements OnModuleInit {
//     private readonly logger = new Logger(MailerService.name);
//     private readonly resend: Resend | null;
//     private compiledTemplate: HandlebarsTemplateDelegate | null = null;
//
//     constructor() {
//         this.resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
//     }
//
//     async onModuleInit() {
//         if (!process.env.RESEND_API_KEY) {
//             this.logger.error('RESEND_API_KEY is not set in this environment — no email will ever send.');
//             return;
//         }
//         this.logger.log(`Resend configured — sending as ${FROM_ADDRESS}`);
//         if (FROM_ADDRESS.includes('onboarding@resend.dev')) {
//             this.logger.warn("Using Resend's sandbox sender (onboarding@resend.dev) — this can only deliver to the email address your Resend account itself is registered with. Verify a real domain in the Resend dashboard and set MAIL_FROM to send to real users.");
//         }
//     }
//
//     private getTemplate() {
//         if (!this.compiledTemplate) {
//             const templatePath = path.join(__dirname, 'templates', 'email.hbs')
//             const templateSource = fs.readFileSync(templatePath, 'utf-8')
//             this.compiledTemplate = Handlebars.compile(templateSource);
//         }
//         return this.compiledTemplate;
//     }
//
//     private async send(to: string, subject: string, html: string, context: string) {
//         if (!this.resend) {
//             this.logger.error(`Cannot send "${subject}" to ${to}: RESEND_API_KEY is not set.`);
//             return;
//         }
//         const { error } = await this.resend.emails.send({ from: FROM_ADDRESS, to, subject, html });
//         if (error) {
//             this.logger.error(`Failed to send ${context} to ${to}: ${error.message}`);
//         }
//     }
//
//     async sendResetPassword({ user, resetUrl, expirationMinutes }: { user: any, resetUrl: string, expirationMinutes: number }) {
//         const htmlContent = this.getTemplate()({
//             isReset: true,
//             userName: user?.full_name || 'there',
//             userEmail: user?.email,
//             resetUrl,
//             expirationMinutes,
//             year: new Date().getFullYear(),
//         });
//         await this.send(user.email, 'Reset your MediBook password', htmlContent, 'password reset email');
//     }
//
//     async sendActivationCode({user, activationCode}: { user: any, activationCode: number }) {
//         const htmlContent = this.getTemplate()({
//             isReset: false,
//             userName: user?.full_name || 'there',
//             userEmail: user?.email,
//             activationCode,
//             year: new Date().getFullYear(),
//         });
//         await this.send(user.email, 'Activate Your Account - Welcome! 🎉', htmlContent, 'activation email');
//     }
// }
