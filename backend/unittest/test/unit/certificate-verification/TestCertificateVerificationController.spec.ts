import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';

import { CertificateVerificationController } from 'src/modules/certificate-verification/certificate-verification.controller';
import { CertificateVerificationService } from 'src/modules/certificate-verification/certificate-verification.service';

describe('TestCertificateVerificationController — CertificateVerificationController endpoints', () => {
  let controller: CertificateVerificationController;
  let verificationService: any;

  const mockVerifySuccess = {
    valid: true,
    message: 'Certificate is valid',
    certificate: { id: '507f1f77bcf86cd799439044', status: 'issued' },
    blockchainVerification: { valid: true, tokenId: 'token-001' },
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CertificateVerificationController],
      providers: [
        {
          provide: CertificateVerificationService,
          useValue: {
            verifyByCertificateId: jest.fn(),
            verifyByTokenId: jest.fn(),
            lookupCertificates: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<CertificateVerificationController>(
      CertificateVerificationController,
    );
    verificationService = module.get(CertificateVerificationService);
  });

  beforeEach(() => jest.clearAllMocks());

  it('CV-023 — should_verify_certificate_by_id_successfully', async () => {
    // CV-023: Endpoint verify/:certificateId trả kết quả xác thực thành công.
    // Mô tả: service trả payload valid cho cert ID hợp lệ.
    // Expected: ResponseHelper.success với message xác thực hoàn tất.
    verificationService.verifyByCertificateId.mockResolvedValue(mockVerifySuccess);

    const result = await controller.verifyByCertificateId('507f1f77bcf86cd799439044');

    expect(result.success).toBe(true);
    expect(result.message).toBe('Certificate verification completed');
    expect(verificationService.verifyByCertificateId).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439044',
    );
  });

  it('CV-024 — should_propagate_error_when_verify_by_id_fails', async () => {
    // CV-024: Endpoint verify/:certificateId phải propagate lỗi validate từ service.
    // Mô tả: service throw BadRequestException cho cert ID sai.
    // Expected: Controller không nuốt lỗi.
    verificationService.verifyByCertificateId.mockRejectedValue(
      new BadRequestException('Invalid certificate ID'),
    );

    await expect(controller.verifyByCertificateId('bad-id')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('CV-025 — should_verify_certificate_by_token_successfully', async () => {
    // CV-025: Endpoint verify/token/:tokenId trả kết quả xác thực theo token.
    // Mô tả: service verifyByTokenId trả payload hợp lệ.
    // Expected: success=true và message chuẩn.
    verificationService.verifyByTokenId.mockResolvedValue(mockVerifySuccess);

    const result = await controller.verifyByTokenId('token-001');

    expect(result.success).toBe(true);
    expect(result.message).toBe('Certificate verification completed');
    expect(verificationService.verifyByTokenId).toHaveBeenCalledWith('token-001');
  });

  it('CV-026 — should_propagate_error_when_verify_by_token_fails', async () => {
    // CV-026: Endpoint verify/token/:tokenId phải propagate lỗi từ service.
    // Mô tả: token rỗng khiến service throw BadRequest.
    // Expected: controller throw BadRequestException.
    verificationService.verifyByTokenId.mockRejectedValue(
      new BadRequestException('tokenId is required'),
    );

    await expect(controller.verifyByTokenId('')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('CV-027 — should_lookup_certificates_with_all_filters', async () => {
    // CV-027: Lookup nhận đủ 3 filter phải trả items + total đúng.
    // Mô tả: service trả 2 bản ghi.
    // Expected: data.total=2 và gọi service với đủ filter.
    verificationService.lookupCertificates.mockResolvedValue([
      { id: 'c1' },
      { id: 'c2' },
    ]);

    const result = await controller.lookupCertificates(
      '507f1f77bcf86cd799439044',
      'token-001',
      'student@example.com',
    );

    expect(result.success).toBe(true);
    expect(result.data.total).toBe(2);
    expect(result.data.items).toHaveLength(2);
    expect(verificationService.lookupCertificates).toHaveBeenCalledWith({
      certificateId: '507f1f77bcf86cd799439044',
      tokenId: 'token-001',
      studentEmail: 'student@example.com',
    });
  });

  it('CV-028 — should_lookup_with_token_only_filter', async () => {
    // CV-028: Lookup chỉ tokenId vẫn phải forward đúng params.
    // Mô tả: certificateId/studentEmail undefined.
    // Expected: service nhận object đúng shape.
    verificationService.lookupCertificates.mockResolvedValue([{ id: 'c1' }]);

    const result = await controller.lookupCertificates(undefined, 'token-001', undefined);

    expect(result.success).toBe(true);
    expect(verificationService.lookupCertificates).toHaveBeenCalledWith({
      certificateId: undefined,
      tokenId: 'token-001',
      studentEmail: undefined,
    });
  });

  it('CV-029 — should_lookup_with_student_email_only_filter', async () => {
    // CV-029: Lookup chỉ studentEmail phải được hỗ trợ.
    // Mô tả: service trả danh sách theo email.
    // Expected: total khớp số lượng items trả về.
    verificationService.lookupCertificates.mockResolvedValue([{ id: 'c1' }]);

    const result = await controller.lookupCertificates(
      undefined,
      undefined,
      'student@example.com',
    );

    expect(result.data.total).toBe(1);
    expect(result.data.items).toEqual([{ id: 'c1' }]);
  });

  it('CV-030 — should_return_empty_lookup_result_when_service_returns_empty', async () => {
    // CV-030: Không có dữ liệu phải trả items=[] và total=0.
    // Mô tả: service lookup trả mảng rỗng.
    // Expected: contract response vẫn ổn định.
    verificationService.lookupCertificates.mockResolvedValue([]);

    const result = await controller.lookupCertificates(undefined, 'token-404', undefined);

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ items: [], total: 0 });
  });

  it('CV-031 — should_propagate_bad_request_from_lookup', async () => {
    // CV-031: Lookup không có filter phải trả lỗi 400 từ service.
    // Mô tả: service throw BadRequestException.
    // Expected: controller không nuốt lỗi.
    verificationService.lookupCertificates.mockRejectedValue(
      new BadRequestException('At least one filter is required'),
    );

    await expect(controller.lookupCertificates(undefined, undefined, undefined)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('CV-032 — should_keep_public_response_message_consistent_for_lookup', async () => {
    // CV-032: Message response lookup phải ổn định để frontend parse.
    // Mô tả: service trả bất kỳ danh sách nào.
    // Expected: message luôn là "Certificates lookup completed".
    verificationService.lookupCertificates.mockResolvedValue([{ id: 'c1' }]);

    const result = await controller.lookupCertificates('507f1f77bcf86cd799439044');

    expect(result.message).toBe('Certificates lookup completed');
  });
});
