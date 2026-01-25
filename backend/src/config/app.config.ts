import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  port: parseInt(process.env.PORT || '8000', 10),
  environment: process.env.NODE_ENV || 'development',
  apiPrefix: process.env.API_PREFIX || 'api/v1',
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || [
    'http://localhost:3000',
  ],
  passwordReset: {
    url:
      process.env.PASSWORD_RESET_URL || 'http://localhost:3000/reset-password',
    tokenTtlMinutes: parseInt(process.env.PASSWORD_RESET_TOKEN_TTL || '15', 10),
    maxRequestsPerHour: parseInt(
      process.env.PASSWORD_RESET_MAX_REQUESTS || '5',
      10,
    ),
    emailSender:
      process.env.EMAIL_SENDER_NAME ||
      process.env.EMAIL_SENDER_ID ||
      'Academix Support',
    emailSenderAddress:
      process.env.EMAIL_SENDER_ADDRESS ||
      process.env.SMTP_USER ||
      'no-reply@academix.local',
    smtp: {
      host: process.env.SMTP_HOST || '',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
    },
  },
}));
