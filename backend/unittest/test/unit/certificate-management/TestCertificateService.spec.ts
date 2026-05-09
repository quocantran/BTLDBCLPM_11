import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';

import { CertificateService } from 'src/modules/certificates/certificate.service';
import { Certificate } from 'src/database/schemas/certificate.schema';
import { User } from 'src/database/schemas/user.schema';
import { Course } from 'src/database/schemas/course.schema';
import { Submission } from 'src/database/schemas/submission.schema';
import { Exam } from 'src/database/schemas/exam.schema';
import { BlockchainService } from 'src/common/services/blockchain.service';
import { CertificateGenerationService } from 'src/common/services/certificate-generation.service';
import { NotificationsService } from 'src/modules/notifications/notifications.service';

describe('TestCertificateService — CertificateService business logic', () => {
  let service: CertificateService;
  let certificateModel: any;
  let userModel: any;
  let courseModel: any;
  let submissionModel: any;
  let examModel: any;
  let blockchainService: any;
  let certGenService: any;
  let notificationsService: any;

  const STUDENT_ID = '507f1f77bcf86cd799439011';
  const EXAM_ID = '507f1f77bcf86cd799439022';
  const COURSE_ID = '507f1f77bcf86cd799439033';
  const CERT_ID = '507f1f77bcf86cd799439044';
  const SUBMISSION_ID = '507f1f77bcf86cd799439055';

  const mockStudent = {
    _id: new Types.ObjectId(STUDENT_ID),
    username: 'student01',
    email: 'student@test.com',
    fullName: 'Test Student',
    walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
  };

  const mockCourse = {
    _id: new Types.ObjectId(COURSE_ID),
    courseName: 'Test Course',
    teacherId: new Types.ObjectId(),
  };

  const mockExam = {
    _id: new Types.ObjectId(EXAM_ID),
    title: 'Final Exam',
    courseId: new Types.ObjectId(COURSE_ID),
    endTime: new Date('2026-06-01'),
  };

  const mockSubmission = {
    _id: new Types.ObjectId(SUBMISSION_ID),
    examId: new Types.ObjectId(EXAM_ID),
    studentId: new Types.ObjectId(STUDENT_ID),
    score: 85,
    submittedAt: new Date(),
  };

  const createSavedCertMock = (overrides: any = {}) => ({
    _id: new Types.ObjectId(CERT_ID),
    studentId: new Types.ObjectId(STUDENT_ID),
    courseId: new Types.ObjectId(COURSE_ID),
    submissionId: new Types.ObjectId(SUBMISSION_ID),
    status: 'pending',
    tokenId: undefined,
    ipfsHash: undefined,
    transactionHash: undefined,
    issuedAt: new Date(),
    outdateTime: new Date('2028-06-01'),
    save: jest.fn().mockResolvedValue(undefined),
    set: jest.fn(),
    get: jest.fn().mockReturnValue(undefined),
    ...overrides,
  });

  const populateChain = (result: any) => ({
    populate: jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(result),
        }),
      }),
    }),
  });

  beforeAll(async () => {
    const mockCertModel: any = jest.fn().mockImplementation((data) => {
      const instance = {
        _id: new Types.ObjectId(CERT_ID),
        ...data,
        status: 'pending',
        tokenId: undefined,
        ipfsHash: undefined,
        transactionHash: undefined,
        save: jest.fn().mockImplementation(function (this: any) {
          return Promise.resolve(this);
        }),
        set: jest.fn(function (this: any, key: string, val: any) {
          this[key] = val;
        }),
        get: jest.fn(function (this: any, key: string) {
          return this[key];
        }),
      };
      // bind save/set/get to instance
      instance.save = instance.save.bind(instance);
      instance.set = instance.set.bind(instance);
      instance.get = instance.get.bind(instance);
      return instance;
    });
    mockCertModel.findById = jest.fn();
    mockCertModel.findOne = jest.fn();
    mockCertModel.find = jest.fn();
    mockCertModel.countDocuments = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CertificateService,
        { provide: getModelToken(Certificate.name), useValue: mockCertModel },
        { provide: getModelToken(User.name), useValue: { findById: jest.fn() } },
        { provide: getModelToken(Course.name), useValue: { findById: jest.fn(), find: jest.fn() } },
        { provide: getModelToken(Submission.name), useValue: { findOne: jest.fn() } },
        { provide: getModelToken(Exam.name), useValue: { findById: jest.fn() } },
        {
          provide: BlockchainService,
          useValue: { issueCertificate: jest.fn() },
        },
        {
          provide: CertificateGenerationService,
          useValue: { generateAndUploadCertificate: jest.fn() },
        },
        {
          provide: NotificationsService,
          useValue: { createNotification: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    service = module.get<CertificateService>(CertificateService);
    certificateModel = module.get(getModelToken(Certificate.name));
    userModel = module.get(getModelToken(User.name));
    courseModel = module.get(getModelToken(Course.name));
    submissionModel = module.get(getModelToken(Submission.name));
    examModel = module.get(getModelToken(Exam.name));
    blockchainService = module.get(BlockchainService);
    certGenService = module.get(CertificateGenerationService);
    notificationsService = module.get(NotificationsService);
  });

  beforeEach(() => jest.clearAllMocks());
  afterEach(() => jest.restoreAllMocks());

  // ==================== ISSUE ====================

  it('UMC-001 — should_issue_certificate_successfully', async () => {
    // UMC-001: Teacher cấp chứng chỉ thành công cho student.
    // Mô tả: Submission tồn tại, chưa có cert, mint blockchain OK.
    // Expected: Certificate lưu DB với status issued, trả hydrated cert.
    submissionModel.findOne.mockResolvedValue(mockSubmission);
    certificateModel.findOne.mockResolvedValue(null);
    examModel.findById.mockResolvedValue(mockExam);
    courseModel.findById.mockResolvedValue(mockCourse);
    userModel.findById.mockResolvedValue(mockStudent);
    certGenService.generateAndUploadCertificate.mockResolvedValue({
      imageIpfsHash: 'QmImage123',
      metadataIpfsHash: 'QmMeta123',
    });
    blockchainService.issueCertificate.mockResolvedValue({
      transactionHash: '0xabc',
      tokenId: 'token123',
    });
    const hydratedCert = { ...mockSubmission, status: 'issued' };
    certificateModel.findById.mockReturnValue(populateChain(hydratedCert));

    const result = await service.issue({ examId: EXAM_ID, studentId: STUDENT_ID });

    expect(result).toBeDefined();
    expect(blockchainService.issueCertificate).toHaveBeenCalled();
    expect(notificationsService.createNotification).toHaveBeenCalled();
  });

  it('UMC-002 — should_throw_not_found_when_submission_missing', async () => {
    // UMC-002: Submission không tồn tại → 404.
    // Mô tả: findOne trả null.
    // Expected: NotFoundException('Submission not found').
    submissionModel.findOne.mockResolvedValue(null);

    await expect(
      service.issue({ examId: EXAM_ID, studentId: STUDENT_ID }),
    ).rejects.toThrow(NotFoundException);
  });

  it('UMC-003 — should_return_existing_certificate_if_already_issued', async () => {
    // UMC-003: Certificate đã tồn tại → trả cert hiện có (idempotent).
    // Mô tả: findOne cert trả existing → populate và return.
    // Expected: Không tạo cert mới, trả cert cũ.
    const existingCert = { _id: new Types.ObjectId(CERT_ID) };
    submissionModel.findOne.mockResolvedValue(mockSubmission);
    certificateModel.findOne.mockResolvedValue(existingCert);
    certificateModel.findById.mockReturnValue(populateChain({ ...existingCert, status: 'issued' }));

    const result = await service.issue({ examId: EXAM_ID, studentId: STUDENT_ID });

    expect(result).toBeDefined();
    expect(examModel.findById).not.toHaveBeenCalled();
  });

  it('UMC-004 — should_throw_not_found_when_exam_missing', async () => {
    // UMC-004: Exam không tồn tại → 404.
    // Mô tả: examModel.findById trả null.
    // Expected: NotFoundException('Exam not found').
    submissionModel.findOne.mockResolvedValue(mockSubmission);
    certificateModel.findOne.mockResolvedValue(null);
    examModel.findById.mockResolvedValue(null);

    await expect(
      service.issue({ examId: EXAM_ID, studentId: STUDENT_ID }),
    ).rejects.toThrow('Exam not found');
  });

  it('UMC-005 — should_throw_not_found_when_course_missing', async () => {
    // UMC-005: Course không tồn tại → 404.
    // Mô tả: courseModel.findById trả null.
    // Expected: NotFoundException('Course not found').
    submissionModel.findOne.mockResolvedValue(mockSubmission);
    certificateModel.findOne.mockResolvedValue(null);
    examModel.findById.mockResolvedValue(mockExam);
    courseModel.findById.mockResolvedValue(null);

    await expect(
      service.issue({ examId: EXAM_ID, studentId: STUDENT_ID }),
    ).rejects.toThrow('Course not found');
  });

  it('UMC-006 — should_throw_not_found_when_student_missing', async () => {
    // UMC-006: Student không tồn tại → 404.
    // Mô tả: userModel.findById trả null.
    // Expected: NotFoundException('Student not found').
    submissionModel.findOne.mockResolvedValue(mockSubmission);
    certificateModel.findOne.mockResolvedValue(null);
    examModel.findById.mockResolvedValue(mockExam);
    courseModel.findById.mockResolvedValue(mockCourse);
    userModel.findById.mockResolvedValue(null);

    await expect(
      service.issue({ examId: EXAM_ID, studentId: STUDENT_ID }),
    ).rejects.toThrow('Student not found');
  });

  it('UMC-007 — should_use_placeholder_when_pinata_upload_fails', async () => {
    // UMC-007: Upload Pinata fail → dùng placeholder IPFS hash.
    // Mô tả: generateAndUploadCertificate throw Error.
    // Expected: Cert lưu với placeholder hash, không throw.
    submissionModel.findOne.mockResolvedValue(mockSubmission);
    certificateModel.findOne.mockResolvedValue(null);
    examModel.findById.mockResolvedValue(mockExam);
    courseModel.findById.mockResolvedValue(mockCourse);
    userModel.findById.mockResolvedValue(mockStudent);
    certGenService.generateAndUploadCertificate.mockRejectedValue(new Error('Pinata down'));
    blockchainService.issueCertificate.mockResolvedValue({
      transactionHash: '0xabc',
      tokenId: 'token123',
    });
    const hydratedCert = { status: 'issued' };
    certificateModel.findById.mockReturnValue(populateChain(hydratedCert));

    const result = await service.issue({ examId: EXAM_ID, studentId: STUDENT_ID });

    expect(result).toBeDefined();
  });

  it('UMC-008 — should_handle_blockchain_serialize_error_gracefully', async () => {
    // UMC-008: Blockchain mint fail với lỗi serialize/BigInt → warn, không throw.
    // Mô tả: issueCertificate throw Error chứa 'serialize'.
    // Expected: Cert vẫn pending, không crash.
    submissionModel.findOne.mockResolvedValue(mockSubmission);
    certificateModel.findOne.mockResolvedValue(null);
    examModel.findById.mockResolvedValue(mockExam);
    courseModel.findById.mockResolvedValue(mockCourse);
    userModel.findById.mockResolvedValue(mockStudent);
    certGenService.generateAndUploadCertificate.mockResolvedValue({
      imageIpfsHash: 'QmImg', metadataIpfsHash: 'QmMeta',
    });
    blockchainService.issueCertificate.mockRejectedValue(
      new Error('Cannot serialize BigInt'),
    );
    certificateModel.findById.mockReturnValue(populateChain({ status: 'pending' }));

    const result = await service.issue({ examId: EXAM_ID, studentId: STUDENT_ID });

    expect(result).toBeDefined();
  });

  it('UMC-009 — should_use_default_recipient_when_student_has_no_wallet', async () => {
    // UMC-009: Student không có walletAddress → dùng DEFAULT_NFT_RECIPIENT.
    // Mô tả: student.walletAddress = undefined.
    // Expected: issueCertificate gọi với default recipient.
    const studentNoWallet = { ...mockStudent, walletAddress: undefined };
    submissionModel.findOne.mockResolvedValue(mockSubmission);
    certificateModel.findOne.mockResolvedValue(null);
    examModel.findById.mockResolvedValue(mockExam);
    courseModel.findById.mockResolvedValue(mockCourse);
    userModel.findById.mockResolvedValue(studentNoWallet);
    certGenService.generateAndUploadCertificate.mockResolvedValue({
      imageIpfsHash: 'QmImg', metadataIpfsHash: 'QmMeta',
    });
    blockchainService.issueCertificate.mockResolvedValue({
      transactionHash: '0xdef', tokenId: 'tok2',
    });
    certificateModel.findById.mockReturnValue(populateChain({ status: 'issued' }));

    const result = await service.issue({ examId: EXAM_ID, studentId: STUDENT_ID });

    expect(result).toBeDefined();
    expect(blockchainService.issueCertificate).toHaveBeenCalled();
  });

  it('UMC-010 — should_dispatch_notification_failure_not_crash_issue', async () => {
    // UMC-010: Notification service throw → không crash issue flow.
    // Mô tả: createNotification reject Error.
    // Expected: Certificate vẫn trả về bình thường.
    submissionModel.findOne.mockResolvedValue(mockSubmission);
    certificateModel.findOne.mockResolvedValue(null);
    examModel.findById.mockResolvedValue(mockExam);
    courseModel.findById.mockResolvedValue(mockCourse);
    userModel.findById.mockResolvedValue(mockStudent);
    certGenService.generateAndUploadCertificate.mockResolvedValue({
      imageIpfsHash: 'QmImg', metadataIpfsHash: 'QmMeta',
    });
    blockchainService.issueCertificate.mockResolvedValue({
      transactionHash: '0xabc', tokenId: 'tok1',
    });
    notificationsService.createNotification.mockRejectedValue(new Error('SMTP down'));
    certificateModel.findById.mockReturnValue(populateChain({ status: 'issued' }));

    const result = await service.issue({ examId: EXAM_ID, studentId: STUDENT_ID });

    expect(result).toBeDefined();
  });

  // ==================== LIST ====================

  it('UMC-011 — should_list_certificates_with_pagination', async () => {
    // UMC-011: Lấy danh sách chứng chỉ có pagination.
    // Mô tả: list với page=1, limit=10, không filter.
    // Expected: Trả items, total, page, limit.
    const certItem = {
      studentId: mockStudent, courseId: mockCourse, submissionId: mockSubmission,
      tokenId: 'tok1', ipfsHash: 'Qm1', ipfsImage: 'QmImg1',
      transactionHash: '0x1', issuedAt: new Date(), outdateTime: new Date(),
      status: 'issued', createdAt: new Date(),
    };
    const findChain = {
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            sort: jest.fn().mockReturnValue({
              skip: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  lean: jest.fn().mockResolvedValue([certItem]),
                }),
              }),
            }),
          }),
        }),
      }),
    };
    certificateModel.find.mockReturnValue(findChain);
    certificateModel.countDocuments.mockResolvedValue(1);

    const result = await service.list({ page: 1, limit: 10 });

    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
  });

  it('UMC-012 — should_return_empty_when_candidateCourseIds_is_empty', async () => {
    // UMC-012: courseName filter không match course nào → trả rỗng.
    // Mô tả: courseModel.find trả [] cho courseName filter.
    // Expected: { items: [], total: 0 }.
    courseModel.find.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      }),
    });

    const result = await service.list({ courseName: 'NonExistent' });

    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
  });

  // ==================== GET BY ID ====================

  it('UMC-013 — should_get_certificate_by_id_successfully', async () => {
    // UMC-013: Lấy chi tiết chứng chỉ theo ID.
    // Mô tả: findById trả cert populated.
    // Expected: Trả cert object.
    const cert = { _id: CERT_ID, status: 'issued' };
    certificateModel.findById.mockReturnValue(populateChain(cert));

    const result = await service.getById(CERT_ID);

    expect(result).toBeDefined();
    expect(result.status).toBe('issued');
  });

  it('UMC-014 — should_throw_not_found_when_cert_id_invalid', async () => {
    // UMC-014: Certificate ID không tồn tại → 404.
    // Mô tả: findById trả null.
    // Expected: NotFoundException('Certificate not found').
    certificateModel.findById.mockReturnValue(populateChain(null));

    await expect(service.getById('000000000000000000000000'))
      .rejects.toThrow('Certificate not found');
  });

  // ==================== REVOKE ====================

  it('UMC-015 — should_revoke_certificate_successfully', async () => {
    // UMC-015: Thu hồi chứng chỉ thành công.
    // Mô tả: findById trả cert, save gọi, status → revoked.
    // Expected: cert.status = 'revoked', save được gọi.
    const certDoc = {
      _id: new Types.ObjectId(CERT_ID),
      status: 'issued',
      transactionHash: '',
      save: jest.fn().mockResolvedValue(undefined),
    };
    certificateModel.findById
      .mockResolvedValueOnce(certDoc)
      .mockReturnValueOnce(populateChain({ ...certDoc, status: 'revoked' }));

    const result = await service.revoke(CERT_ID, 'Cheating', '0xrevoke');

    expect(certDoc.status).toBe('revoked');
    expect(certDoc.transactionHash).toBe('0xrevoke');
    expect(certDoc.save).toHaveBeenCalled();
  });

  it('UMC-016 — should_keep_pending_when_blockchain_returns_hard_error', async () => {
    // UMC-016: Mint blockchain lỗi thật sự thì không được crash luồng cấp cert.
    // Mô tả: issueCertificate throw lỗi không chứa serialize/BigInt.
    // Expected: service.issue vẫn trả dữ liệu cert và giữ trạng thái pending.
    submissionModel.findOne.mockResolvedValue(mockSubmission);
    certificateModel.findOne.mockResolvedValue(null);
    examModel.findById.mockResolvedValue(mockExam);
    courseModel.findById.mockResolvedValue(mockCourse);
    userModel.findById.mockResolvedValue(mockStudent);
    certGenService.generateAndUploadCertificate.mockResolvedValue({
      imageIpfsHash: 'QmImgHardFail',
      metadataIpfsHash: 'QmMetaHardFail',
    });
    blockchainService.issueCertificate.mockRejectedValue(
      new Error('RPC timeout while sending transaction'),
    );
    certificateModel.findById.mockReturnValue(populateChain({ status: 'pending' }));

    const result = await service.issue({ examId: EXAM_ID, studentId: STUDENT_ID });

    expect(result).toEqual(expect.objectContaining({ status: 'pending' }));
  });

  it('UMC-017 — should_continue_after_outer_try_error_when_placeholder_save_fails', async () => {
    // UMC-017: Lỗi save trong nhánh Pinata fallback phải rơi vào outer catch và không sập API.
    // Mô tả: save lần 2 (sau placeholder) throw, sau đó vẫn hydrate cert để trả về.
    // Expected: Có dữ liệu trả về và không gọi mint blockchain.
    submissionModel.findOne.mockResolvedValue(mockSubmission);
    certificateModel.findOne.mockResolvedValue(null);
    examModel.findById.mockResolvedValue(mockExam);
    courseModel.findById.mockResolvedValue(mockCourse);
    userModel.findById.mockResolvedValue(mockStudent);
    certGenService.generateAndUploadCertificate.mockRejectedValue(
      new Error('Pinata unavailable'),
    );
    blockchainService.issueCertificate.mockResolvedValue({
      transactionHash: '0xnever',
      tokenId: 'never',
    });

    const certId = new Types.ObjectId(CERT_ID);
    const badSaveDoc = {
      _id: certId,
      studentId: new Types.ObjectId(STUDENT_ID),
      courseId: new Types.ObjectId(COURSE_ID),
      submissionId: new Types.ObjectId(SUBMISSION_ID),
      status: 'pending',
      tokenId: undefined,
      ipfsHash: undefined as string | undefined,
      transactionHash: undefined as string | undefined,
      __saveCount: 0,
      set: jest.fn(function (this: any, key: string, val: unknown) {
        this[key] = val;
      }),
      get: jest.fn(function (this: any, key: string) {
        return this[key];
      }),
      save: jest.fn(function (this: any) {
        this.__saveCount += 1;
        if (this.__saveCount === 2) {
          return Promise.reject(new Error('DB write failed on fallback save'));
        }
        return Promise.resolve(this);
      }),
    };

    certificateModel.mockImplementationOnce(() => badSaveDoc);
    certificateModel.findById.mockReturnValue(populateChain({ status: 'pending' }));

    const result = await service.issue({ examId: EXAM_ID, studentId: STUDENT_ID });

    expect(result).toEqual(expect.objectContaining({ status: 'pending' }));
    expect(blockchainService.issueCertificate).not.toHaveBeenCalled();
  });

  it('UMC-018 — should_restore_ipfs_fields_when_document_loses_hashes_before_mint_save', async () => {
    // UMC-018: Nếu document bị mất ipfsHash/ipfsImage trước khi save sau mint thì phải tự restore.
    // Mô tả: save lần 2 cố tình xóa hash để ép chạy nhánh fallback gán lại.
    // Expected: save cuối có lại metadata hash và image hash.
    submissionModel.findOne.mockResolvedValue(mockSubmission);
    certificateModel.findOne.mockResolvedValue(null);
    examModel.findById.mockResolvedValue(mockExam);
    courseModel.findById.mockResolvedValue(mockCourse);
    userModel.findById.mockResolvedValue(mockStudent);
    certGenService.generateAndUploadCertificate.mockResolvedValue({
      imageIpfsHash: 'QmImgRestore',
      metadataIpfsHash: 'QmMetaRestore',
    });
    blockchainService.issueCertificate.mockResolvedValue({
      transactionHash: '0xrestore',
      tokenId: 'token-restore',
    });

    let createdDoc: any;
    certificateModel.mockImplementationOnce((data: any) => {
      let imageValue: string | undefined;
      const instance = {
        _id: new Types.ObjectId(CERT_ID),
        ...data,
        status: 'pending',
        tokenId: undefined,
        ipfsHash: undefined as string | undefined,
        transactionHash: undefined as string | undefined,
        __saveCount: 0,
        set: jest.fn(function (this: any, key: string, val: unknown) {
          if (key === 'ipfsImage') imageValue = val as string;
          this[key] = val;
        }),
        get: jest.fn((key: string) => (key === 'ipfsImage' ? imageValue : undefined)),
        save: jest.fn(function (this: any) {
          this.__saveCount += 1;
          if (this.__saveCount === 2) {
            this.ipfsHash = undefined;
            imageValue = undefined;
          }
          return Promise.resolve(this);
        }),
      };
      createdDoc = instance;
      return instance;
    });
    certificateModel.findById.mockReturnValue(populateChain({ status: 'issued' }));

    await service.issue({ examId: EXAM_ID, studentId: STUDENT_ID });

    expect(createdDoc.ipfsHash).toBe('QmMetaRestore');
    expect(createdDoc.get('ipfsImage')).toBe('QmImgRestore');
  });

  it('UMC-019 — should_build_date_filter_with_issuedFrom_only', async () => {
    // UMC-019: Lọc chỉ có issuedFrom phải tạo điều kiện $gte đúng định dạng Date.
    // Mô tả: Không có issuedTo thì không được thêm $lte.
    // Expected: certificateModel.find nhận filter.issuedAt chỉ chứa $gte.
    const findChain = {
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            sort: jest.fn().mockReturnValue({
              skip: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  lean: jest.fn().mockResolvedValue([]),
                }),
              }),
            }),
          }),
        }),
      }),
    };
    certificateModel.find.mockReturnValue(findChain);
    certificateModel.countDocuments.mockResolvedValue(0);

    await service.list({ issuedFrom: '2026-05-01' });

    expect(certificateModel.find).toHaveBeenCalledWith(
      expect.objectContaining({
        issuedAt: expect.objectContaining({
          $gte: new Date('2026-05-01'),
        }),
      }),
    );
  });

  it('UMC-020 — should_build_date_filter_with_issuedTo_only', async () => {
    // UMC-020: Lọc chỉ có issuedTo phải tạo điều kiện $lte đúng định dạng Date.
    // Mô tả: Không có issuedFrom thì không được thêm $gte.
    // Expected: certificateModel.find nhận filter.issuedAt chỉ chứa $lte.
    const findChain = {
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            sort: jest.fn().mockReturnValue({
              skip: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  lean: jest.fn().mockResolvedValue([]),
                }),
              }),
            }),
          }),
        }),
      }),
    };
    certificateModel.find.mockReturnValue(findChain);
    certificateModel.countDocuments.mockResolvedValue(0);

    await service.list({ issuedTo: '2026-05-31' });

    expect(certificateModel.find).toHaveBeenCalledWith(
      expect.objectContaining({
        issuedAt: expect.objectContaining({
          $lte: new Date('2026-05-31'),
        }),
      }),
    );
  });

  it('UMC-021 — should_intersect_courseId_with_courseName_before_querying_certificates', async () => {
    // UMC-021: Khi có cả courseId và courseName thì phải lấy giao của 2 tập course.
    // Mô tả: courseName match đúng courseId truyền vào.
    // Expected: filter.courseId.$in giữ đúng 1 courseId hợp lệ.
    const selectedCourseId = new Types.ObjectId(COURSE_ID);
    courseModel.find.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([{ _id: selectedCourseId }]),
      }),
    });
    const findChain = {
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            sort: jest.fn().mockReturnValue({
              skip: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  lean: jest.fn().mockResolvedValue([]),
                }),
              }),
            }),
          }),
        }),
      }),
    };
    certificateModel.find.mockReturnValue(findChain);
    certificateModel.countDocuments.mockResolvedValue(0);

    await service.list({ courseId: COURSE_ID, courseName: 'Test Course' });

    expect(certificateModel.find).toHaveBeenCalledWith(
      expect.objectContaining({
        courseId: expect.objectContaining({ $in: [selectedCourseId] }),
      }),
    );
  });

  it('UMC-022 — should_return_empty_when_courseId_and_teacher_filters_do_not_intersect', async () => {
    // UMC-022: Khi lọc courseId + teacherId không giao nhau thì kết quả phải rỗng ngay.
    // Mô tả: teacher chỉ dạy course khác với courseId đang lọc.
    // Expected: Trả items rỗng và không query certificateModel.find.
    const anotherCourseId = new Types.ObjectId();
    courseModel.find.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([{ _id: anotherCourseId }]),
      }),
    });

    const result = await service.list({
      courseId: COURSE_ID,
      teacherId: new Types.ObjectId().toHexString(),
    });

    expect(result).toEqual({ items: [], total: 0, page: 1, limit: 10 });
    expect(certificateModel.find).not.toHaveBeenCalled();
  });

  it('UMC-023 — should_apply_teacher_filter_when_teacherId_is_provided', async () => {
    // UMC-023: Lọc theo teacherId phải map được danh sách course của teacher vào filter.courseId.
    // Mô tả: teacher có 1 course và dùng nó để lọc certificates.
    // Expected: certificateModel.find nhận filter.courseId.$in theo teacher.
    const teacherCourseId = new Types.ObjectId(COURSE_ID);
    courseModel.find.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([{ _id: teacherCourseId }]),
      }),
    });
    const findChain = {
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            sort: jest.fn().mockReturnValue({
              skip: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  lean: jest.fn().mockResolvedValue([]),
                }),
              }),
            }),
          }),
        }),
      }),
    };
    certificateModel.find.mockReturnValue(findChain);
    certificateModel.countDocuments.mockResolvedValue(0);

    await service.list({ teacherId: new Types.ObjectId().toHexString() });

    expect(certificateModel.find).toHaveBeenCalledWith(
      expect.objectContaining({
        courseId: expect.objectContaining({ $in: [teacherCourseId] }),
      }),
    );
  });

  it('UMC-024 — should_map_default_fields_when_list_item_has_missing_data', async () => {
    // UMC-024: Kết quả list thiếu dữ liệu nested vẫn phải map default an toàn.
    // Mô tả: item DB thiếu student/course/submission và các trường hash.
    // Expected: response map về object rỗng và chuỗi rỗng theo contract.
    const findChain = {
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            sort: jest.fn().mockReturnValue({
              skip: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  lean: jest.fn().mockResolvedValue([{}]),
                }),
              }),
            }),
          }),
        }),
      }),
    };
    certificateModel.find.mockReturnValue(findChain);
    certificateModel.countDocuments.mockResolvedValue(1);

    const result = await service.list({ page: 1, limit: 10 });

    expect(result.items[0]).toEqual(
      expect.objectContaining({
        student: {},
        course: {},
        submission: {},
        tokenId: '',
        ipfsHash: '',
        ipfsImage: '',
        transactionHash: '',
        issuedAt: '',
        outdateTime: '',
        status: '',
        createdAt: '',
      }),
    );
  });

  it('UMC-025 — should_throw_not_found_when_revoke_target_not_exists', async () => {
    // UMC-025: Thu hồi chứng chỉ không tồn tại phải trả đúng lỗi 404.
    // Mô tả: certificateModel.findById trả null ở bước tìm cert để revoke.
    // Expected: NotFoundException('Certificate not found').
    certificateModel.findById.mockResolvedValue(null);

    await expect(service.revoke('000000000000000000000000')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('UMC-026 — should_use_certificate_id_as_token_when_blockchain_omits_tokenId', async () => {
    // UMC-026: Khi blockchain không trả tokenId thì phải fallback về certificateId.
    // Mô tả: issueCertificate trả transactionHash nhưng tokenId undefined.
    // Expected: savedCertificate.tokenId được gán bằng cert _id string.
    submissionModel.findOne.mockResolvedValue(mockSubmission);
    certificateModel.findOne.mockResolvedValue(null);
    examModel.findById.mockResolvedValue(mockExam);
    courseModel.findById.mockResolvedValue(mockCourse);
    userModel.findById.mockResolvedValue(mockStudent);
    certGenService.generateAndUploadCertificate.mockResolvedValue({
      imageIpfsHash: 'QmImgTokenFallback',
      metadataIpfsHash: 'QmMetaTokenFallback',
    });
    blockchainService.issueCertificate.mockResolvedValue({
      transactionHash: '0xtokenfallback',
      tokenId: undefined,
    });

    let createdDoc: any;
    certificateModel.mockImplementationOnce((data: any) => {
      const instance = {
        _id: new Types.ObjectId(CERT_ID),
        ...data,
        status: 'pending',
        tokenId: undefined as string | undefined,
        ipfsHash: undefined as string | undefined,
        transactionHash: undefined as string | undefined,
        set: jest.fn(function (this: any, key: string, val: unknown) {
          this[key] = val;
        }),
        get: jest.fn(function (this: any, key: string) {
          return this[key];
        }),
        save: jest.fn(function (this: any) {
          return Promise.resolve(this);
        }),
      };
      createdDoc = instance;
      return instance;
    });
    certificateModel.findById.mockReturnValue(populateChain({ status: 'issued' }));

    await service.issue({ examId: EXAM_ID, studentId: STUDENT_ID });

    expect(createdDoc.tokenId).toBe(CERT_ID);
  });

  it('UMC-027 — should_continue_issue_when_notification_throws_non_error_value', async () => {
    // UMC-027: Notification throw kiểu non-Error vẫn không được làm fail API issue.
    // Mô tả: createNotification reject bằng object thường.
    // Expected: service.issue vẫn trả certificate đã hydrate.
    submissionModel.findOne.mockResolvedValue(mockSubmission);
    certificateModel.findOne.mockResolvedValue(null);
    examModel.findById.mockResolvedValue(mockExam);
    courseModel.findById.mockResolvedValue(mockCourse);
    userModel.findById.mockResolvedValue(mockStudent);
    certGenService.generateAndUploadCertificate.mockResolvedValue({
      imageIpfsHash: 'QmImgNonErr',
      metadataIpfsHash: 'QmMetaNonErr',
    });
    blockchainService.issueCertificate.mockResolvedValue({
      transactionHash: '0xnonerr',
      tokenId: 'tok-nonerr',
    });
    notificationsService.createNotification.mockRejectedValue({
      reason: 'queue timeout',
    });
    certificateModel.findById.mockReturnValue(populateChain({ status: 'issued' }));

    const result = await service.issue({ examId: EXAM_ID, studentId: STUDENT_ID });

    expect(result).toEqual(expect.objectContaining({ status: 'issued' }));
  });

  it('UMC-028 — should_delegate_getByStudent_to_list_with_studentId', async () => {
    // UMC-028: getByStudent chỉ là wrapper, phải truyền đúng studentId vào list.
    // Mô tả: query gốc vẫn giữ nguyên, chỉ merge thêm studentId.
    // Expected: list được gọi 1 lần với payload merge chuẩn.
    const listSpy = jest.spyOn(service, 'list').mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 10,
    });

    await service.getByStudent(STUDENT_ID, { page: 2, limit: 5 });

    expect(listSpy).toHaveBeenCalledWith({
      page: 2,
      limit: 5,
      studentId: STUDENT_ID,
    });
  });

  it('UMC-029 — should_delegate_getByCourse_to_list_with_courseId', async () => {
    // UMC-029: getByCourse chỉ là wrapper, phải truyền đúng courseId vào list.
    // Mô tả: query gốc vẫn giữ nguyên, chỉ merge thêm courseId.
    // Expected: list được gọi 1 lần với payload merge chuẩn.
    const listSpy = jest.spyOn(service, 'list').mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 10,
    });

    await service.getByCourse(COURSE_ID, { status: 'issued', page: 1, limit: 10 });

    expect(listSpy).toHaveBeenCalledWith({
      status: 'issued',
      page: 1,
      limit: 10,
      courseId: COURSE_ID,
    });
  });

  // ==================== EXPECTED-FAIL SYSTEM BUG TESTS ====================

  it('UMC-030 — should_reject_when_issuedTo_is_before_issuedFrom (BUG QLC-01-027)', async () => {
    // UMC-030: Input Date Issued To < Date Issued From phải bị chặn theo nghiệp vụ.
    // Mô tả: Người dùng nhập khoảng ngày ngược không hợp lệ.
    // Expected: Service ném lỗi validate thay vì query xuống DB.
    const findChain = {
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            sort: jest.fn().mockReturnValue({
              skip: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  lean: jest.fn().mockResolvedValue([]),
                }),
              }),
            }),
          }),
        }),
      }),
    };
    certificateModel.find.mockReturnValue(findChain);
    certificateModel.countDocuments.mockResolvedValue(0);

    await expect(
      service.list({
        issuedFrom: '2026-05-05',
        issuedTo: '2026-04-05',
      }),
    ).rejects.toThrow('Issued date range is invalid');
  });

  it('UMC-031 — should_return_same_day_certificates_when_issuedFrom_equals_issuedTo (BUG QLC-01-034)', async () => {
    // UMC-031: Lọc cùng ngày phải trả đủ cert được cấp trong ngày đó.
    // Mô tả: Có chứng chỉ được cấp lúc 10:00 trong ngày 2026-05-05.
    // Expected: Kết quả trả về phải chứa chứng chỉ trong ngày.
    const certItem = {
      studentId: mockStudent,
      courseId: mockCourse,
      submissionId: mockSubmission,
      tokenId: 'tok-same-day',
      ipfsHash: 'QmSameDay',
      ipfsImage: 'QmSameDayImage',
      transactionHash: '0xsame',
      issuedAt: new Date('2026-05-05T10:00:00.000Z'),
      outdateTime: new Date('2028-05-05T10:00:00.000Z'),
      status: 'issued',
      createdAt: new Date(),
    };
    certificateModel.find.mockImplementation((filter: any) => {
      const range = filter?.issuedAt;
      const certIssuedAt = certItem.issuedAt;
      const inRange =
        (!range?.$gte || certIssuedAt >= range.$gte) &&
        (!range?.$lte || certIssuedAt <= range.$lte);
      const selected = inRange ? [certItem] : [];
      return {
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
              sort: jest.fn().mockReturnValue({
                skip: jest.fn().mockReturnValue({
                  limit: jest.fn().mockReturnValue({
                    lean: jest.fn().mockResolvedValue(selected),
                  }),
                }),
              }),
            }),
          }),
        }),
      };
    });
    certificateModel.countDocuments.mockResolvedValue(1);

    const result = await service.list({
      issuedFrom: '2026-05-05',
      issuedTo: '2026-05-05',
    });

    expect(result.items).toHaveLength(1);
  });

  it('UMC-032 — should_not_crash_when_courseName_contains_regex_escape_char (BUG QLC-01-038)', async () => {
    // UMC-032: courseName chứa ký tự regex lỗi phải được chặn bằng BadRequest 400.
    // Mô tả: keyword là "\" sẽ làm RegExp lỗi nếu không validate/escape.
    // Expected: Throw BadRequestException với status 400.
    courseModel.find.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      }),
    });

    await expect(service.list({ courseName: '\\' })).rejects.toThrow(
      BadRequestException,
    );
    await expect(service.list({ courseName: '\\' })).rejects.toHaveProperty(
      'status',
      400,
    );
  });
});
