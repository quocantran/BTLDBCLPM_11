import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';

interface PasswordResetMailPayload {
  to: string;
  fullName?: string | null;
  resetUrl: string;
  expiresInMinutes: number;
}

interface MailTransporterOptions {
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
}

interface MailTransporter {
  sendMail: (message: MailTransporterOptions) => Promise<unknown>;
  options?: {
    auth?: {
      user?: string;
    };
  };
}

interface NodemailerModule {
  createTransport: (options: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  }) => MailTransporter;
}

const nodemailerModule = nodemailer as unknown as NodemailerModule;

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: MailTransporter | null = null;

  constructor(private readonly configService: ConfigService) {
    this.logger.log('MailService constructor called');
    this.initializeTransporter();
  }

  private initializeTransporter(): void {
    const smtpHost = this.configService.get<string>(
      'app.passwordReset.smtp.host',
    );
    const smtpPort =
      this.configService.get<number>('app.passwordReset.smtp.port') ?? 587;
    const smtpSecure =
      this.configService.get<boolean>('app.passwordReset.smtp.secure') ?? false;
    const smtpUser = this.configService.get<string>(
      'app.passwordReset.smtp.auth.user',
    );
    const smtpPass = this.configService.get<string>(
      'app.passwordReset.smtp.auth.pass',
    );

    this.logger.debug(
      `SMTP config check: host=${smtpHost}, user=${smtpUser}, pass=${smtpPass ? '***' : 'empty'}`,
    );

    if (!smtpHost || !smtpUser || !smtpPass) {
      this.logger.warn(
        'SMTP credentials are missing. Password reset emails will only be logged.',
      );
      return;
    }

    this.transporter = nodemailerModule.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: Boolean(smtpSecure),
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    this.logger.log(`Mail transporter configured for ${smtpHost}:${smtpPort}`);
  }

  async sendPasswordResetEmail(
    payload: PasswordResetMailPayload,
  ): Promise<void> {
    const { to, fullName, resetUrl, expiresInMinutes } = payload;
    const senderLabel = this.configService.get<string>(
      'app.passwordReset.emailSender',
    );
    const senderAddress = this.configService.get<string>(
      'app.passwordReset.emailSenderAddress',
    );

    const subject = 'Reset your Academix password';
    const greeting = fullName ? `Hi ${fullName},` : 'Hi there,';
    const emailBody = `${greeting}

We received a request to reset your Academix password. You can set a new password by visiting the link below (valid for ${expiresInMinutes} minutes):
${resetUrl}

If you didn’t request this, you can safely ignore this email.

— ${senderLabel ?? 'Academix Support Team'}`;

    if (!this.transporter) {
      this.logger.warn(
        `Mail transport is not configured. Skipping password reset email to ${to}.`,
      );
      this.logger.debug(emailBody);
      return;
    }

    const derivedAddress =
      senderAddress ||
      this.transporter.options?.auth?.user ||
      'no-reply@academix.local';
    const from = senderLabel
      ? `${senderLabel} <${derivedAddress}>`
      : derivedAddress;
    const htmlBody = `
      <p>${greeting}</p>
      <p>We received a request to reset your Academix password.</p>
      <p>
        <a href="${resetUrl}" style="display:inline-block;padding:10px 16px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:6px;">
          Reset password
        </a>
      </p>
      <p>This link is valid for ${expiresInMinutes} minutes.</p>
      <p>If you didn’t request this, you can safely ignore this email.</p>
      <p>— ${senderLabel ?? 'Academix Support Team'}</p>
    `.trim();

    try {
      await this.transporter.sendMail({
        from,
        to,
        subject,
        text: emailBody,
        html: htmlBody,
      });

      this.logger.log(`Password reset email dispatched to ${to}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown email error';
      this.logger.error(
        `Failed to send password reset email to ${to}: ${message}`,
        error instanceof Error ? error.stack : undefined,
      );
      this.logger.debug(emailBody);
    }
  }
}
