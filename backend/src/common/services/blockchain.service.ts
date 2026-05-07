/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-require-imports */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CONTRACT_ABI_2 as NFT_CONTRACT_ABI } from '../utils/abi';
import { DEFAULT_NFT_RECIPIENT } from '../utils/constant';

// Dynamic import ethers để tránh lỗi khi chưa cài package
// Cần cài đặt: npm install ethers@^6.0.0
let ethers: any;
try {
  ethers = require('ethers');
} catch {
  console.warn(
    '⚠️ ethers.js not installed. Please run: npm install ethers@^6.0.0',
  );
}

export interface IssueCertificateParams {
  tokenId?: string | bigint; // optional token id if caller wants to track
  ipfsHash: string; // CID (IPFS metadata hash)
  recipientAddress?: string; // Address của người nhận
}

export interface CertificateData {
  cid: string;
  issuer: string;
  recipient: string;
  issuedAt: bigint;
  revoked: boolean;
}

@Injectable()
export class BlockchainService {
  private readonly logger = new Logger(BlockchainService.name);
  private provider: any;
  private contract: any;
  private signer: any = null;
  private contractAddress: string;

  constructor(private configService: ConfigService) {
    if (!ethers) {
      this.logger.error(
        '⚠️ ethers.js not installed. Please run: npm install ethers@^6.0.0',
      );
      return;
    }

    // Lấy RPC URL từ environment variable
    // Mặc định: Avalanche Fuji testnet
    const rpcUrl =
      this.configService.get<string>('BLOCKCHAIN_RPC_URL') ||
      'https://api.avax-test.network/ext/bc/C/rpc';

    // Khởi tạo provider với chain config cho Avalanche
    const chainConfig = {
      name: 'Avalanche Fuji',
      chainId: 43113, // Fuji testnet chain ID
    };
    this.provider = new ethers.JsonRpcProvider(rpcUrl, chainConfig);

    // Ưu tiên ví owner/minter để thực hiện write operations.
    const ownerPrivateKey =
      this.configService.get<string>('blockchain.ownerPrivateKey') ||
      this.configService.get<string>('BLOCKCHAIN_OWNER_PRIVATE_KEY');
    const privateKey =
      ownerPrivateKey ||
      this.configService.get<string>('blockchain.privateKey') ||
      this.configService.get<string>('BLOCKCHAIN_PRIVATE_KEY');
    this.contractAddress =
      this.configService.get<string>('blockchain.contractAddress') ||
      this.configService.get<string>('CONTRACT_ADDRESS') ||
      '';
    if (!this.contractAddress || !ethers.isAddress(this.contractAddress)) {
      throw new Error(
        `Invalid CONTRACT_ADDRESS: "${this.contractAddress}". Please check blockchain.contractAddress / CONTRACT_ADDRESS in environment variables.`,
      );
    }

    // Khởi tạo contract instance
    this.contract = new ethers.Contract(
      this.contractAddress,
      NFT_CONTRACT_ABI,
      this.provider,
    );

    // Nếu có private key, tạo signer để có thể gọi write functions
    if (privateKey) {
      this.signer = new ethers.Wallet(privateKey, this.provider);
      // Tạo contract instance với signer
      this.contract = this.contract.connect(this.signer);
      this.logger.log('Blockchain service initialized with signer');
    } else {
      this.logger.warn(
        'No blockchain signer key found. Set BLOCKCHAIN_OWNER_PRIVATE_KEY (recommended) or BLOCKCHAIN_PRIVATE_KEY. Only read operations are available.',
      );
    }
  }

