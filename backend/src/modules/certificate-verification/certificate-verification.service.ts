import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Certificate,
  CertificateDocument,
} from '../../database/schemas/certificate.schema';
import { User, UserDocument } from '../../database/schemas/user.schema';
import { Course, CourseDocument } from '../../database/schemas/course.schema';
import {
  Submission,
  SubmissionDocument,
} from '../../database/schemas/submission.schema';
import { BlockchainService } from '../../common/services/blockchain.service';

export interface CertificateLookupFilters {
  certificateId?: string;
  tokenId?: string;
  studentEmail?: string;
}

export interface BlockchainVerificationPayload {
  valid: boolean;
  tokenId: string;
  cid?: string;
  issuer?: string;
  recipient?: string;
  error?: string;
}

export interface CertificatePublicPayload {
  id: string;
  student: unknown;
  course: unknown;
  submission: unknown;
  status: string;
  tokenId?: string;
  ipfsHash?: string;
  ipfsImage?: string;
  transactionHash?: string;
  issuedAt?: Date;
  outdateTime?: Date;
}

export interface CertificateVerificationResult {
  valid: boolean;
  message: string;
  certificate: CertificatePublicPayload | null;
  blockchainVerification: BlockchainVerificationPayload | null;
}

@Injectable()
export class CertificateVerificationService {
  private readonly logger = new Logger(CertificateVerificationService.name);

  constructor(
    @InjectModel(Certificate.name)
    private readonly certificateModel: Model<CertificateDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(Course.name)
    private readonly courseModel: Model<CourseDocument>,
    @InjectModel(Submission.name)
    private readonly submissionModel: Model<SubmissionDocument>,
    private readonly blockchainService: BlockchainService,
  ) {}

  async verifyByCertificateId(
    certificateId: string,
  ): Promise<CertificateVerificationResult> {
    if (!Types.ObjectId.isValid(certificateId)) {
      throw new BadRequestException('Invalid certificate ID');
    }

    const certificate = await this.certificateModel
      .findById(certificateId)
      .populate('studentId', 'username email fullName role')
      .populate('courseId', 'courseName')
      .populate('submissionId', 'score submittedAt')
      .lean();

    if (!certificate) {
      return {
        valid: false,
        message: 'Certificate not found',
        certificate: null,
        blockchainVerification: null,
      };
    }

    return this.composeVerificationResult(certificate);
  }

  async verifyByTokenId(
    tokenId: string,
  ): Promise<CertificateVerificationResult> {
    if (!tokenId || tokenId.trim().length === 0) {
      throw new BadRequestException('tokenId is required');
    }

    const blockchainResult =
      await this.blockchainService.verifyCertificate(tokenId);

    if (!blockchainResult.valid) {
      return {
        valid: false,
        message: 'Certificate not found on blockchain',
        certificate: null,
        blockchainVerification: {
          valid: false,
          tokenId,
          error: 'Token ID not found on blockchain',
        },
      };
    }

    const certificate = await this.certificateModel
      .findOne({ tokenId })
      .populate('studentId', 'username email fullName role')
      .populate('courseId', 'courseName')
      .populate('submissionId', 'score submittedAt')
      .lean();

    if (!certificate) {
      return {
        valid: true,
        message:
          'Certificate exists on blockchain but no local record was found',
        certificate: null,
        blockchainVerification: {
          valid: blockchainResult.valid,
          tokenId,
          cid: blockchainResult.certificate.cid,
          issuer: blockchainResult.certificate.issuer,
          recipient: blockchainResult.certificate.recipient,
        },
      };
    }

    return this.composeVerificationResult(certificate, {
      valid: blockchainResult.valid,
      tokenId,
      cid: blockchainResult.certificate.cid,
      issuer: blockchainResult.certificate.issuer,
      recipient: blockchainResult.certificate.recipient,
    });
  }

  async lookupCertificates(
    filters: CertificateLookupFilters,
  ): Promise<CertificatePublicPayload[]> {
    const { certificateId, tokenId, studentEmail } = filters;

    const query: Record<string, unknown> = {};

    if (certificateId) {
      if (!Types.ObjectId.isValid(certificateId)) {
        throw new BadRequestException('Invalid certificate ID');
      }
      query._id = new Types.ObjectId(certificateId);
    }

    if (tokenId) {
      query.tokenId = tokenId;
    }

    if (studentEmail) {
      const student = await this.userModel
        .findOne({ email: studentEmail })
        .select('_id')
        .lean();
      if (!student) {
        return [];
      }
      query.studentId = student._id;
    }

    if (Object.keys(query).length === 0) {
      throw new BadRequestException(
        'At least one filter (certificateId, tokenId, studentEmail) is required',
      );
    }

    const certificates = await this.certificateModel
      .find(query)
      .populate('studentId', 'username email fullName role')
      .populate('courseId', 'courseName')
      .populate('submissionId', 'score submittedAt')
      .sort({ issuedAt: -1 })
      .lean();

    return certificates.map((cert) => this.mapCertificate(cert));
  }

  private async composeVerificationResult(
    certificate: CertificateDocument | (Certificate & { _id: Types.ObjectId }),
    blockchainResult?: BlockchainVerificationPayload | null,
  ): Promise<CertificateVerificationResult> {
    let blockchainVerification: BlockchainVerificationPayload | null =
      blockchainResult || null;

    if (!blockchainVerification && certificate.tokenId) {
      try {
        const networkResult = await this.blockchainService.verifyCertificate(
          certificate.tokenId,
        );
        blockchainVerification = {
          valid: networkResult.valid,
          tokenId: certificate.tokenId,
          cid: networkResult.certificate.cid,
          issuer: networkResult.certificate.issuer,
          recipient: networkResult.certificate.recipient,
        };
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        this.logger.warn(
          `Blockchain verification failed for tokenId ${certificate.tokenId}: ${errorMessage}`,
        );
        blockchainVerification = {
          valid: false,
          tokenId: certificate.tokenId,
          error: errorMessage,
        };
      }
    }

    const isRevoked = certificate.status === 'revoked';
    const isIssued = certificate.status === 'issued';

    return {
      valid: isIssued && !isRevoked,
      message: isRevoked
        ? 'Certificate has been revoked'
        : isIssued
          ? 'Certificate is valid'
          : 'Certificate is pending issuance',
      certificate: this.mapCertificate(certificate),
      blockchainVerification,
    };
  }

  private mapCertificate(
    certificate: CertificateDocument | (Certificate & { _id: Types.ObjectId }),
  ): CertificatePublicPayload {
    return {
      id: String(certificate._id),
      student: certificate.studentId,
      course: certificate.courseId,
      submission: certificate.submissionId,
      status: certificate.status,
      tokenId: certificate.tokenId,
      ipfsHash: certificate.ipfsHash,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      ipfsImage: (certificate as any).ipfsImage,
      transactionHash: certificate.transactionHash,
      issuedAt: certificate.issuedAt,
      outdateTime: certificate.outdateTime,
    };
  }
}
