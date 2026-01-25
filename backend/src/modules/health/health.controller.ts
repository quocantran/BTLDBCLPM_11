import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../../common/decorators/auth.decorator';
import { ResponseHelper } from '../../common/dto/response.dto';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Public()
  @Get()
  @ApiOperation({ summary: 'Check API health status' })
  @ApiResponse({
    status: 200,
    description: 'API is healthy',
    schema: {
      example: {
        success: true,
        data: {
          status: 'healthy',
          timestamp: '2025-09-20T16:00:00.000Z',
          uptime: 12345,
          version: '1.0.0',
        },
      },
    },
  })
  checkHealth() {
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    };

    return ResponseHelper.success(healthData, 'API is running smoothly');
  }
}