  /**
   * Tạo chứng chỉ trên smart contract
   * @param params - Thông tin chứng chỉ: tokenId, ipfsHash, recipientAddress
   * @returns Transaction hash
   */
  async issueCertificate(
    params: IssueCertificateParams,
  ): Promise<{ transactionHash: string; tokenId?: string }> {
    try {
      if (!this.signer) {
        throw new Error(
          'Signer not initialized. Please set BLOCKCHAIN_OWNER_PRIVATE_KEY (recommended) or BLOCKCHAIN_PRIVATE_KEY in environment variables.',
        );
      }

      const { tokenId, ipfsHash, recipientAddress } = params;

      if (!ethers) {
        throw new Error(
          'ethers.js not installed. Please install: npm install ethers@^6.0.0',
        );
      }

      const targetRecipient =
        recipientAddress && ethers.isAddress(recipientAddress)
          ? recipientAddress
          : DEFAULT_NFT_RECIPIENT;

      if (!ethers.isAddress(targetRecipient)) {
        throw new Error('Invalid recipient address');
      }

      const metadataUri = this.ensureIpfsUri(ipfsHash);
      await this.assertContractDeployed();
      await this.assertMintPermission();

      // Lấy tokenId tiếp theo để logging (nếu contract hỗ trợ)
      let nextTokenId: bigint | undefined;
      try {
        if (typeof this.contract.nextId === 'function') {
          nextTokenId = await this.contract.nextId();
        }
      } catch (readError) {
        this.logger.warn(
          `Unable to read next token id before minting: ${
            readError instanceof Error ? readError.message : 'Unknown error'
          }`,
        );
      }

      const tokenIdForLog =
        tokenId ?? (nextTokenId ? nextTokenId.toString() : 'unknown');

      this.logger.log(
        `Minting certificate NFT: tokenId=${tokenIdForLog}, recipient=${targetRecipient}, metadata=${metadataUri}`,
      );

      // Gọi function mint trên smart contract
      const tx = await this.contract.mint(targetRecipient, metadataUri);

      this.logger.log(`Transaction sent: ${tx.hash}`);

      // Đợi transaction được mined
      const receipt = await tx.wait();
      this.logger.log(`Transaction confirmed in block: ${receipt.blockNumber}`);

      let mintedTokenId: string | undefined;

      // Parse event Transfer từ receipt
      try {
        const transferEvent = receipt.logs
          .map((log: any) => {
            try {
              return this.contract.interface.parseLog(log);
            } catch {
              return null;
            }
          })
          .find(
            (parsed: any) =>
              parsed?.name === 'Transfer' &&
              parsed?.args?.from === ethers.ZeroAddress,
          );

        if (transferEvent?.args) {
          mintedTokenId =
            typeof transferEvent.args.tokenId === 'bigint'
              ? transferEvent.args.tokenId.toString()
              : transferEvent.args.tokenId;
          this.logger.log(
            `Certificate NFT minted: tokenId=${mintedTokenId}, recipient=${transferEvent.args.to}`,
          );
        } else {
          this.logger.warn(
            `Mint transaction ${tx.hash} confirmed but no Transfer event found. Token ID could not be determined.`,
          );
        }
      } catch (eventError: unknown) {
        // Nếu parse event fail, không throw error vì transaction đã thành công
        const errorMsg =
          eventError instanceof Error ? eventError.message : 'Unknown error';
        this.logger.warn(
          `Failed to parse mint event from transaction ${tx.hash}, but transaction was successful: ${errorMsg}`,
        );
      }

      // Return transaction hash ngay cả khi parse event fail
      return {
        transactionHash: tx.hash,
        tokenId: mintedTokenId ?? nextTokenId?.toString() ?? undefined,
      };
    } catch (error: any) {
      this.logger.error(
        `Error minting certificate NFT: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to mint certificate NFT: ${error.message}`);
    }
  }

  private async assertMintPermission(): Promise<void> {
    if (!this.signer) {
      return;
    }

    if (typeof this.contract.owner !== 'function') {
      return;
    }

    let ownerAddress: string | null = null;
    try {
      ownerAddress = await this.contract.owner();
    } catch (error: unknown) {
      if (this.isBadDataError(error)) {
        this.logger.warn(
          `Contract ${this.contractAddress} does not expose owner(). Skipping owner-based mint permission pre-check.`,
        );
        return;
      }
      throw error;
    }

    const signerAddress = await this.signer.getAddress();

    if (
      ownerAddress &&
      ownerAddress.toLowerCase() !== signerAddress.toLowerCase()
    ) {
      throw new Error(
        `Signer ${signerAddress} is not contract owner ${ownerAddress} for contract ${this.contractAddress}. Mint requires owner/minter permission. Configure BLOCKCHAIN_OWNER_PRIVATE_KEY with the private key of ${ownerAddress}, or transfer contract ownership to ${signerAddress}.`,
      );
    }
  }

  private async assertContractDeployed(): Promise<void> {
    const bytecode = await this.provider.getCode(this.contractAddress);
    if (!bytecode || bytecode === '0x') {
      throw new Error(
        `No contract bytecode found at ${this.contractAddress}. Please check CONTRACT_ADDRESS and BLOCKCHAIN_RPC_URL/chain.`,
      );
    }
  }

