import {
  IsEmail,
  IsString,
  MinLength,
  IsEnum,
  IsOptional,
  IsDateString,
  IsNotEmpty,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    example: 'johndoe',
    description: 'Username or email address',
  })
  @IsString()
  identifier: string;

  @ApiProperty({ example: 'password123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;
}

export class RegisterDto {
  @ApiProperty({ example: 'johndoe' })
  @IsString()
  @MinLength(3)
  username: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @MinLength(1)
  fullName: string;

  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({
    example: 'student',
    enum: ['student', 'teacher', 'admin'],
    description: 'User role',
  })
  @IsEnum(['student', 'teacher', 'admin'])
  role: 'student' | 'teacher' | 'admin';
}

export class RefreshTokenDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Refresh token issued during login',
  })
  @IsString()
  @MinLength(10)
  refreshToken: string;
}

export class ChangePasswordDto {
  @ApiProperty({
    example: 'currentPassword123',
    description: 'Current password for verification',
  })
  @IsString()
  @MinLength(6)
  currentPassword: string;

  @ApiProperty({
    example: 'newPassword123',
    description: 'New password (minimum 6 characters)',
  })
  @IsString()
  @MinLength(6)
  newPassword: string;
}

export class UpdateProfileDto {
  @ApiProperty({
    example: 'John Doe',
    description: 'Full name of the user',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  fullName?: string;

  @ApiProperty({
    example: 'user@example.com',
    description: 'Email address of the user',
    required: false,
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    example: '1990-01-15',
    description: 'Date of birth in YYYY-MM-DD format',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;
  @ApiProperty({
    example: 'https://example.com/image.jpg',
    description: 'Image URL of the user',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  imageUrl?: string;

  @ApiProperty({
    example: '123456789',
    description: 'National ID / Citizen ID number (CMND/CCCD)',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  citizenId?: string;
}

export class VerifyFaceDto {
  @ApiProperty({
    description: 'Base64 encoded string of the webcam snapshot (image/jpeg)',
    example: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
  })
  @IsString()
  @IsNotEmpty()
  webcamImage: string;
}

export class ForgotPasswordDto {
  @ApiProperty({
    example: 'student@example.com',
    description: 'Email address associated with the account',
  })
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({ example: 'abc123', description: 'Token from reset email' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({
    example: 'NewPassword123',
    description: 'New password (min 6 chars, uppercase, lowercase, number)',
  })
  @IsString()
  @MinLength(6)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/u, {
    message:
      'Password must contain at least 1 uppercase letter, 1 lowercase letter, and 1 number',
  })
  password: string;

  @ApiProperty({
    example: 'NewPassword123',
    description: 'Confirmation password (must match password)',
  })
  @IsString()
  @MinLength(6)
  confirmPassword: string;
}

/**
 * DTO cho API xác thực ảnh profile
 */
export class ValidateImageDto {
  @ApiProperty({
    description: 'Base64 encoded string of the image (image/jpeg or image/png)',
    example: 'data:image/jpeg;base64,/9j/4AAQSk...',
  })
  @IsString()
  @IsNotEmpty()
  imageBase64: string;
}
