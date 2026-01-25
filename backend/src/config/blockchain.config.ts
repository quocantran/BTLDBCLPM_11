import { registerAs } from '@nestjs/config';

export default registerAs('blockchain', () => ({
  rpcUrl:
    process.env.BLOCKCHAIN_RPC_URL ||
    'https://api.avax-test.network/ext/bc/C/rpc', // Avalanche Fuji testnet default
  privateKey: process.env.BLOCKCHAIN_PRIVATE_KEY || '',
  contractAddress:
    process.env.CONTRACT_ADDRESS ||
    '0x3a2b467eE46d93c71B0BAfc2eAc3CE399103aEd2',
  chainId: parseInt(process.env.BLOCKCHAIN_CHAIN_ID || '43113', 10), // Avalanche Fuji testnet chain ID
}));
