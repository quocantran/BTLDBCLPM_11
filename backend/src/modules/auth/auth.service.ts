/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { Model } from 'mongoose';
import * as argon2 from 'argon2';
import { User, UserDocument } from '../../database/schemas/user.schema';
import {
  PasswordResetToken,
  PasswordResetTokenDocument,
} from '../../database/schemas/password-reset-token.schema';
import {
  LoginDto,
  RegisterDto,
  RefreshTokenDto,
  ChangePasswordDto,
  UpdateProfileDto,
  VerifyFaceDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto/auth.dto';
import type { IJwtPayload, IUser, IUserProfile } from '../../common/interfaces';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';
import { createHash, randomBytes } from 'crypto';
import type { AxiosResponse } from 'axios';

interface PasswordResetRequestContext {
  ip?: string | string[];
  userAgent?: string | string[];
}

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text?: string;
      }>;
    };
  }>;
}

interface ImageValidationResult {
  isValid: boolean;
  reason: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(PasswordResetToken.name)
    private readonly passwordResetTokenModel: Model<PasswordResetTokenDocument>,
    private readonly jwtService: JwtService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { username, fullName, email, password, role } = registerDto;

    // Check if username already exists
    const existingUsername = await this.userModel.findOne({ username });
    if (existingUsername) {
      throw new ConflictException('Username already exists');
    }

    // Check if email already exists
    const existingUser = await this.userModel.findOne({ email });
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const passwordHash = await argon2.hash(password);

    // Create user with role from request
    const newUser = new this.userModel({
      username,
      fullName,
      email,
      passwordHash,
      role,
    });

    const savedUser = await newUser.save();

    // Generate tokens
    const tokens = await this.generateTokens(savedUser);
    await this.updateRefreshToken(String(savedUser._id), tokens.refreshToken);

