import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
  secret:
    process.env.JWT_SECRET ||
    'your-super-secret-jwt-key-please-change-in-production',
  expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  refreshSecret:
    process.env.JWT_REFRESH_SECRET ||
    'your-super-secret-refresh-key-please-change-in-production',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
}));
