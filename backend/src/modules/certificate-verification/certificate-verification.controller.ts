import {
  Controller,
  Get,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CertificateVerificationService } from './certificate-verification.service';
import { ResponseHelper } from '../../common/dto/response.dto';
import { Public } from '../../common/decorators/auth.decorator';

@ApiTags('Certificate Verification')
@Controller('public/certificates')
export class CertificateVerificationController {
  constructor(
    private readonly certificateVerificationService: CertificateVerificationService,
  ) {}

  @Public()
  @Get('verify/:certificateId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify certificate by certificate ID',
    description:
      'Verify a certificate using its database ID. This endpoint does not require authentication.',
  })
  async verifyByCertificateId(@Param('certificateId') certificateId: string) {
    const result =
      await this.certificateVerificationService.verifyByCertificateId(
        certificateId,
      );
    return ResponseHelper.success(result, 'Certificate verification completed');
  }

  @Public()
  @Get('verify/token/:tokenId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify certificate by blockchain token ID',
    description:
      'Verify a certificate using its blockchain token ID. This endpoint does not require authentication.',
  })
  async verifyByTokenId(@Param('tokenId') tokenId: string) {
    const result =
      await this.certificateVerificationService.verifyByTokenId(tokenId);
    return ResponseHelper.success(result, 'Certificate verification completed');
  }

  @Public()
  @Get('lookup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Lookup certificates by token, certificate ID, or student email',
    description:
      'Retrieve certificate metadata using one or more filters: certificateId, tokenId, studentEmail.',
  })
  async lookupCertificates(
    @Query('certificateId') certificateId?: string,
    @Query('tokenId') tokenId?: string,
    @Query('studentEmail') studentEmail?: string,
  ) {
    const items = await this.certificateVerificationService.lookupCertificates({
      certificateId,
      tokenId,
      studentEmail,
    });
    return ResponseHelper.success(
      { items, total: items.length },
      'Certificates lookup completed',
    );
  }
}
