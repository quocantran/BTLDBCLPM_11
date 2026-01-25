import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Get,
  Put,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import {
  LoginDto,
  RegisterDto,
  RefreshTokenDto,
  ChangePasswordDto,
  UpdateProfileDto,
  VerifyFaceDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ValidateImageDto,
} from './dto/auth.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public, Roles } from '../../common/decorators/auth.decorator';
import { CurrentUser } from '../../common/decorators/user.decorator';
import { ResponseHelper } from '../../common/dto/response.dto';
import type { IUser } from '../../common/interfaces';
import type { Request } from 'express';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully',
    schema: {
      example: {
        success: true,
        message: 'User registered successfully',
        meta: {
          timestamp: '2025-10-09T10:30:00.123Z',
        },
      },
    },
  })
  async register(@Body() registerDto: RegisterDto) {
    await this.authService.register(registerDto);
    return ResponseHelper.success(undefined, 'User registered successfully');
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset instructions via email' })
  @ApiResponse({
    status: 200,
    description: 'Reset instructions sent if account exists',
    schema: {
      example: {
        success: true,
        message:
          'If an account exists for that email, we sent password reset instructions.',
        data: {
          expiresInMinutes: 15,
        },
      },
    },
  })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async requestPasswordReset(
    @Body() forgotPasswordDto: ForgotPasswordDto,
    @Req() request: Request,
  ) {
    const expires = await this.authService.requestPasswordReset(
      forgotPasswordDto,
      {
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      },
    );

    return ResponseHelper.success(
      expires,
      'If an account exists for that email, we sent password reset instructions.',
    );
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login user with username or email' })
  @ApiResponse({
    status: 200,
    description: 'User logged in successfully',
    schema: {
      example: {
        success: true,
        data: {
          user: {
            id: '507f1f77bcf86cd799439011',
            username: 'johndoe',
            email: 'user@example.com',
            role: 'student',
          },
          accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
      },
    },
  })
  async login(@Body() loginDto: LoginDto) {
    const result = await this.authService.login(loginDto);
    return ResponseHelper.success(result, 'Login successful');
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh authentication tokens' })
  @ApiResponse({
    status: 200,
    description: 'Tokens refreshed successfully',
    schema: {
      example: {
        success: true,
        data: {
          accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
      },
    },
  })
  async refreshTokens(@Body() refreshTokenDto: RefreshTokenDto) {
    const result = await this.authService.refreshTokens(refreshTokenDto);
    return ResponseHelper.success(result, 'Tokens refreshed successfully');
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm password reset using token' })
  @ApiResponse({
    status: 200,
    description: 'Password updated successfully',
    schema: {
      example: {
        success: true,
        message: 'Password updated successfully.',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid payload' })
  @ApiResponse({ status: 401, description: 'Token invalid or expired' })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    await this.authService.resetPassword(resetPasswordDto);
    return ResponseHelper.success(undefined, 'Password updated successfully.');
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
    schema: {
      example: {
        success: true,
        data: {
          user: {
            id: '507f1f77bcf86cd799439011',
            username: 'johndoe',
            email: 'user@example.com',
            role: 'student',
            createdAt: '2025-10-07T10:30:00.000Z',
            updatedAt: '2025-10-07T10:30:00.000Z',
          },
        },
        message: 'Profile retrieved successfully',
      },
    },
  })
  async getProfile(@CurrentUser() user: IUser) {
    const result = await this.authService.getProfile(user.id);
    return ResponseHelper.success(result, 'Profile retrieved successfully');
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change user password' })
  @ApiResponse({
    status: 200,
    description: 'Password changed successfully',
    schema: {
      example: {
        success: true,
        data: {
          message: 'Password changed successfully',
        },
        message: 'Password changed successfully',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Current password is incorrect',
    schema: {
      example: {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Current password is incorrect',
        },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'New password must be different from current password',
    schema: {
      example: {
        success: false,
        error: {
          code: 'CONFLICT',
          message: 'New password must be different from current password',
        },
      },
    },
  })
  async changePassword(
    @CurrentUser() user: IUser,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    const result = await this.authService.changePassword(
      user.id,
      changePasswordDto,
    );
    return ResponseHelper.success(result, 'Password changed successfully');
  }

  @UseGuards(JwtAuthGuard)
  @Put('profile')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user profile' })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
    schema: {
      example: {
        success: true,
        data: {
          user: {
            id: '507f1f77bcf86cd799439011',
            username: 'johndoe',
            email: 'user@example.com',
            role: 'student',
            createdAt: '2025-10-07T10:30:00.000Z',
            updatedAt: '2025-10-07T10:30:00.000Z',
          },
          message: 'Profile updated successfully',
        },
        message: 'Profile updated successfully',
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Email already exists',
    schema: {
      example: {
        success: false,
        error: {
          code: 'CONFLICT',
          message: 'Email already exists',
        },
      },
    },
  })
  async updateProfile(
    @CurrentUser() user: IUser,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    const result = await this.authService.updateProfile(
      user.id,
      updateProfileDto,
    );
    return ResponseHelper.success(result, 'Profile updated successfully');
  }

  // --- ENDPOINT MỚI CHO XÁC THỰC KHUÔN MẶT ---
  @Post('verify-face')
  @Roles('student') // Chỉ 'student' mới được gọi
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify student face against profile for exam' })
  @ApiResponse({ status: 200, description: 'Face verified successfully.' })
  @ApiResponse({ status: 401, description: 'Face verification failed.' })
  @ApiResponse({
    status: 400,
    description: 'Profile image not found or invalid image data.',
  })
  async verifyFace(
    @CurrentUser() user: IUser, // Lấy user từ payload
    @Body() verifyFaceDto: VerifyFaceDto,
  ) {
    return this.authService.verifyFace(user, verifyFaceDto);
  }

  @Post('validate-profile-image')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate profile image using AI' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Image is valid.' })
  @ApiResponse({ status: 400, description: 'Image is invalid (e.g., blurry, not a face).' })
  async validateProfileImage(@Body() validateImageDto: ValidateImageDto) {
    return this.authService.validateProfileImage(validateImageDto.imageBase64);
  }

}
