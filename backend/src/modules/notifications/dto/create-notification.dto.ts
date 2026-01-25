import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import {
  NOTIFICATION_AUDIENCES,
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_TYPES,
  type NotificationAudience,
  type NotificationCategory,
  type NotificationType,
} from '../../../database/schemas/notification.schema';

export class CreateNotificationDto {
  @ApiProperty({ description: 'Recipient user identifier' })
  @IsMongoId()
  recipientId: string;

  @ApiProperty({ enum: NOTIFICATION_AUDIENCES })
  @IsEnum(NOTIFICATION_AUDIENCES)
  audience: NotificationAudience;

  @ApiProperty({ enum: NOTIFICATION_CATEGORIES })
  @IsEnum(NOTIFICATION_CATEGORIES)
  category: NotificationCategory;

  @ApiProperty({
    enum: NOTIFICATION_TYPES,
  })
  @IsEnum(NOTIFICATION_TYPES)
  type: NotificationType;

  @ApiProperty({ description: 'Short notification title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Detailed notification message' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({
    description: 'Target URL when the notification is opened',
  })
  @IsOptional()
  @IsString()
  actionUrl?: string;

  @ApiPropertyOptional({ description: 'Related exam identifier' })
  @IsOptional()
  @IsMongoId()
  examId?: string;

  @ApiPropertyOptional({ description: 'Related certificate identifier' })
  @IsOptional()
  @IsMongoId()
  certificateId?: string;

  @ApiPropertyOptional({ description: 'Additional structured metadata' })
  @IsOptional()
  @IsObject()
  @Type(() => Object)
  metadata?: Record<string, unknown>;
}
