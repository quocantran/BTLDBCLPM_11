import { ApiProperty } from '@nestjs/swagger';

export class ApiResponseDto<T = any> {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty()
  data?: T;

  @ApiProperty({ example: 'Operation completed successfully' })
  message?: string;

  @ApiProperty()
  error?: {
    code: string;
    message: string;
    details?: any;
  };

  @ApiProperty()
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    timestamp: string;
  };
}

export class PaginationDto {
  @ApiProperty({ example: 1, description: 'Current page number' })
  page: number;

  @ApiProperty({ example: 10, description: 'Number of items per page' })
  limit: number;

  @ApiProperty({ example: 100, description: 'Total number of items' })
  total: number;

  @ApiProperty({ example: 10, description: 'Total number of pages' })
  totalPages: number;

  @ApiProperty({ example: true, description: 'Has next page' })
  hasNextPage: boolean;

  @ApiProperty({ example: false, description: 'Has previous page' })
  hasPrevPage: boolean;
}

export class ErrorResponseDto {
  @ApiProperty({ example: false })
  success: boolean;

  @ApiProperty({
    example: {
      code: 'VALIDATION_ERROR',
      message: 'Invalid input data',
      details: {},
    },
  })
  error: {
    code: string;
    message: string;
    details?: any;
  };

  @ApiProperty({ example: '2025-09-21T16:00:00.000Z' })
  timestamp: string;
}

// Helper functions for creating standardized responses
export class ResponseHelper {
  static success<T>(data?: T, message?: string): ApiResponseDto<T> {
    return {
      success: true,
      data,
      message,
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
  }

  static error(
    code: string,
    message: string,
    details?: unknown,
  ): ErrorResponseDto {
    return {
      success: false,
      error: {
        code,
        message,
        details,
      },
      timestamp: new Date().toISOString(),
    };
  }

  static paginated<T>(
    data: T[],
    page: number,
    limit: number,
    total: number,
    message?: string,
  ): ApiResponseDto<T[]> {
    return {
      success: true,
      data,
      message,
      meta: {
        page,
        limit,
        total,
        timestamp: new Date().toISOString(),
      },
    };
  }
}
