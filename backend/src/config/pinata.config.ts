import { registerAs } from '@nestjs/config';

export default registerAs('pinata', () => ({
  apiKey: process.env.PINATA_API_KEY || '',
  apiSecret: process.env.PINATA_API_SECRET || '',
  gatewayUrl: process.env.PINATA_GATEWAY_URL || 'https://gateway.pinata.cloud',
}));
