import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../database/schemas/user.schema';
import { Course, CourseDocument } from '../../database/schemas/course.schema';
import {
  Submission,
  SubmissionDocument,
} from '../../database/schemas/submission.schema';
import { Exam, ExamDocument } from '../../database/schemas/exam.schema';
import {
  Certificate,
  CertificateDocument,
} from '../../database/schemas/certificate.schema';
import { PinataService } from './pinata.service';
import { CertificateImageService } from './certificate-image.service';

export interface CertificateGenerationResult {
  imageBuffer: Buffer;
  imageIpfsHash: string;
  metadataIpfsHash: string;
  gatewayUrl: string;
  metadataGatewayUrl: string;
  metadata: {
    studentName: string;
    studentEmail: string;
    courseName: string;
    examTitle: string;
    score: number;
    issuedDate: string;
    certificateId?: string;
    identifyNumber?: string;
    expireDate?: string;
  };
}

@Injectable()
export class CertificateGenerationService {
  private readonly logger = new Logger(CertificateGenerationService.name);

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
    private readonly pinataService: PinataService,
    private readonly certificateImageService: CertificateImageService,
  ) {}

  /**
   * Lấy thông tin người dùng và tạo certificate image, upload lên Pinata
   * @param certificateId - ID của certificate
   * @returns Kết quả bao gồm image buffer, IPFS hash, gateway URL và metadata
   */
  async generateAndUploadCertificate(
    certificateId: string,
  ): Promise<CertificateGenerationResult> {
    try {
      // 1. Lấy thông tin certificate và các thông tin liên quan
      const certificateData = await this.getCertificateData(certificateId);

      // 2. Tạo ảnh certificate
      this.logger.log(
        `Generating certificate image for student: ${certificateData.studentName}`,
      );
      const imageBuffer =
        await this.certificateImageService.generateCertificateImage({
          studentName: certificateData.studentName,
          courseName: certificateData.courseName,
          examTitle: certificateData.examTitle,
          score: certificateData.score,
          issuedDate: certificateData.issuedDate,
          certificateId: certificateId,
          studentImageUrl: certificateData.studentImageUrl,
          identifyNumber: certificateData.identifyNumber,
          expireDate: certificateData.expireDate,
        });

      // 3. Upload ảnh lên Pinata
      this.logger.log('Uploading certificate image to Pinata...');
      const fileName = `certificate-${certificateId}-${Date.now()}.png`;
      const imageIpfsHash = await this.pinataService.uploadFile(
        imageBuffer,
        fileName,
        {
          name: `Certificate ${certificateId}`,
          description: `Certificate for ${certificateData.studentName} - ${certificateData.courseName}`,
        },
      );

      // 4. Tạo metadata JSON và upload lên Pinata
      const metadata = {
        name: `Certificate ${certificateId}`,
        description: `Certificate of completion for ${certificateData.courseName}`,
        image: this.pinataService.getGatewayUrl(imageIpfsHash),
        attributes: [
          {
            trait_type: 'Student Name',
            value: certificateData.studentName,
          },
          {
            trait_type: 'Course',
            value: certificateData.courseName,
          },
          {
            trait_type: 'Exam',
            value: certificateData.examTitle,
          },
          {
            trait_type: 'Score',
            value: certificateData.score.toString(),
          },
          {
            trait_type: 'Issued Date',
            value: certificateData.issuedDate,
          },
          {
            trait_type: 'Identification Number',
            value: certificateData.identifyNumber ?? '',
          },
          {
            trait_type: 'Expire Date',
            value: certificateData.expireDate ?? '',
          },
        ],
        studentName: certificateData.studentName,
        studentEmail: certificateData.studentEmail,
        courseName: certificateData.courseName,
        examTitle: certificateData.examTitle,
        score: certificateData.score,
        issuedDate: certificateData.issuedDate,
        certificateId: certificateId,
        identifyNumber: certificateData.identifyNumber,
        expireDate: certificateData.expireDate,
        issuer: 'Academix Education Platform',
      };

      this.logger.log('Uploading certificate metadata to Pinata...');
      const metadataIpfsHash = await this.pinataService.uploadJSON(
        metadata,
        `certificate-metadata-${certificateId}`,
      );

      const gatewayUrl = this.pinataService.getGatewayUrl(imageIpfsHash);
      const metadataGatewayUrl =
        this.pinataService.getGatewayUrl(metadataIpfsHash);

      this.logger.log(
        `Certificate generated and uploaded successfully. Image IPFS: ${imageIpfsHash}, Metadata IPFS: ${metadataIpfsHash}`,
      );

      return {
        imageBuffer,
        imageIpfsHash,
        metadataIpfsHash,
        gatewayUrl,
        metadataGatewayUrl,
        metadata: {
          studentName: certificateData.studentName,
          studentEmail: certificateData.studentEmail,
          courseName: certificateData.courseName,
          examTitle: certificateData.examTitle,
          score: certificateData.score,
          issuedDate: certificateData.issuedDate,
          certificateId: certificateId,
          identifyNumber: certificateData.identifyNumber,
          expireDate: certificateData.expireDate,
        },
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Error generating and uploading certificate: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * Lấy thông tin đầy đủ của certificate từ database
   * @param certificateId - ID của certificate document
   * @returns Dữ liệu certificate đã populate
   */
  private async getCertificateData(certificateId: string): Promise<{
    studentName: string;
    studentEmail: string;
    courseName: string;
    examTitle: string;
    score: number;
    issuedDate: string;
    studentImageUrl?: string;
    identifyNumber?: string;
    expireDate?: string;
  }> {
    // Query certificate với populate các thông tin liên quan
    const certificate = await this.certificateModel
      .findById(certificateId)
      .populate('studentId')
      .populate('courseId')
      .populate('submissionId')
      .lean();

    if (!certificate) {
      throw new NotFoundException('Certificate not found');
    }

    const student = certificate.studentId as unknown as UserDocument;
    const course = certificate.courseId as unknown as CourseDocument;
    const submission =
      certificate.submissionId as unknown as SubmissionDocument;

    if (!student || !course || !submission) {
      throw new NotFoundException('Certificate data incomplete');
    }

    // Lấy exam từ submission
    const exam = await this.examModel.findById(submission.examId).lean();
    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    const issuedDate = certificate.issuedAt
      ? new Date(certificate.issuedAt).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });

    // Tính expireDate = ngày thi (endTime) + 2 năm
    const examEndDate = exam.endTime ? new Date(exam.endTime) : new Date();
    const expireDateObj = new Date(examEndDate);
    expireDateObj.setFullYear(examEndDate.getFullYear() + 2);
    const expireDate = expireDateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    return {
      studentName: student.fullName || student.username,
      studentEmail: student.email,
      courseName: course.courseName,
      examTitle: exam.title,
      score: submission.score,
      issuedDate,
      studentImageUrl: student.imageUrl,
      identifyNumber: student.citizenId,
      expireDate,
    };
  }
}