    return {
      user: this.sanitizeUser(savedUser),
      ...tokens,
    };
  }

  async login(loginDto: LoginDto) {
    const { identifier, password } = loginDto;

    // Find user by email or username
    const user = await this.userModel.findOne({
      $or: [{ email: identifier }, { username: identifier }],
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await argon2.verify(user.passwordHash, password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate tokens
    const tokens = await this.generateTokens(user);
    await this.updateRefreshToken(String(user._id), tokens.refreshToken);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  async refreshTokens(refreshTokenDto: RefreshTokenDto) {
    const { refreshToken } = refreshTokenDto;

    const payload = await this.jwtService
      .verifyAsync<IJwtPayload>(refreshToken)
      .catch(() => {
        throw new UnauthorizedException('Invalid or expired refresh token');
      });

    const user = await this.userModel
      .findById(payload.sub)
      .select('+refreshTokenHash');

    if (!user || !user.refreshTokenHash) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const isRefreshTokenValid = await argon2.verify(
      user.refreshTokenHash,
      refreshToken,
    );

    if (!isRefreshTokenValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokens = await this.generateTokens(user);
    await this.updateRefreshToken(String(user._id), tokens.refreshToken);

    return {
      ...tokens,
    };
  }

  async requestPasswordReset(
    forgotPasswordDto: ForgotPasswordDto,
    context: PasswordResetRequestContext,
  ): Promise<{ expiresInMinutes: number }> {
    const settings = this.getPasswordResetSettings();
    const normalizedEmail = this.normalizeEmail(forgotPasswordDto.email);

    await this.enforceForgotPasswordRateLimit(
      normalizedEmail,
      settings,
      context,
    );

    const user = await this.userModel.findOne({
      email: {
        $regex: new RegExp(`^${this.escapeRegex(normalizedEmail)}$`, 'i'),
      },
    });

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(
      Date.now() + settings.tokenTtlMinutes * 60 * 1000,
    );

    await this.passwordResetTokenModel.create({
      userId: user?._id,
      email: normalizedEmail,
      tokenHash,
      expiresAt,
      requestIp: this.extractHeaderValue(context.ip),
      userAgent: this.extractHeaderValue(context.userAgent),
    });

    if (user) {
      const resetUrl = this.buildResetUrl(settings.url, rawToken);

      this.logger.log(
        `Attempting to send password reset email to ${user.email}`,
      );

      await this.mailService.sendPasswordResetEmail({
        to: user.email,
        fullName: user.fullName,
        resetUrl,
        expiresInMinutes: settings.tokenTtlMinutes,
      });

      this.logger.log(
        `Password reset email request completed for ${user.email}`,
      );
    } else {
      this.logger.log(
        `No user found for email ${normalizedEmail}, skipping email send`,
      );
    }

    return { expiresInMinutes: settings.tokenTtlMinutes };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<void> {
    const { token, password, confirmPassword } = resetPasswordDto;

    if (password !== confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const tokenHash = this.hashToken(token.trim());
    const now = new Date();

    const resetToken = await this.passwordResetTokenModel.findOne({
      tokenHash,
      usedAt: { $exists: false },
      expiresAt: { $gt: now },
    });

    if (!resetToken) {
      throw new UnauthorizedException('Token invalid or expired');
    }

    const user = resetToken.userId
      ? await this.userModel.findById(resetToken.userId).select('+passwordHash')
      : await this.userModel.findOne({
          email: {
            $regex: new RegExp(`^${this.escapeRegex(resetToken.email)}$`, 'i'),
          },
        });

    if (!user) {
      throw new NotFoundException(
        'User associated with this token no longer exists',
      );
    }

    const newPasswordHash = await argon2.hash(password);

    await this.userModel.findByIdAndUpdate(user._id, {
      passwordHash: newPasswordHash,
      refreshTokenHash: undefined,
    });

    await this.passwordResetTokenModel.updateOne(
      { _id: resetToken._id },
      { usedAt: now },
    );

    await this.passwordResetTokenModel.updateMany(
      {
        userId: user._id,
        usedAt: { $exists: false },
        _id: { $ne: resetToken._id },
      },
      { $set: { usedAt: now } },
    );
  }

  async validateUser(payload: IJwtPayload): Promise<IUserProfile> {
    const user = await this.userModel.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return this.sanitizeUser(user);
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const { currentPassword, newPassword } = changePasswordDto;

    // Find user with password hash
    const user = await this.userModel.findById(userId).select('+passwordHash');
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await argon2.verify(
      user.passwordHash,
      currentPassword,
    );
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Check if new password is different from current password
    const isSamePassword = await argon2.verify(user.passwordHash, newPassword);
    if (isSamePassword) {
      throw new ConflictException(
        'New password must be different from current password',
      );
    }

    // Hash new password
    const newPasswordHash = await argon2.hash(newPassword);

    // Update password and clear refresh token for security
    await this.userModel.findByIdAndUpdate(userId, {
      passwordHash: newPasswordHash,
      refreshTokenHash: undefined, // Clear refresh token to force re-login
    });

    return { message: 'Password changed successfully' };
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    const { fullName, email, dateOfBirth, imageUrl, citizenId } =
      updateProfileDto;

    // Check if email is being updated and if it already exists
    if (email) {
      const existingUser = await this.userModel.findOne({
        email,
        _id: { $ne: userId },
      });
      if (existingUser) {
        throw new ConflictException('Email already exists');
      }
    }

    // Prepare update object with only provided fields
    const updateData: Partial<{
      fullName: string;
      email: string;
      dateOfBirth: Date;
      imageUrl: string;
      citizenId: string;
    }> = {};
    if (fullName !== undefined) updateData.fullName = fullName;
    if (email !== undefined) updateData.email = email;
    if (dateOfBirth !== undefined)
      updateData.dateOfBirth = new Date(dateOfBirth);
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (citizenId !== undefined) updateData.citizenId = citizenId;
    // Update user profile
    const updatedUser = await this.userModel.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true },
    );

    if (!updatedUser) {
      throw new UnauthorizedException('User not found');
    }

    return {
      user: this.sanitizeUser(updatedUser),
      message: 'Profile updated successfully',
    };
  }

  async getProfile(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      user: {
        id: String(user._id),
        username: user.username,
        email: user.email,
        role: user.role,
        fullName: user.fullName ?? null,
        dateOfBirth: user.dateOfBirth ?? null,
        imageUrl: user.imageUrl ?? null,
        citizenId: user.citizenId ?? null,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    };
  }

  private async generateTokens(
    user: UserDocument,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload: IJwtPayload = {
      sub: String(user._id),
      email: user.email,
      role: user.role,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: '1d',
    });
    const refreshToken = await this.jwtService.signAsync(payload, {
      expiresIn: '7d',
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  private async updateRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<void> {
    const refreshTokenHash = await argon2.hash(refreshToken);
    await this.userModel.findByIdAndUpdate(userId, {
      refreshTokenHash,
    });
  }

  private sanitizeUser(user: UserDocument): IUserProfile {
    return {
      id: String(user._id),
      username: user.username,
      email: user.email,
      role: user.role,
      fullName: user.fullName ?? null,
      dateOfBirth: user.dateOfBirth ?? undefined,
      imageUrl: user.imageUrl ?? undefined,
      citizenId: user.citizenId ?? undefined,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private getPasswordResetSettings() {
    const defaults = {
      url: 'http://localhost:3000/reset-password',
      tokenTtlMinutes: 15,
      maxRequestsPerHour: 5,
    };
    const configured = this.configService.get<{
      url?: string;
      tokenTtlMinutes?: number;
      maxRequestsPerHour?: number;
    }>('app.passwordReset');

    return {
      url: configured?.url ?? defaults.url,
      tokenTtlMinutes: configured?.tokenTtlMinutes ?? defaults.tokenTtlMinutes,
      maxRequestsPerHour:
        configured?.maxRequestsPerHour ?? defaults.maxRequestsPerHour,
    };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async enforceForgotPasswordRateLimit(
    email: string,
    settings: { maxRequestsPerHour: number },
    context?: PasswordResetRequestContext,
  ) {
    if (settings.maxRequestsPerHour <= 0) {
      return;
    }

    const windowStart = new Date(Date.now() - 60 * 60 * 1000);
    const ipFilter = this.extractHeaderValue(context?.ip);

    const [emailCount, ipCount] = await Promise.all([
      this.passwordResetTokenModel.countDocuments({
        email,
        createdAt: { $gte: windowStart },
      }),
      ipFilter
        ? this.passwordResetTokenModel.countDocuments({
            requestIp: ipFilter,
            createdAt: { $gte: windowStart },
          })
        : Promise.resolve(0),
    ]);

    if (
      emailCount >= settings.maxRequestsPerHour ||
      (ipFilter && ipCount >= settings.maxRequestsPerHour)
    ) {
      throw new HttpException(
        'Too many password reset requests. Please wait before trying again.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private buildResetUrl(baseUrl: string, token: string): string {
    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}token=${encodeURIComponent(token)}`;
  }

  private extractHeaderValue(value?: string | string[]): string | undefined {
    if (!value) {
      return undefined;
    }

    return Array.isArray(value) ? value[0] : value;
  }

  /**
   * Xác thực khuôn mặt của user bằng Gemini
   * @param user Thông tin user từ JWT
   * @param verifyFaceDto Ảnh webcam base64
   * @returns
   */
  async verifyFace(user: IUser, verifyFaceDto: VerifyFaceDto) {
    this.logger.log(`Starting face verification for user: ${user.username}`);

    const { imageUrl: profileImageUrl } = user;
    const { webcamImage } = verifyFaceDto;

    this.logger.log(`Received webcam image for user: ${user?.username}`);
    this.logger.log(`Profile image URL: ${profileImageUrl}`);
    this.logger.log(`Webcam image : ${webcamImage}`);

    // --- Validation 1: User đã có ảnh profile chưa? ---
    if (!profileImageUrl) {
      throw new BadRequestException(
        'Profile picture not set. Please update your profile.',
      );
    }

    // --- Validation 2: Định dạng Base64 ---
    const webcamImageBase64 = webcamImage.split(',').pop();
    if (!webcamImageBase64) {
      throw new BadRequestException('Invalid webcam image format.');
    }

    let profileImageBase64: string;
    let profileMimeType: string;

    try {
      // --- Step 3: Fetch ảnh profile từ URL (ví dụ: Cloudinary) ---
      this.logger.log(`Fetching profile image from: ${profileImageUrl}`);
      const response: AxiosResponse<ArrayBuffer> = await firstValueFrom(
        this.httpService.get<ArrayBuffer>(profileImageUrl, {
          responseType: 'arraybuffer',
        }),
      );

      const headers = response.headers as Record<string, string | undefined>;
      profileMimeType = headers['content-type'] ?? 'image/jpeg';
      const binaryData = Buffer.from(response.data);
      profileImageBase64 = binaryData.toString('base64');
    } catch (error) {
      this.logger.error(
        `Failed to fetch profile image for user ${user.username}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Could not retrieve profile image.',
      );
    }

    // --- Step 4: Gọi Gemini API ---
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

    const systemPrompt =
      "You are an expert security AI. Your task is to determine if two images are of the same person. Respond with only the word 'true' or 'false'.";

    const payload = {
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: 'Are these two images of the same person? Image 1 is their official profile. Image 2 is a live webcam snapshot. Answer only "true" or "false".',
            },
            {
              inlineData: {
                mimeType: profileMimeType,
                data: profileImageBase64,
              },
            },
            {
              inlineData: {
                mimeType: 'image/jpeg', // ảnh webcam là jpeg
                data: webcamImageBase64,
              },
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: 'text/plain',
      },
    };

    try {
      this.logger.log(`Calling Gemini API for user: ${user.username}`);
      const geminiResponse: AxiosResponse<GeminiResponse> =
        await firstValueFrom(
          this.httpService.post<GeminiResponse>(apiUrl, payload, {
            headers: { 'Content-Type': 'application/json' },
          }),
        );

      const textResponse =
        geminiResponse.data.candidates?.[0]?.content.parts?.[0]?.text ?? '';

      const decision = textResponse
        .trim()
        .toLowerCase()
        .replace(/[^a-z]/g, '');

      this.logger.log(`Gemini response for ${user.username}: "${decision}"`);

      // --- Step 5: Xử lý kết quả ---
      if (decision === 'true') {
        return {
          success: true,
          message: 'Face verified successfully.',
        };
      } else {
        this.logger.warn(`Face verification failed for user: ${user.username}`);
        return {
          success: false,
          message: 'Face does not match profile. Verification failed.',
        };
      }
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error; // Ném lại lỗi 401

      this.logger.error(
        `Gemini API call failed for user ${user.username}`,
        error.response?.data || error.message,
      );
      if (error.response?.status === 403) {
        throw new InternalServerErrorException(
          'Face verification failed: Invalid API Key or permissions.',
        );
      }
      throw new InternalServerErrorException(
        'Face verification service failed.',
      );
    }
  }

  /**
   * Use Gemini to check the quality of the profile image
   * @param imageBase64 Image (including data:image/jpeg;base64,)
   * @returns
   */
  async validateProfileImage(imageBase64: string) {
    this.logger.log('Validating new profile image...');

    // Tách mime type và data
    const parts = imageBase64.match(/^data:(image\/(?:jpeg|png));base64,(.*)$/);
    if (!parts || parts.length !== 3) {
      throw new BadRequestException(
        'Invalid image format. Must be data URL (jpeg/png).',
      );
    }

    const mimeType = parts[1]; // "image/jpeg"
    const base64Data = parts[2]; // "..."

    // call Gemini API
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      this.logger.error('GEMINI_API_KEY is not set.');
      throw new InternalServerErrorException('AI service is not configured.');
    }
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

    const systemPrompt =
      "You are an AI passport photo checker. Analyze *the user's image. Determine if it is a valid profile picture for a secure exam system. Check for: 1. Only one clear human face. 2. Face is centered. 3. Face is looking forward. 4. No obstructions (sunglasses, masks). 5. Image is clear (not blurry).";

    // Ask Gemini to return JSON
    const jsonSchema = {
      type: 'OBJECT',
      properties: {
        isValid: { type: 'BOOLEAN' },
        reason: { type: 'STRING' },
      },
      required: ['isValid', 'reason'],
    };

    const payload = {
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: [
        {
          role: 'user',
          parts: [
            { text: 'Analyze this image and return JSON.' },
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Data,
              },
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: jsonSchema,
      },
    };

    try {
      const geminiResponse = await firstValueFrom(
        this.httpService.post(apiUrl, payload, {
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      // Parse text JSON từ Gemini
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const jsonText = geminiResponse.data.candidates[0].content.parts[0].text;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument
      const result: ImageValidationResult = JSON.parse(jsonText);

      this.logger.log(`Image validation result: ${JSON.stringify(result)}`);

      // --- Xử lý kết quả ---
      if (result.isValid) {
        return {
          success: true,
          message: 'Image is valid.',
        };
      } else {
        // Throw 400 error with reason from AI
        throw new BadRequestException(result.reason || 'Image is not valid.');
      }
    } catch (error) {
      if (error instanceof BadRequestException) throw error; // Ném lại lỗi 400
      this.logger.error(
        'Gemini API call failed',
        error.response?.data || error.message,
      );
      throw new InternalServerErrorException('AI validation service failed.');
    }
  }
}
