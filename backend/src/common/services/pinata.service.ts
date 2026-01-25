 
 
 
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import FormData from 'form-data';
import axios, { AxiosInstance } from 'axios';

export interface PinataUploadResponse {
  IpfsHash: string;
  PinSize: number;
  Timestamp: string;
}

@Injectable()
export class PinataService {
  private readonly logger = new Logger(PinataService.name);
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly gatewayUrl: string;
  private readonly axiosInstance: AxiosInstance;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('pinata.apiKey') || '';
    this.apiSecret = this.configService.get<string>('pinata.apiSecret') || '';
    this.gatewayUrl =
      this.configService.get<string>('pinata.gatewayUrl') ||
      'https://gateway.pinata.cloud';

    if (!this.apiKey || !this.apiSecret) {
      this.logger.warn(
        'Pinata API credentials not configured. Upload functionality will be disabled.',
      );
    }

    this.axiosInstance = axios.create({
      baseURL: 'https://api.pinata.cloud',
      headers: {
        pinata_api_key: this.apiKey,
        pinata_secret_api_key: this.apiSecret,
      },
    });
  }

  /**
   * Upload file buffer lên Pinata IPFS
   * @param fileBuffer - Buffer của file cần upload
   * @param fileName - Tên file
   * @param metadata - Metadata tùy chọn
   * @returns IPFS hash (CID)
   */
  async uploadFile(
    fileBuffer: Buffer,
    fileName: string,
    metadata?: Record<string, unknown>,
  ): Promise<string> {
    if (!this.apiKey || !this.apiSecret) {
      throw new Error(
        'Pinata API credentials not configured. Please set PINATA_API_KEY and PINATA_API_SECRET in environment variables.',
      );
    }

    try {
      const formData = new FormData();
      formData.append('file', fileBuffer, {
        filename: fileName,
        contentType: 'image/png',
      });

      // Thêm metadata nếu có
      if (metadata) {
        const pinataMetadata = JSON.stringify(metadata);
        formData.append('pinataMetadata', pinataMetadata);
      }

      // Pinata options
      const pinataOptions = JSON.stringify({
        cidVersion: 1,
      });
      formData.append('pinataOptions', pinataOptions);

      this.logger.log(`Uploading file to Pinata: ${fileName}`);

      const response = await this.axiosInstance.post<PinataUploadResponse>(
        '/pinning/pinFileToIPFS',
        formData,
        {
          headers: {
            ...formData.getHeaders(),
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
        },
      );

      const ipfsHash = response.data.IpfsHash;
      this.logger.log(
        `File uploaded successfully to Pinata. IPFS Hash: ${ipfsHash}`,
      );

      return ipfsHash;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error uploading file to Pinata: ${errorMessage}`);
      throw new Error(`Failed to upload file to Pinata: ${errorMessage}`);
    }
  }

  /**
   * Upload JSON metadata lên Pinata IPFS
   * @param metadata - JSON object cần upload
   * @param name - Tên cho metadata
   * @returns IPFS hash (CID)
   */
  async uploadJSON(
    metadata: Record<string, unknown>,
    name?: string,
  ): Promise<string> {
    if (!this.apiKey || !this.apiSecret) {
      throw new Error(
        'Pinata API credentials not configured. Please set PINATA_API_KEY and PINATA_API_SECRET in environment variables.',
      );
    }

    try {
      const data = {
        pinataContent: metadata,
        pinataMetadata: {
          name: name || 'certificate-metadata',
        },
        pinataOptions: {
          cidVersion: 1,
        },
      };

      this.logger.log(
        `Uploading JSON metadata to Pinata: ${name || 'metadata'}`,
      );

      const response = await this.axiosInstance.post<PinataUploadResponse>(
        '/pinning/pinJSONToIPFS',
        data,
      );

      const ipfsHash = response.data.IpfsHash;
      this.logger.log(
        `JSON metadata uploaded successfully to Pinata. IPFS Hash: ${ipfsHash}`,
      );

      return ipfsHash;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error uploading JSON to Pinata: ${errorMessage}`);
      throw new Error(`Failed to upload JSON to Pinata: ${errorMessage}`);
    }
  }

  /**
   * Lấy URL để truy cập file từ IPFS gateway
   * @param ipfsHash - IPFS hash (CID)
   * @returns URL để truy cập file
   */
  getGatewayUrl(ipfsHash: string): string {
    return `${this.gatewayUrl}/ipfs/${ipfsHash}`;
  }
}
