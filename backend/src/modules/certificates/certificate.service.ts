import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Certificate,
  CertificateDocument,
} from '../../database/schemas/certificate.schema';
import {
  IssueCertificateDto,
  CertificatesQueryDto,
} from './dto/certificate.dto';
import { User, UserDocument } from 'src/database/schemas/user.schema';
import { Course, CourseDocument } from 'src/database/schemas/course.schema';
import {
  Submission,
  SubmissionDocument,
} from 'src/database/schemas/submission.schema';
import { Exam, ExamDocument } from 'src/database/schemas/exam.schema';
import { BlockchainService } from '../../common/services/blockchain.service';
import { DEFAULT_NFT_RECIPIENT } from '../../common/utils/constant';
import { CertificateGenerationService } from '../../common/services/certificate-generation.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class CertificateService {
  private readonly logger = new Logger(CertificateService.name);

  constructor(
    @InjectModel(Certificate.name)
    private readonly certificateModel: Model<CertificateDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(Course.name)
    private readonly courseModel: Model<CourseDocument>,
    @InjectModel(Submission.name)
    private readonly submissionModel: Model<SubmissionDocument>,
    @InjectModel(Exam.name)
    private readonly examModel: Model<ExamDocument>,
    private readonly blockchainService: BlockchainService,
    private readonly certificateGenerationService: CertificateGenerationService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async issue(dto: IssueCertificateDto) {
    const { examId, studentId } = dto;

    const submission = await this.submissionModel.findOne({
      examId: new Types.ObjectId(examId),
      studentId: new Types.ObjectId(studentId),
    });
    if (!submission) throw new NotFoundException('Submission not found');

    const existingCertificate = await this.certificateModel.findOne({
      submissionId: submission._id,
    });
    if (existingCertificate) {
      return await this.certificateModel
        .findById(existingCertificate._id)
        .populate('studentId', 'username email fullName role')
        .populate('courseId', 'courseName')
        .populate('submissionId', 'score submittedAt')
        .lean();
    }

    const exam = await this.examModel.findById(examId);
    if (!exam) throw new NotFoundException('Exam not found');

    const course = await this.courseModel.findById(exam.courseId);
    if (!course) throw new NotFoundException('Course not found');

    const student = await this.userModel.findById(dto.studentId);
    if (!student) throw new NotFoundException('Student not found');

    const examEndDate = exam.endTime ? new Date(exam.endTime) : new Date();
    const outdateTime = new Date(examEndDate);
    outdateTime.setFullYear(examEndDate.getFullYear() + 2);

    const certificate = new this.certificateModel({
      studentId: new Types.ObjectId(dto.studentId),
      courseId: exam.courseId,
      submissionId: submission._id,
      status: 'pending',
      tokenId: undefined,
      ipfsHash: undefined,
      transactionHash: undefined,
      issuedAt: new Date(),
      outdateTime,
    });

    const savedCertificate = await certificate.save();

    try {
      // 1. Tạo token ID từ certificate._id (chuyển sang string để dùng làm tokenId)
      const certificateId = String(savedCertificate._id);
      const tokenId = certificateId; // Sử dụng certificate ID làm tokenId

      // 2. Tạo ảnh certificate và upload lên Pinata IPFS
      let imageIpfsHash: string | undefined;
      let metadataIpfsHash: string | undefined;

      try {
        this.logger.log(
          `Generating certificate image and uploading to Pinata for certificate: ${certificateId}`,
        );

        const generationResult =
          await this.certificateGenerationService.generateAndUploadCertificate(
            certificateId,
          );

        imageIpfsHash = generationResult.imageIpfsHash;
        metadataIpfsHash = generationResult.metadataIpfsHash;

        this.logger.log(
          `Certificate assets uploaded to Pinata. Image IPFS: ${imageIpfsHash}, Metadata IPFS: ${metadataIpfsHash}`,
        );

        // Update certificate với metadata và image IPFS hash từ Pinata
        savedCertificate.ipfsHash = metadataIpfsHash;
        savedCertificate.set('ipfsImage', imageIpfsHash);
        await savedCertificate.save();
      } catch (pinataError: unknown) {
        const errorMessage =
          pinataError instanceof Error ? pinataError.message : 'Unknown error';
        this.logger.error(
          `Error uploading certificate to Pinata: ${errorMessage}`,
          pinataError instanceof Error ? pinataError.stack : undefined,
        );
        // Tiếp tục với placeholder nếu upload Pinata fail
        const placeholderHash = `QmPlaceholder${tokenId.substring(0, 10)}`;
        metadataIpfsHash = placeholderHash;
        imageIpfsHash = placeholderHash;
        this.logger.warn(
          `Using placeholder IPFS hash due to Pinata upload failure`,
        );
        savedCertificate.ipfsHash = metadataIpfsHash;
        savedCertificate.set('ipfsImage', imageIpfsHash);
        await savedCertificate.save();
      }

      // 3. Chuẩn bị địa chỉ ví đích (sử dụng default nếu chưa có)
      const recipientAddress =
        student.walletAddress && student.walletAddress.trim().length > 0
          ? student.walletAddress
          : DEFAULT_NFT_RECIPIENT;
      if (!student.walletAddress) {
        this.logger.warn(
          `Student ${String(
            student._id,
          )} has no wallet address. Using default recipient ${recipientAddress} for NFT minting.`,
        );
      }

      // 4. Mint certificate trên blockchain với IPFS hash từ Pinata
      this.logger.log(
        `Minting certificate on blockchain: tokenId=${tokenId}, recipient=${recipientAddress}`,
      );

      let transactionHash: string | undefined;
      let mintedTokenId: string | undefined;
      try {
        const mintResult = await this.blockchainService.issueCertificate({
          tokenId: tokenId,
          ipfsHash: metadataIpfsHash ?? '',
          recipientAddress,
        });
        transactionHash = mintResult.transactionHash;
        mintedTokenId = mintResult.tokenId;

        // 5. Update certificate với tokenId, ipfsHash và ipfsImage (đã có từ Pinata), transactionHash và status
        savedCertificate.tokenId = mintedTokenId ?? tokenId;
        // ipfsHash và ipfsImage đã được update từ bước upload Pinata
        if (!savedCertificate.ipfsHash && metadataIpfsHash) {
          savedCertificate.ipfsHash = metadataIpfsHash;
        }
        if (!savedCertificate.get('ipfsImage') && imageIpfsHash) {
          savedCertificate.set('ipfsImage', imageIpfsHash);
        }
        savedCertificate.transactionHash = transactionHash;
        savedCertificate.status = 'issued';
        await savedCertificate.save();

        this.logger.log(
          `Certificate minted successfully: tokenId=${tokenId}, txHash=${transactionHash}`,
        );
      } catch (blockchainError: unknown) {
        // Nếu mint trên blockchain fail, kiểm tra xem có transactionHash không
        // Có thể transaction đã được gửi nhưng có lỗi khi parse event
        const errorMessage =
          blockchainError instanceof Error
            ? blockchainError.message
            : 'Unknown error';

        // Kiểm tra xem error message có chứa transaction hash không
        // hoặc có thể extract từ error nếu có
        if (
          errorMessage.includes('serialize') ||
          errorMessage.includes('BigInt')
        ) {
          // Transaction đã thành công nhưng có lỗi khi parse/log
          // Tìm transactionHash từ error hoặc log
          this.logger.warn(
            `Transaction succeeded but event parsing failed: ${errorMessage}. Certificate will be updated if transactionHash is available.`,
          );
          // Không update certificate vì không có transactionHash
        } else {
          // Transaction thực sự failed
          this.logger.error(
            `Error minting certificate on blockchain: ${errorMessage}`,
          );
        }
        // Certificate đã được lưu với status 'pending'
        // Có thể retry mint sau này hoặc manual update với transactionHash
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error in certificate minting process: ${errorMessage}`,
        errorStack,
      );
    }

    const hydratedCertificate = await this.certificateModel
      .findById(savedCertificate._id)
      .populate('studentId', 'username email fullName role')
      .populate('courseId', 'courseName')
      .populate('submissionId', 'score submittedAt')
      .lean();

    await this.dispatchCertificateNotification({
      certificateId: (savedCertificate._id as Types.ObjectId).toHexString(),
      studentId: (student._id as Types.ObjectId).toHexString(),
      courseName: course.courseName,
      examTitle: exam.title,
    });

    return hydratedCertificate;
  }

  async list(query: CertificatesQueryDto) {
    const {
      page = 1,
      limit = 10,
      status,
      studentId,
      courseId,
      courseName,
      issuedFrom,
      issuedTo,
      teacherId,
    } = query;
    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (studentId) filter.studentId = new Types.ObjectId(studentId);

    if (issuedFrom || issuedTo) {
      const dateFilter: Record<string, Date> = {};
      if (issuedFrom) dateFilter.$gte = new Date(issuedFrom);
      if (issuedTo) dateFilter.$lte = new Date(issuedTo);
      filter.issuedAt = dateFilter;
    }

    let candidateCourseIds: Types.ObjectId[] | undefined;

    if (courseId) {
      candidateCourseIds = [new Types.ObjectId(courseId)];
    }

    if (courseName) {
      const regex = new RegExp(courseName, 'i');
      const nameMatches = await this.courseModel
        .find({ courseName: regex })
        .select('_id')
        .lean();
      const nameIds = nameMatches.map((c) => c._id as Types.ObjectId);
      candidateCourseIds = candidateCourseIds
        ? candidateCourseIds.filter((id) =>
            nameIds.some((nid) => nid.equals(id)),
          )
        : nameIds;
    }

    if (teacherId) {
      const teacherMatches = await this.courseModel
        .find({ teacherId: new Types.ObjectId(teacherId) })
        .select('_id')
        .lean();
      const teacherIds = teacherMatches.map((c) => c._id as Types.ObjectId);
      candidateCourseIds = candidateCourseIds
        ? candidateCourseIds.filter((id) =>
            teacherIds.some((tid) => tid.equals(id)),
          )
        : teacherIds;
    }

    if (candidateCourseIds) {
      if (candidateCourseIds.length === 0) {
        return { items: [], total: 0, page, limit };
      }
      filter.courseId = { $in: candidateCourseIds };
    }

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.certificateModel
        .find(filter)
        .populate('studentId', 'username email fullName role')
        .populate('courseId', 'courseName')
        .populate('submissionId', 'score submittedAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.certificateModel.countDocuments(filter),
    ]);
    const dataResponse = items.map((item) => {
      return {
        student: item.studentId || {},
        course: item.courseId || {},
        submission: item.submissionId || {},
        tokenId: item.tokenId || '',
        ipfsHash: item.ipfsHash || '',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        ipfsImage: (item as any).ipfsImage || '',
        transactionHash: item.transactionHash || '',
        issuedAt: item.issuedAt || '',
        outdateTime: item.outdateTime || '',
        status: item.status || '',
        createdAt: item.createdAt || '',
      };
    });

    return { items: dataResponse, total, page, limit };
  }

  async getById(id: string) {
    const cert = await this.certificateModel
      .findById(id)
      .populate('studentId', 'username email fullName role')
      .populate('courseId', 'courseName')
      .populate('submissionId', 'score submittedAt')
      .lean();
    if (!cert) throw new NotFoundException('Certificate not found');
    return cert;
  }

  async getByStudent(studentId: string, query: CertificatesQueryDto) {
    return this.list({ ...query, studentId });
  }

  async getByCourse(courseId: string, query: CertificatesQueryDto) {
    return this.list({ ...query, courseId });
  }

  async revoke(id: string, reason?: string, transactionHash?: string) {
    const cert = await this.certificateModel.findById(id);
    if (!cert) throw new NotFoundException('Certificate not found');
    cert.status = 'revoked';
    if (transactionHash) cert.transactionHash = transactionHash;
    // reason can be stored later if we add a field
    await cert.save();

    // Return populated data
    return await this.certificateModel
      .findById(id)
      .populate('studentId', 'username email fullName role')
      .populate('courseId', 'courseName')
      .populate('submissionId', 'score submittedAt')
      .lean();
  }

  private async dispatchCertificateNotification(params: {
    certificateId: string;
    studentId: string;
    courseName: string;
    examTitle: string;
  }): Promise<void> {
    try {
      await this.notificationsService.createNotification({
        recipientId: params.studentId,
        audience: 'student',
        category: 'certificate',
        type: 'certificate_issued',
        title: `Certificate issued for ${params.courseName}`,
        message: `You have received a certificate for ${params.courseName}. View the on-chain proof and share your achievement.`,
        actionUrl: `/certificate?highlight=${params.certificateId}`,
        certificateId: params.certificateId,
        metadata: {
          courseName: params.courseName,
          examTitle: params.examTitle,
          certificateId: params.certificateId,
          issuedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to send notification';
      this.logger.warn(
        `Unable to dispatch certificate notification: ${message}`,
      );
    }
  }
}
