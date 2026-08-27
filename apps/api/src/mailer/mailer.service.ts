import { Injectable, Logger } from '@nestjs/common'
import { Resend } from 'resend'

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
  private readonly resend: Resend | null = null
  private readonly fromAddress: string

  constructor() {
    const apiKey = process.env.RESEND_API_KEY
    this.fromAddress = process.env.RESEND_FROM ?? 'HIMS Onboarding <onboarding@cognivectra.com>'

    if (apiKey) {
      this.resend = new Resend(apiKey)
      this.logger.log('[MAILER] Resend configured')
    } else {
      this.logger.log('[MAILER] No RESEND_API_KEY — emails will be logged to console')
    }
  }

  async sendEmail(msg: EmailMessage): Promise<boolean> {
    if (!this.resend) {
      this.logger.log(`[EMAIL STUB] To: ${msg.to} | Subject: ${msg.subject}`)
      this.logger.log(`[EMAIL BODY] ${msg.text ?? msg.html.substring(0, 200)}`)
      return true
    }
    try {
      await this.resend.emails.send({
        from: this.fromAddress,
        to: [msg.to],
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
            <a href="https://jioplix-clinic.vercel.app/login" style="color: #1265e8;">jioplix-clinic.vercel.app</a> to get started.
          </p>
        </div>
        <p style="color: #94a3b8; font-size: 12px; text-align: center;">
          Jioplix — AI-Powered Clinic Operating System
        </p>
      </div>
    `
    const text = `Welcome to Jioplix!\n\nClinic: ${opts.clinicName}\nClinic ID: ${opts.slug}\nEmail: ${opts.email}\nPassword: ${opts.password}\nPlan: ${opts.planCode}\n\nLog in at https://jioplix-clinic.vercel.app/login`
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
          <p style="color: #1e293b; font-size: 14px; margin: 0 0 12px 0;"><strong>Clinic:</strong> ${opts.clinicName} (${opts.slug})</p>
          <p style="color: #1e293b; font-size: 14px; margin: 0 0 12px 0;"><strong>Reason:</strong> ${opts.reason}</p>
          <p style="color: #1e293b; font-size: 14px; margin: 0;"><strong>To reactivate:</strong> Renew your subscription or contact support.</p>
        </div>
        <div style="text-align: center; margin-bottom: 16px;">
          <a href="https://jioplix-clinic.vercel.app/suspended" style="display: inline-block; background: #1265e8; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">Renew Now</a>
        </div>
        <p style="color: #94a3b8; font-size: 12px; text-align: center;">Jioplix — AI-Powered Clinic Operating System</p>
      </div>
    `
    return this.sendEmail({ to: opts.to, subject, html })
  }

  async sendPasswordResetEmail(opts: {
    to: string
    userName: string
    resetLink: string
  }): Promise<boolean> {
    const subject = 'Jioplix — Reset your password'
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px; background: #f7fbff; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #1265e8; font-size: 24px; margin: 0;">Password Reset</h1>
          <p style="color: #64748b; font-size: 14px; margin-top: 8px;">We received a request to reset your password.</p>
        </div>
        <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; margin-bottom: 16px;">
          <p style="color: #1e293b; font-size: 14px; margin: 0 0 16px 0;">Hi ${opts.userName},</p>
          <p style="color: #1e293b; font-size: 14px; margin: 0 0 16px 0;">Click the button below to reset your password. This link expires in 1 hour.</p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${opts.resetLink}" style="display: inline-block; background: #1265e8; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">Reset Password</a>
          </div>
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">If you didn't request this, you can safely ignore this email.</p>
        </div>
        <p style="color: #94a3b8; font-size: 12px; text-align: center;">Jioplix — AI-Powered Clinic Operating System</p>
      </div>
    `
    return this.sendEmail({ to: opts.to, subject, html })
  }

  async sendTicketResponseEmail(opts: {
    to: string
    userName: string
    ticketSubject: string
    responderName: string
    message: string
    ticketUrl: string
  }): Promise<boolean> {
    const subject = `Jioplix Support — Reply on "${opts.ticketSubject}"`
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px; background: #f7fbff; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #1265e8; font-size: 24px; margin: 0;">Support Reply</h1>
        </div>
        <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; margin-bottom: 16px;">
          <p style="color: #1e293b; font-size: 14px; margin: 0 0 12px 0;">Hi ${opts.userName},</p>
          <p style="color: #1e293b; font-size: 14px; margin: 0 0 12px 0;"><strong>${opts.responderName}</strong> replied to your ticket <em>"${opts.ticketSubject}"</em>:</p>
          <div style="background: #f1f5f9; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="color: #334155; font-size: 14px; margin: 0; white-space: pre-wrap;">${opts.message}</p>
          </div>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${opts.ticketUrl}" style="display: inline-block; background: #1265e8; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">View Ticket</a>
          </div>
        </div>
        <p style="color: #94a3b8; font-size: 12px; text-align: center;">Jioplix — AI-Powered Clinic Operating System</p>
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

  async sendTrialReminderEmail(opts: {
    to: string
    clinicName: string
    daysRemaining: number
    loginUrl: string
  }): Promise<boolean> {
    const urgency = opts.daysRemaining <= 2 ? 'urgent' : 'gentle'
    const subject = opts.daysRemaining <= 2
      ? `Jioplix — Your trial for "${opts.clinicName}" expires in ${opts.daysRemaining} day${opts.daysRemaining > 1 ? 's' : ''}!`
      : `Jioplix — ${opts.daysRemaining} days left in your free trial for "${opts.clinicName}"`
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px; background: #f7fbff; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: ${opts.daysRemaining <= 2 ? '#e5484d' : '#1265e8'}; font-size: 24px; margin: 0;">
            ${opts.daysRemaining <= 2 ? 'Trial Expiring Soon' : 'Your Free Trial'}
          </h1>
          <p style="color: #64748b; font-size: 14px; margin-top: 8px;">
            ${opts.daysRemaining <= 2
              ? `Your trial for <strong>${opts.clinicName}</strong> expires in <strong>${opts.daysRemaining} day${opts.daysRemaining > 1 ? 's' : ''}</strong>.`
              : `You have <strong>${opts.daysRemaining} days</strong> left in your free trial for <strong>${opts.clinicName}</strong>.`
            }
          </p>
        </div>
        <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; margin-bottom: 16px;">
          <p style="color: #1e293b; font-size: 14px; margin: 0 0 16px 0;">
            To continue using Jioplix after your trial, you'll need to subscribe to a plan.
            ${opts.daysRemaining <= 2 ? 'Don\'t lose access to your patient records and clinic data!' : ''}
          </p>
          <p style="color: #1e293b; font-size: 14px; margin: 0 0 12px 0;"><strong>What happens after the trial?</strong></p>
          <ul style="color: #64748b; font-size: 13px; margin: 0; padding-left: 20px;">
            <li style="margin-bottom: 6px;">Your clinic data is preserved for 30 days</li>
            <li style="margin-bottom: 6px;">You can subscribe anytime to restore access</li>
            <li>After 30 days, data may be permanently deleted</li>
          </ul>
        </div>
        <div style="text-align: center; margin-bottom: 16px;">
          <a href="${opts.loginUrl}" style="display: inline-block; background: ${opts.daysRemaining <= 2 ? '#e5484d' : '#1265e8'}; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
            ${opts.daysRemaining <= 2 ? 'Renew Now' : 'Choose a Plan'}
          </a>
        </div>
        <p style="color: #94a3b8; font-size: 12px; text-align: center;">Jioplix — AI-Powered Clinic Operating System</p>
      </div>
    `
    return this.sendEmail({ to: opts.to, subject, html })
  }

  async sendPaymentFollowupEmail(opts: {
    to: string
    clinicName: string
    slug: string
    planName: string
    amountPaise: number
    daysOverdue: number
  }): Promise<boolean> {
    const subject = `Jioplix — Payment pending for "${opts.clinicName}" (₹${(opts.amountPaise / 100).toLocaleString()})`
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px; background: #f7fbff; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #e5484d; font-size: 24px; margin: 0;">Payment Follow-Up</h1>
          <p style="color: #64748b; font-size: 14px; margin-top: 8px;">A tenant's trial has expired without payment.</p>
        </div>
        <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; margin-bottom: 16px;">
          <table style="width: 100%; font-size: 14px;">
            <tr><td style="color: #64748b; padding: 4px 0;">Clinic</td><td style="font-weight: 600; color: #1e293b;">${opts.clinicName}</td></tr>
            <tr><td style="color: #64748b; padding: 4px 0;">Clinic ID</td><td style="font-weight: 600; color: #1e293b; font-family: monospace;">${opts.slug}</td></tr>
            <tr><td style="color: #64748b; padding: 4px 0;">Plan</td><td style="font-weight: 600; color: #1e293b;">${opts.planName}</td></tr>
            <tr><td style="color: #64748b; padding: 4px 0;">Amount Due</td><td style="font-weight: 600; color: #e5484d; font-size: 16px;">₹${(opts.amountPaise / 100).toLocaleString()}</td></tr>
            <tr><td style="color: #64748b; padding: 4px 0;">Days Overdue</td><td style="font-weight: 600; color: #e5484d;">${opts.daysOverdue} days</td></tr>
          </table>
        </div>
        <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
          <p style="color: #92400e; font-size: 13px; margin: 0;">
            <strong>Action needed:</strong> Reach out to the clinic admin to follow up on payment or extend the trial.
          </p>
        </div>
        <div style="text-align: center; margin-bottom: 16px;">
          <a href="https://jioplix-clinic.vercel.app/admin" style="display: inline-block; background: #1265e8; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">View in Admin Panel</a>
        </div>
        <p style="color: #94a3b8; font-size: 12px; text-align: center;">Jioplix — AI-Powered Clinic Operating System</p>
      </div>
    `
    return this.sendEmail({ to: opts.to, subject, html })
  }

  async sendMonthlyReceivableReport(opts: {
    to: string
    month: string
    totalPending: number
    totalPaid: number
    pendingTenants: Array<{ clinicName: string; slug: string; amountPaise: number; daysOverdue: number }>
  }): Promise<boolean> {
    const pendingRows = opts.pendingTenants.map(t => `
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; color: #1e293b; font-size: 13px;">${t.clinicName}</td>
        <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 13px; font-family: monospace;">${t.slug}</td>
        <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; color: #e5484d; font-size: 13px; font-weight: 600;">₹${(t.amountPaise / 100).toLocaleString()}</td>
        <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; color: #e5484d; font-size: 13px;">${t.daysOverdue}d</td>
      </tr>
    `).join('')
    const subject = `Jioplix — Monthly Receivable Report — ${opts.month}`
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 640px; margin: 0 auto; padding: 32px; background: #f7fbff; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #1265e8; font-size: 24px; margin: 0;">Monthly Receivable Report</h1>
          <p style="color: #64748b; font-size: 14px; margin-top: 8px;">${opts.month}</p>
        </div>
        <div style="display: flex; gap: 12px; margin-bottom: 20px;">
          <div style="flex: 1; background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; text-align: center;">
            <p style="color: #64748b; font-size: 12px; margin: 0;">Total Collected</p>
            <p style="color: #22c55e; font-size: 22px; font-weight: 700; margin: 4px 0 0 0;">₹${opts.totalPaid.toLocaleString()}</p>
          </div>
          <div style="flex: 1; background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; text-align: center;">
            <p style="color: #64748b; font-size: 12px; margin: 0;">Total Pending</p>
            <p style="color: #e5484d; font-size: 22px; font-weight: 700; margin: 4px 0 0 0;">₹${opts.totalPending.toLocaleString()}</p>
          </div>
        </div>
        ${opts.pendingTenants.length > 0 ? `
          <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
            <h3 style="font-size: 14px; color: #1e293b; margin: 0 0 12px 0;">Pending Payments (${opts.pendingTenants.length} tenants)</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr style="border-bottom: 2px solid #e2e8f0;">
                <td style="padding: 6px 0; color: #64748b; font-size: 11px; font-weight: 600; text-transform: uppercase;">Clinic</td>
                <td style="padding: 6px 0; color: #64748b; font-size: 11px; font-weight: 600; text-transform: uppercase;">ID</td>
                <td style="padding: 6px 0; color: #64748b; font-size: 11px; font-weight: 600; text-transform: uppercase;">Amount</td>
                <td style="padding: 6px 0; color: #64748b; font-size: 11px; font-weight: 600; text-transform: uppercase;">Overdue</td>
              </tr>
              ${pendingRows}
            </table>
          </div>
        ` : `
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin-bottom: 16px; text-align: center;">
            <p style="color: #166534; font-size: 14px; margin: 0;">All payments are up to date.</p>
          </div>
        `}
        <div style="text-align: center; margin-bottom: 16px;">
          <a href="https://jioplix-clinic.vercel.app/admin" style="display: inline-block; background: #1265e8; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">View Admin Panel</a>
        </div>
        <p style="color: #94a3b8; font-size: 12px; text-align: center;">Jioplix — AI-Powered Clinic Operating System</p>
      </div>
    `
    return this.sendEmail({ to: opts.to, subject, html })
  }
}
