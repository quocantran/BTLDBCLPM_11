import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';

import { CertificateController } from 'src/modules/certificates/certificate.controller';
import { CertificateService } from 'src/modules/certificates/certificate.service';
import { CertificateGenerationService } from 'src/common/services/certificate-generation.service';

describe('TestCertificateController — CertificateController endpoints', () => {
  let controller: CertificateController;
  let certService: any;
  let certGenService: any;

  const CERT_ID = '507f1f77bcf86cd799439044';
  const STUDENT_ID = '507f1f77bcf86cd799439011';
  const COURSE_ID = '507f1f77bcf86cd799439033';
  const TEACHER_ID = '507f1f77bcf86cd799439066';
  const EXAM_ID = '507f1f77bcf86cd799439022';

  const mockCert = { _id: CERT_ID, status: 'issued', tokenId: 'tok1' };
  const mockListResult = {
    items: [{ student: {}, course: {}, status: 'issued' }],
    total: 1, page: 1, limit: 10,
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CertificateController],
      providers: [
        {
          provide: CertificateService,
          useValue: {
            issue: jest.fn(),
            list: jest.fn(),
            getById: jest.fn(),
            getByStudent: jest.fn(),
            getByCourse: jest.fn(),
            revoke: jest.fn(),
          },
        },
        {
          provide: CertificateGenerationService,
          useValue: {
            generateAndUploadCertificate: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<CertificateController>(CertificateController);
    certService = module.get(CertificateService);
    certGenService = module.get(CertificateGenerationService);
  });

  beforeEach(() => jest.clearAllMocks());

  // ==================== ISSUE ====================

  it('UMC-033 — should_issue_certificate_via_controller', async () => {
    // UMC-033: Teacher cấp chứng chỉ qua endpoint POST /certificates/issue.
    // Mô tả: dto hợp lệ → service.issue gọi.
    // Expected: ResponseHelper.success với cert data.
    certService.issue.mockResolvedValue(mockCert);

    const result = await controller.issue({ examId: EXAM_ID, studentId: STUDENT_ID });

    expect(result.success).toBe(true);
    expect(result.message).toBe('Certificate issued');
    expect(certService.issue).toHaveBeenCalledWith({ examId: EXAM_ID, studentId: STUDENT_ID });
  });

  // ==================== LIST ====================

  it('UMC-034 — should_list_certificates_for_student_role', async () => {
    // UMC-034: Student gọi GET /certificates → tự thêm studentId vào query.
    // Mô tả: user.role = student → effectiveQuery.studentId = user.id.
    // Expected: list gọi với studentId = STUDENT_ID.
    certService.list.mockResolvedValue(mockListResult);
    const user = { id: STUDENT_ID, role: 'student' } as any;

    const result = await controller.list({}, user);

    expect(result.success).toBe(true);
    expect(certService.list).toHaveBeenCalledWith(expect.objectContaining({ studentId: STUDENT_ID }));
  });

  it('UMC-035 — should_list_certificates_for_teacher_role', async () => {
    // UMC-035: Teacher gọi GET /certificates → tự thêm teacherId vào query.
    // Mô tả: user.role = teacher → effectiveQuery.teacherId = user.id.
    // Expected: list gọi với teacherId = TEACHER_ID.
    certService.list.mockResolvedValue(mockListResult);
    const user = { id: TEACHER_ID, role: 'teacher' } as any;

    const result = await controller.list({}, user);

    expect(certService.list).toHaveBeenCalledWith(expect.objectContaining({ teacherId: TEACHER_ID }));
  });

  it('UMC-036 — should_list_certificates_for_admin_without_extra_filter', async () => {
    // UMC-036: Admin gọi GET /certificates → không thêm studentId/teacherId.
    // Mô tả: user.role = admin → query giữ nguyên.
    // Expected: list gọi không có studentId/teacherId.
    certService.list.mockResolvedValue(mockListResult);
    const user = { id: '507f1f77bcf86cd799439077', role: 'admin' } as any;

    await controller.list({ status: 'issued' }, user);

    expect(certService.list).toHaveBeenCalledWith(
      expect.not.objectContaining({ studentId: expect.anything() }),
    );
  });

  // ==================== BUG TESTS FROM SYSTEM CSV ====================

  it('UMC-037 — should_return_bad_request_400_when_courseName_contains_invalid_regex_char (BUG QLC-01-038)', async () => {
    // UMC-037: Tìm chứng chỉ theo courseName = "\\" phải chuẩn hóa lỗi đầu vào.
    // Mô tả: Downstream service trả lỗi regex không chuẩn hóa (SyntaxError).
    // Expected: HTTP 400, không để rơi ra SyntaxError 500.
    certService.list.mockRejectedValue(
      new SyntaxError('Invalid regular expression: /\\\\/i: \\\\ at end of pattern'),
    );
    const user = { id: STUDENT_ID, role: 'student' } as any;

    await expect(
      controller.list({ courseName: '\\' } as any, user),
    ).rejects.toThrow(BadRequestException);
    await expect(
      controller.list({ courseName: '\\' } as any, user),
    ).rejects.toHaveProperty('status', 400);
  });

  it('UMC-038 — should_return_records_when_same_day_date_filter (BUG QLC-01-034)', async () => {
    // UMC-038: issuedFrom = issuedTo (cùng ngày) thì vẫn phải trả cert trong ngày.
    // Mô tả: Service hiện trả rỗng trong case cùng ngày dù dữ liệu kỳ vọng có bản ghi.
    // Expected: Có ít nhất 1 bản ghi trong kết quả.
    certService.list.mockResolvedValue({ items: [], total: 0, page: 1, limit: 10 });
    const user = { id: STUDENT_ID, role: 'student' } as any;
    const sameDay = '2026-05-05';

    const result = await controller.list(
      { issuedFrom: sameDay, issuedTo: sameDay } as any, user,
    );

    expect(result.data).toHaveLength(1);
  });

  // ==================== GET BY ID ====================

  it('UMC-039 — should_get_certificate_by_id_via_controller', async () => {
    // UMC-039: GET /certificates/:id trả cert chi tiết.
    // Mô tả: service.getById trả cert.
    // Expected: ResponseHelper.success.
    certService.getById.mockResolvedValue(mockCert);

    const result = await controller.getById(CERT_ID);

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockCert);
  });

  it('UMC-040 — should_return_404_when_cert_not_found', async () => {
    // UMC-040: GET /certificates/:id với ID không tồn tại → 404.
    // Mô tả: service.getById throw NotFoundException.
    // Expected: NotFoundException propagate.
    certService.getById.mockRejectedValue(new NotFoundException('Certificate not found'));

    await expect(controller.getById('000000000000000000000000'))
      .rejects.toThrow(NotFoundException);
  });

  // ==================== GET BY STUDENT ====================

  it('UMC-041 — should_get_certificates_by_student', async () => {
    // UMC-041: GET /certificates/student/:studentId trả certs.
    // Mô tả: service.getByStudent gọi.
    // Expected: Paginated response.
    certService.getByStudent.mockResolvedValue(mockListResult);

    const result = await controller.getByStudent(STUDENT_ID, {});

    expect(result.success).toBe(true);
    expect(certService.getByStudent).toHaveBeenCalledWith(STUDENT_ID, {});
  });

  // ==================== GET BY COURSE ====================

  it('UMC-042 — should_get_certificates_by_course', async () => {
    // UMC-042: GET /certificates/course/:courseId trả certs.
    // Mô tả: service.getByCourse gọi.
    // Expected: Paginated response.
    certService.getByCourse.mockResolvedValue(mockListResult);

    const result = await controller.getByCourse(COURSE_ID, {});

    expect(result.success).toBe(true);
    expect(certService.getByCourse).toHaveBeenCalledWith(COURSE_ID, {});
  });

  // ==================== REVOKE ====================

  it('UMC-043 — should_revoke_certificate_via_controller', async () => {
    // UMC-043: PATCH /certificates/:id/revoke thu hồi chứng chỉ.
    // Mô tả: dto có reason + transactionHash.
    // Expected: ResponseHelper.success.
    certService.revoke.mockResolvedValue({ ...mockCert, status: 'revoked' });

    const result = await controller.revoke(CERT_ID, { reason: 'Cheating', transactionHash: '0xrev' });

    expect(result.success).toBe(true);
    expect(certService.revoke).toHaveBeenCalledWith(CERT_ID, 'Cheating', '0xrev');
  });

  it('UMC-044 — should_revoke_without_optional_fields', async () => {
    // UMC-044: Revoke không có reason và transactionHash.
    // Mô tả: dto rỗng → reason=undefined, transactionHash=undefined.
    // Expected: service.revoke gọi với undefined.
    certService.revoke.mockResolvedValue({ ...mockCert, status: 'revoked' });

    const result = await controller.revoke(CERT_ID, {} as any);

    expect(result.success).toBe(true);
    expect(certService.revoke).toHaveBeenCalledWith(CERT_ID, undefined, undefined);
  });

  it('UMC-045 — should_return_404_when_revoking_nonexistent_cert', async () => {
    // UMC-045: Revoke cert không tồn tại → 404.
    // Mô tả: service.revoke throw NotFoundException.
    // Expected: NotFoundException propagate.
    certService.revoke.mockRejectedValue(new NotFoundException('Certificate not found'));

    await expect(controller.revoke('000000000000000000000000', {}))
      .rejects.toThrow(NotFoundException);
  });

  // ==================== GENERATE ====================

  it('UMC-046 — should_generate_certificate_image', async () => {
    // UMC-046: POST /certificates/:id/generate tạo ảnh cert và upload IPFS.
    // Mô tả: certGenService.generateAndUploadCertificate trả kết quả.
    // Expected: Trả imageIpfsHash, metadataIpfsHash, URLs, metadata.
    certGenService.generateAndUploadCertificate.mockResolvedValue({
      imageIpfsHash: 'QmImg',
      metadataIpfsHash: 'QmMeta',
      gatewayUrl: 'https://gw/QmImg',
      metadataGatewayUrl: 'https://gw/QmMeta',
      metadata: { studentName: 'Test', courseName: 'Course' },
    });

    const result = await controller.generateCertificate(CERT_ID);

    expect(result.success).toBe(true);
    expect(result.data.imageIpfsHash).toBe('QmImg');
  });

  it('UMC-047 — should_propagate_error_when_generate_fails', async () => {
    // UMC-047: Generate cert fail → throw propagate.
    // Mô tả: generateAndUploadCertificate reject.
    // Expected: Error propagate.
    certGenService.generateAndUploadCertificate.mockRejectedValue(
      new NotFoundException('Certificate not found'),
    );

    await expect(controller.generateCertificate('000000000000000000000000'))
      .rejects.toThrow(NotFoundException);
  });

  it('UMC-048 — should_list_certificates_without_role_filters_when_user_missing', async () => {
    // UMC-048: Khi CurrentUser thiếu dữ liệu, controller không được tự thêm filter sai.
    // Mô tả: user undefined nhưng query có status hợp lệ.
    // Expected: certService.list nhận đúng query gốc.
    certService.list.mockResolvedValue(mockListResult);

    const result = await controller.list({ status: 'issued' } as any, undefined as any);

    expect(result.success).toBe(true);
    expect(certService.list).toHaveBeenCalledWith({ status: 'issued' });
  });

  it('UMC-049 — should_fallback_page_limit_in_list_response_when_service_omits_them', async () => {
    // UMC-049: Nếu service không trả page/limit thì controller phải fallback theo contract.
    // Mô tả: list trả items và total nhưng page/limit undefined.
    // Expected: response pagination dùng page=1, limit=10.
    certService.list.mockResolvedValue({ items: [], total: 0, page: undefined, limit: undefined });

    const result = await controller.list({}, { id: STUDENT_ID, role: 'student' } as any);

    expect(result.meta?.page).toBe(1);
    expect(result.meta?.limit).toBe(10);
  });

  it('UMC-050 — should_fallback_page_limit_in_getByStudent_response', async () => {
    // UMC-050: Endpoint getByStudent phải fallback pagination khi service thiếu dữ liệu.
    // Mô tả: service trả page/limit undefined.
    // Expected: response dùng page=1 và limit=10.
    certService.getByStudent.mockResolvedValue({
      items: [{ status: 'issued' }],
      total: 1,
      page: undefined,
      limit: undefined,
    });

    const result = await controller.getByStudent(STUDENT_ID, {} as any);

    expect(result.meta?.page).toBe(1);
    expect(result.meta?.limit).toBe(10);
  });

  it('UMC-051 — should_fallback_page_limit_in_getByCourse_response', async () => {
    // UMC-051: Endpoint getByCourse phải fallback pagination khi service thiếu dữ liệu.
    // Mô tả: service trả page/limit undefined.
    // Expected: response dùng page=1 và limit=10.
    certService.getByCourse.mockResolvedValue({
      items: [{ status: 'issued' }],
      total: 1,
      page: undefined,
      limit: undefined,
    });

    const result = await controller.getByCourse(COURSE_ID, {} as any);

    expect(result.meta?.page).toBe(1);
    expect(result.meta?.limit).toBe(10);
  });

  it('UMC-052 — should_revoke_with_undefined_dto_safely', async () => {
    // UMC-052: Revoke nhận dto undefined vẫn phải gọi service an toàn bằng optional chaining.
    // Mô tả: dto vắng hoàn toàn ở runtime.
    // Expected: service.revoke nhận reason và transactionHash là undefined.
    certService.revoke.mockResolvedValue({ ...mockCert, status: 'revoked' });

    const result = await controller.revoke(CERT_ID, undefined as any);

    expect(result.success).toBe(true);
    expect(certService.revoke).toHaveBeenCalledWith(CERT_ID, undefined, undefined);
  });
});