  private isBadDataError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === 'BAD_DATA'
    );
  }

  private ensureIpfsUri(ipfsHash: string): string {
    if (!ipfsHash) {
      throw new Error('IPFS hash is required');
    }
    if (ipfsHash.startsWith('ipfs://') || ipfsHash.startsWith('http')) {
      return ipfsHash;
    }
    return `ipfs://${ipfsHash}`;
  }

  /**
   * Lấy thông tin chứng chỉ từ smart contract
   * @param tokenId - Token ID của chứng chỉ
   * @returns Certificate data
   */
  async getCertificate(tokenId: string | bigint): Promise<CertificateData> {
    try {
      const tokenIdBigInt =
        typeof tokenId === 'string' ? BigInt(tokenId) : tokenId;

      this.logger.log(
        `Getting certificate: tokenId=${tokenIdBigInt.toString()}`,
      );

      await this.assertContractDeployed();

      const [owner, tokenUri] = await Promise.all([
        this.contract.ownerOf(tokenIdBigInt),
        this.contract.tokenURI(tokenIdBigInt),
      ]);

      let contractOwner = DEFAULT_NFT_RECIPIENT;
      if (typeof this.contract.owner === 'function') {
        try {
          contractOwner = await this.contract.owner();
        } catch (error: unknown) {
          if (!this.isBadDataError(error)) {
            throw error;
          }
          this.logger.warn(
            `Contract ${this.contractAddress} does not expose owner(). Using default issuer in read response.`,
          );
        }
      }

      return {
        cid: tokenUri,
        issuer: contractOwner,
        recipient: owner,
        issuedAt: BigInt(0),
        revoked: false,
      };
    } catch (error: any) {
      this.logger.error(
        `Error getting certificate: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to get certificate: ${error.message}`);
    }
  }

  /**
   * Verify chứng chỉ bằng tokenId
   * @param tokenId - Token ID của chứng chỉ
   * @returns { valid: boolean, certificate: CertificateData }
   */
  async verifyCertificate(
    tokenId: string | bigint,
  ): Promise<{ valid: boolean; certificate: CertificateData }> {
    try {
      const tokenIdBigInt =
        typeof tokenId === 'string' ? BigInt(tokenId) : tokenId;

      this.logger.log(
        `Verifying certificate: tokenId=${tokenIdBigInt.toString()}`,
      );

      const certificate = await this.getCertificate(tokenIdBigInt);

      return {
        valid: Boolean(certificate.cid),
        certificate,
      };
    } catch (error: any) {
      this.logger.error(
        `Error verifying certificate: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to verify certificate: ${error.message}`);
    }
  }

  /**
   * Verify chứng chỉ bằng IPFS hash (CID)
   * @param ipfsHash - IPFS hash (CID) của chứng chỉ
   * @returns { valid: boolean, certificate: CertificateData }
   */
  verifyCertificateByCID(
    ipfsHash: string,
  ): Promise<{ valid: boolean; certificate: CertificateData }> {
    const message =
      'verifyCertificateByCID is not supported by the current certificate NFT contract.';
    this.logger.warn(
      `verifyCertificateByCID is not supported by the current NFT contract. CID=${ipfsHash}`,
    );
    return Promise.reject(new Error(message));
  }

  /**
   * Lấy token ID từ IPFS hash (CID)
   * @param ipfsHash - IPFS hash (CID)
   * @returns Token ID
   */
  getCertificateIdByCID(ipfsHash: string): Promise<bigint> {
    const message =
      'getCertificateIdByCID is not supported by the current certificate NFT contract.';
    this.logger.warn(
      `getCertificateIdByCID is not supported by the current NFT contract. CID=${ipfsHash}`,
    );
    return Promise.reject(new Error(message));
  }

  /**
   * Revoke chứng chỉ trên smart contract
   * @param tokenId - Token ID của chứng chỉ cần revoke
   * @returns Transaction hash
   */
  revokeCertificate(tokenId: string | bigint): Promise<string> {
    const message =
      'revokeCertificate is not supported by the current certificate NFT contract.';
    this.logger.warn(
      `revokeCertificate is not supported by the current NFT contract. tokenId=${tokenId.toString()}`,
    );
    return Promise.reject(new Error(message));
  }

  /**
   * Lấy owner address của contract
   * @returns Owner address
   */
  async getOwner(): Promise<string> {
    try {
      const owner = await this.contract.owner();
      return owner;
    } catch (error: any) {
      this.logger.error(`Error getting owner: ${error.message}`, error.stack);
      throw new Error(`Failed to get owner: ${error.message}`);
    }
  }
}
