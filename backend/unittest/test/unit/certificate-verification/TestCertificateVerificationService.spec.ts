import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';

import { CertificateVerificationService } from 'src/modules/certificate-verification/certificate-verification.service';
import { Certificate } from 'src/database/schemas/certificate.schema';
import { User } from 'src/database/schemas/user.schema';
import { Course } from 'src/database/schemas/course.schema';
import { Submission } from 'src/database/schemas/submission.schema';
import { BlockchainService } from 'src/common/services/blockchain.service';

describe('TestCertificateVerificationService — CertificateVerificationService business logic', () => {
  let service: CertificateVerificationService;
  let certificateModel: any;
  let userModel: any;
  let blockchainService: any;

  const CERT_ID = '507f1f77bcf86cd799439044';
  const STUDENT_ID = '507f1f77bcf86cd799439011';
  const COURSE_ID = '507f1f77bcf86cd799439033';
  const SUBMISSION_ID = '507f1f77bcf86cd799439055';

  const buildCertificate = (overrides: Record<string, unknown> = {}) => ({
    _id: new Types.ObjectId(CERT_ID),
    studentId: { _id: new Types.ObjectId(STUDENT_ID), email: 'student@example.com' },
    courseId: { _id: new Types.ObjectId(COURSE_ID), courseName: 'Course A' },
    submissionId: { _id: new Types.ObjectId(SUBMISSION_ID), score: 9.5 },
    status: 'issued',
    tokenId: 'token-001',
    ipfsHash: 'QmMeta',
    ipfsImage: 'QmImage',
    transactionHash: '0xabc',
    issuedAt: new Date('2026-05-01T00:00:00.000Z'),
    outdateTime: new Date('2028-05-01T00:00:00.000Z'),
    ...overrides,
  });

  const populateLeanChain = (result: unknown) => ({
    populate: jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(result),
        }),
      }),
    }),
  });

  const findWithSortChain = (result: unknown) => ({
    populate: jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(result),
          }),
        }),
      }),
    }),
  });

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CertificateVerificationService,
        {
          provide: getModelToken(Certificate.name),
          useValue: {
            findById: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: getModelToken(User.name),
          useValue: {
            findOne: jest.fn(),
          },
        },
        { provide: getModelToken(Course.name), useValue: {} },
        { provide: getModelToken(Submission.name), useValue: {} },
        {
          provide: BlockchainService,
          useValue: {
            verifyCertificate: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CertificateVerificationService>(
      CertificateVerificationService,
    );
    certificateModel = module.get(getModelToken(Certificate.name));
    userModel = module.get(getModelToken(User.name));
    blockchainService = module.get(BlockchainService);
  });

  beforeEach(() => jest.clearAllMocks());

  it('CV-001 — should_reject_invalid_certificate_id', async () => {
    // CV-001: Tra cứu cert ID sai format phải bị chặn ngay.
    // Mô tả: Input không phải MongoId hợp lệ.
    // Expected: Throw BadRequestException "Invalid certificate ID".
    await expect(service.verifyByCertificateId('abc')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('CV-002 — should_return_not_found_when_certificate_id_not_exists', async () => {
    // CV-002: Cert ID hợp lệ nhưng không có dữ liệu.
    // Mô tả: DB trả null sau findById.
    // Expected: valid=false, message="Certificate not found".
    certificateModel.findById.mockReturnValue(populateLeanChain(null));

    const result = await service.verifyByCertificateId(CERT_ID);

    expect(result).toEqual({
      valid: false,
      message: 'Certificate not found',
      certificate: null,
      blockchainVerification: null,
    });
  });

  it('CV-003 — should_verify_issued_certificate_by_id_without_token', async () => {
    // CV-003: Cert issued không có token blockchain vẫn là hợp lệ nội bộ.
    // Mô tả: tokenId undefined và status=issued.
    // Expected: valid=true, message "Certificate is valid", blockchainVerification=null.
    certificateModel.findById.mockReturnValue(
      populateLeanChain(buildCertificate({ tokenId: undefined })),
    );

    const result = await service.verifyByCertificateId(CERT_ID);

    expect(result.valid).toBe(true);
    expect(result.message).toBe('Certificate is valid');
    expect(result.blockchainVerification).toBeNull();
  });

  it('CV-004 — should_mark_revoked_certificate_as_invalid', async () => {
    // CV-004: Cert đã revoked phải luôn invalid.
    // Mô tả: status=revoked dù token vẫn tồn tại.
    // Expected: valid=false, message "Certificate has been revoked".
    certificateModel.findById.mockReturnValue(
      populateLeanChain(buildCertificate({ status: 'revoked' })),
    );
    blockchainService.verifyCertificate.mockResolvedValue({
      valid: true,
      certificate: { cid: 'Qm', issuer: '0xIssuer', recipient: '0xRecipient' },
    });

    const result = await service.verifyByCertificateId(CERT_ID);

    expect(result.valid).toBe(false);
    expect(result.message).toBe('Certificate has been revoked');
  });

  it('CV-005 — should_mark_pending_certificate_as_not_yet_valid', async () => {
    // CV-005: Cert pending chưa được coi là hợp lệ.
    // Mô tả: status=pending.
    // Expected: valid=false, message "Certificate is pending issuance".
    certificateModel.findById.mockReturnValue(
      populateLeanChain(buildCertificate({ status: 'pending', tokenId: undefined })),
    );

    const result = await service.verifyByCertificateId(CERT_ID);

    expect(result.valid).toBe(false);
    expect(result.message).toBe('Certificate is pending issuance');
  });

  it('CV-006 — should_capture_blockchain_error_without_crashing_id_verification', async () => {
    // CV-006: Lỗi blockchain không được làm sập tra cứu cert ID.
    // Mô tả: verifyCertificate throw network error.
    // Expected: Response vẫn trả cert, blockchainVerification.valid=false kèm error.
    certificateModel.findById.mockReturnValue(populateLeanChain(buildCertificate()));
    blockchainService.verifyCertificate.mockRejectedValue(new Error('RPC unavailable'));

    const result = await service.verifyByCertificateId(CERT_ID);

    expect(result.valid).toBe(true);
    expect(result.blockchainVerification).toEqual(
      expect.objectContaining({
        valid: false,
        tokenId: 'token-001',
        error: 'RPC unavailable',
      }),
    );
  });

  it('CV-007 — should_require_token_id_when_verifying_by_token', async () => {
    // CV-007: Verify theo token phải có tokenId hợp lệ không rỗng.
    // Mô tả: token là chuỗi trắng.
    // Expected: Throw BadRequestException "tokenId is required".
    await expect(service.verifyByTokenId('   ')).rejects.toThrow(BadRequestException);
  });

  it('CV-008 — should_return_not_found_when_token_missing_on_blockchain', async () => {
    // CV-008: Token không tồn tại blockchain phải trả not found rõ ràng.
    // Mô tả: blockchain verify valid=false.
    // Expected: valid=false, message blockchain not found, no certificate payload.
    blockchainService.verifyCertificate.mockResolvedValue({ valid: false });

    const result = await service.verifyByTokenId('token-404');

    expect(result).toEqual({
      valid: false,
      message: 'Certificate not found on blockchain',
      certificate: null,
      blockchainVerification: {
        valid: false,
        tokenId: 'token-404',
        error: 'Token ID not found on blockchain',
      },
    });
    expect(certificateModel.findOne).not.toHaveBeenCalled();
  });

  it('CV-009 — should_return_blockchain_only_result_when_local_record_missing', async () => {
    // CV-009: Có dữ liệu blockchain nhưng local DB thiếu bản ghi.
    // Mô tả: verify token valid=true, findOne trả null.
    // Expected: valid=true, certificate=null và có thông tin issuer/recipient/cid.
    blockchainService.verifyCertificate.mockResolvedValue({
      valid: true,
      certificate: { cid: 'QmCid', issuer: '0xIssuer', recipient: '0xRecipient' },
    });
    certificateModel.findOne.mockReturnValue(populateLeanChain(null));

    const result = await service.verifyByTokenId('token-001');

    expect(result.valid).toBe(true);
    expect(result.certificate).toBeNull();
    expect(result.message).toContain('no local record');
    expect(result.blockchainVerification).toEqual(
      expect.objectContaining({ cid: 'QmCid', issuer: '0xIssuer', recipient: '0xRecipient' }),
    );
  });

  it('CV-010 — should_verify_token_with_local_record_and_blockchain_payload', async () => {
    // CV-010: Token hợp lệ và local có cert phải trả đầy đủ dữ liệu.
    // Mô tả: cả blockchain và DB đều có bản ghi.
    // Expected: valid=true, message valid và kèm payload blockchain.
    blockchainService.verifyCertificate.mockResolvedValue({
      valid: true,
      certificate: { cid: 'QmCid', issuer: '0xIssuer', recipient: '0xRecipient' },
    });
    certificateModel.findOne.mockReturnValue(populateLeanChain(buildCertificate()));

    const result = await service.verifyByTokenId('token-001');

    expect(result.valid).toBe(true);
    expect(result.message).toBe('Certificate is valid');
    expect(result.blockchainVerification).toEqual(
      expect.objectContaining({ tokenId: 'token-001', cid: 'QmCid' }),
    );
  });

  it('CV-011 — should_mark_revoked_local_record_invalid_even_if_blockchain_valid', async () => {
    // CV-011: Blockchain valid nhưng local đã revoke thì vẫn invalid.
    // Mô tả: trạng thái revoke là nguồn sự thật nghiệp vụ nội bộ.
    // Expected: valid=false, message revoked.
    blockchainService.verifyCertificate.mockResolvedValue({
      valid: true,
      certificate: { cid: 'QmCid', issuer: '0xIssuer', recipient: '0xRecipient' },
    });
    certificateModel.findOne.mockReturnValue(
      populateLeanChain(buildCertificate({ status: 'revoked' })),
    );

    const result = await service.verifyByTokenId('token-001');

    expect(result.valid).toBe(false);
    expect(result.message).toBe('Certificate has been revoked');
  });

  it('CV-012 — should_propagate_blockchain_runtime_error_in_token_verification', async () => {
    // CV-012: Lỗi runtime blockchain ở verifyByTokenId phải được surface lên caller.
    // Mô tả: verifyCertificate throw timeout.
    // Expected: Promise reject để tầng trên xử lý.
    blockchainService.verifyCertificate.mockRejectedValue(new Error('timeout'));

    await expect(service.verifyByTokenId('token-001')).rejects.toThrow('timeout');
  });

  it('CV-013 — should_return_certificate_when_searching_with_certificate_id_from_verify_input (BUG SC-01-014)', async () => {
    // CV-013: FE nhập certId tại ô verify thì backend vẫn phải tìm được certificate.
    // Mô tả: UI đang luôn gọi endpoint verify/token/:input nên input có thể là Mongo certId.
    // Expected: Trả certificate tương ứng thay vì văng lỗi 500.
    blockchainService.verifyCertificate.mockRejectedValue(
      new Error('Internal Server Error while verifying token'),
    );
    certificateModel.findById.mockReturnValue(populateLeanChain(buildCertificate({ tokenId: '0' })));

    const result = await service.verifyByTokenId(CERT_ID);

    expect(result.certificate).toEqual(
      expect.objectContaining({
        id: CERT_ID,
      }),
    );
  });

  it('CV-014 — should_require_at_least_one_filter_in_lookup', async () => {
    // CV-014: Lookup rỗng filter phải reject.
    // Mô tả: không truyền certificateId/tokenId/studentEmail.
    // Expected: Throw BadRequestException bắt buộc ít nhất 1 filter.
    await expect(service.lookupCertificates({})).rejects.toThrow(BadRequestException);
  });

  it('CV-015 — should_reject_invalid_certificate_id_in_lookup', async () => {
    // CV-015: certificateId sai format ở lookup phải reject.
    // Mô tả: truyền certificateId không phải MongoId.
    // Expected: Throw BadRequestException.
    await expect(
      service.lookupCertificates({ certificateId: 'invalid-id' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('CV-016 — should_return_empty_when_student_email_not_found', async () => {
    // CV-016: Lookup theo email không có user thì trả rỗng.
    // Mô tả: userModel.findOne trả null.
    // Expected: [] và không query certificates.
    userModel.findOne.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      }),
    });

    const result = await service.lookupCertificates({ studentEmail: 'nobody@example.com' });

    expect(result).toEqual([]);
    expect(certificateModel.find).not.toHaveBeenCalled();
  });

  it('CV-017 — should_lookup_by_certificate_id_and_return_mapped_payload', async () => {
    // CV-017: Lookup theo certificateId hợp lệ phải trả đúng payload public.
    // Mô tả: DB trả 1 certificate.
    // Expected: id map từ _id và chứa status/token/ipfs fields.
    certificateModel.find.mockReturnValue(findWithSortChain([buildCertificate()]));

    const result = await service.lookupCertificates({ certificateId: CERT_ID });

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(
      expect.objectContaining({
        id: CERT_ID,
        status: 'issued',
        tokenId: 'token-001',
        ipfsHash: 'QmMeta',
        ipfsImage: 'QmImage',
      }),
    );
  });

  it('CV-018 — should_lookup_by_token_id', async () => {
    // CV-018: Lookup theo tokenId phải dùng filter tokenId.
    // Mô tả: truyền tokenId duy nhất.
    // Expected: certificateModel.find nhận query có tokenId.
    certificateModel.find.mockReturnValue(findWithSortChain([buildCertificate()]));

    await service.lookupCertificates({ tokenId: 'token-001' });

    expect(certificateModel.find).toHaveBeenCalledWith(
      expect.objectContaining({ tokenId: 'token-001' }),
    );
  });

  it('CV-019 — should_lookup_by_student_email_with_resolved_student_id', async () => {
    // CV-019: Lookup email phải resolve studentId rồi mới query cert.
    // Mô tả: user email tồn tại.
    // Expected: query certificates theo studentId đã resolve.
    const studentId = new Types.ObjectId(STUDENT_ID);
    userModel.findOne.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({ _id: studentId }),
      }),
    });
    certificateModel.find.mockReturnValue(findWithSortChain([buildCertificate()]));

    await service.lookupCertificates({ studentEmail: 'student@example.com' });

    expect(certificateModel.find).toHaveBeenCalledWith(
      expect.objectContaining({ studentId }),
    );
  });

  it('CV-020 — should_combine_multiple_lookup_filters', async () => {
    // CV-020: Khi truyền nhiều filter thì query phải kết hợp đồng thời.
    // Mô tả: certificateId + tokenId + studentEmail.
    // Expected: query có đủ _id, tokenId, studentId.
    const studentId = new Types.ObjectId(STUDENT_ID);
    userModel.findOne.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({ _id: studentId }),
      }),
    });
    certificateModel.find.mockReturnValue(findWithSortChain([buildCertificate()]));

    await service.lookupCertificates({
      certificateId: CERT_ID,
      tokenId: 'token-001',
      studentEmail: 'student@example.com',
    });

    expect(certificateModel.find).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: expect.any(Types.ObjectId),
        tokenId: 'token-001',
        studentId,
      }),
    );
  });

  it('CV-021 — should_propagate_lookup_error_when_user_query_fails', async () => {
    // CV-021: Lỗi DB khi resolve email phải được propagate.
    // Mô tả: userModel.findOne chain reject.
    // Expected: Promise reject với lỗi gốc.
    userModel.findOne.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockRejectedValue(new Error('DB down')),
      }),
    });

    await expect(
      service.lookupCertificates({ studentEmail: 'student@example.com' }),
    ).rejects.toThrow('DB down');
  });

  it('CV-022 — should_return_safe_certificate_payload_when_exam_related_data_is_deleted (BUG SC-01-015)', async () => {
    // CV-022: Token hợp lệ nhưng exam đã bị xóa vẫn phải verify certificate bình thường.
    // Mô tả: Dữ liệu liên quan bị thiếu không được làm FE crash khi render.
    // Expected: Trả certificate đầy đủ với course/submission fallback object (không null).
    blockchainService.verifyCertificate.mockResolvedValue({
      valid: true,
      certificate: { cid: 'QmCid', issuer: '0xIssuer', recipient: '0xRecipient' },
    });
    certificateModel.findOne.mockReturnValue(
      populateLeanChain(
        buildCertificate({
          tokenId: '0',
          courseId: null,
          submissionId: null,
        }),
      ),
    );

    const result = await service.verifyByTokenId('0');

    expect(result.valid).toBe(true);
    expect(result.certificate).toEqual(
      expect.objectContaining({
        id: CERT_ID,
      }),
    );
    expect(result.certificate?.course).toEqual(
      expect.objectContaining({
        courseName: expect.any(String),
      }),
    );
    expect(result.certificate?.submission).toEqual(
      expect.objectContaining({
        score: expect.any(Number),
      }),
    );
  });
});
