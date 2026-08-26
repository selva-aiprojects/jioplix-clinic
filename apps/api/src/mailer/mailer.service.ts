import { Injectable, Logger } from '@nestjs/common'
import nodemailer from 'nodemailer'

export interface EmailMessage {
  to: string
  subject: string
  html: string
  text?: string
}

export interface SmsMessage {
  phone: string
  message: string
}

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name)
  private transporter: nodemailer.Transporter | null = null

  constructor() {
    this.initTransporter()
  }

  private initTransporter(): void {
    const host = process.env.SMTP_HOST
    const port = Number(process.env.SMTP_PORT ?? 587)
    const user = process.env.SMTP_USER
    const pass = process.env.SMTP_PASS

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      })
      this.logger.log(`[MAILER] SMTP configured: ${host}:${port}`)
    } else {
      this.logger.log('[MAILER] No SMTP configured — emails will be logged to console')
    }
  }

  async sendEmail(msg: EmailMessage): Promise<boolean> {
    if (!this.transporter) {
      this.logger.log(`[EMAIL STUB] To: ${msg.to} | Subject: ${msg.subject}`)
      this.logger.log(`[EMAIL BODY] ${msg.text ?? msg.html}`)
      return true
    }
    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM ?? process.env.SMTP_USER ?? 'noreply@jioplix.com',
        to: msg.to,
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
      })
      this.logger.log(`[EMAIL] Sent to ${msg.to}: ${msg.subject}`)
      return true
    } catch (err) {
      this.logger.error(`[EMAIL] Failed to send to ${msg.to}`, err)
      return false
    }
  }

  async sendSms(msg: SmsMessage): Promise<boolean> {
    // TODO: integrate MSG91 / Twilio / WhatsApp Business API
    this.logger.log(`[SMS STUB] To: ${msg.phone} | Message: ${msg.message}`)
    return true
  }

  // ─── Templated Emails ──────────────────────────────────────────────

  async sendWelcomeEmail(opts: {
    to: string
    clinicName: string
    slug: string
    adminName: string
    email: string
    password: string
    planCode: string
  }): Promise<boolean> {
    const subject = `Welcome to Jioplix — Your clinic "${opts.clinicName}" is ready!`
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px; background: #f7fbff; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #1265e8; font-size: 24px; margin: 0;">Welcome to Jioplix</h1>
          <p style="color: #64748b; font-size: 14px; margin-top: 8px;">Your clinic is set up and ready to use.</p>
        </div>
        <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; margin-bottom: 16px;">
          <h2 style="font-size: 16px; color: #1e293b; margin: 0 0 16px 0;">Your Login Credentials</h2>
          <table style="width: 100%; font-size: 14px;">
            <tr><td style="color: #64748b; padding: 4px 0;">Clinic Name</td><td style="font-weight: 600; color: #1e293b;">${opts.clinicName}</td></tr>
            <tr><td style="color: #64748b; padding: 4px 0;">Clinic ID</td><td style="font-weight: 600; color: #1e293b; font-family: monospace;">${opts.slug}</td></tr>
            <tr><td style="color: #64748b; padding: 4px 0;">Email</td><td style="font-weight: 600; color: #1e293b;">${opts.email}</td></tr>
            <tr><td style="color: #64748b; padding: 4px 0;">Password</td><td style="font-weight: 600; color: #1e293b; font-family: monospace;">${opts.password}</td></tr>
            <tr><td style="color: #64748b; padding: 4px 0;">Plan</td><td style="font-weight: 600; color: #1e293b; text-transform: capitalize;">${opts.planCode}</td></tr>
          </table>
        </div>
        <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
          <p style="color: #92400e; font-size: 13px; margin: 0;">
            <strong>Important:</strong> You have a 14-day free trial. Log in at
            <a href="https://app.jioplix.com/login" style="color: #1265e8;">app.jioplix.com</a> to get started.
          </p>
        </div>
        <p style="color: #94a3b8; font-size: 12px; text-align: center;">
          Jioplix — AI-Powered Clinic Operating System
        </p>
      </div>
    `
    const text = `Welcome to Jioplix!\n\nClinic: ${opts.clinicName}\nClinic ID: ${opts.slug}\nEmail: ${opts.email}\nPassword: ${opts.password}\nPlan: ${opts.planCode}\n\nLog in at https://app.jioplix.com/login`
    return this.sendEmail({ to: opts.to, subject, html, text })
  }

  async sendSuspensionEmail(opts: {
    to: string
    clinicName: string
    slug: string
    reason: string
    graceDaysRemaining: number
  }): Promise<boolean> {
    const subject = `Jioplix — Your clinic "${opts.clinicName}" has been suspended`
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px; background: #f7fbff; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #e5484d; font-size: 24px; margin: 0;">Account Suspended</h1>
          <p style="color: #64748b; font-size: 14px; margin-top: 8px;">Your clinic access has been temporarily suspended.</p>
        </div>
        <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; margin-bottom: 16px;">
          <p style="color: #1e293b; font-size: 14px; margin: 0 0 12px 0;">
            <strong>Clinic:</strong> ${opts.clinicName} (${opts.slug})
          </p>
          <p style="color: #1e293b; font-size: 14px; margin: 0 0 12px 0;">
            <strong>Reason:</strong> ${opts.reason}
          </p>
          <p style="color: #1e293b; font-size: 14px; margin: 0;">
            <strong>To reactivate:</strong> Please renew your subscription or contact our support team.
          </p>
        </div>
        <p style="color: #94a3b8; font-size: 12px; text-align: center;">
          Jioplix — AI-Powered Clinic Operating System
        </p>
      </div>
    `
    return this.sendEmail({ to: opts.to, subject, html })
  }

  async sendOtpSms(phone: string, otp: string, clinicName: string): Promise<boolean> {
    return this.sendSms({
      phone,
      message: `Your ${clinicName} verification code is ${otp}. It expires in 5 minutes. — Jioplix`,
    })
  }
}
