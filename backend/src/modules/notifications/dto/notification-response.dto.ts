import { ApiProperty } from '@nestjs/swagger';
import type {
  NotificationAudience,
  NotificationCategory,
  NotificationType,
} from '../../../database/schemas/notification.schema';

export class NotificationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  recipientId: string;

  @ApiProperty({ enum: ['student', 'teacher', 'admin'] })
  audience: NotificationAudience;

  @ApiProperty({ enum: ['exam', 'certificate', 'system'] })
  category: NotificationCategory;

  @ApiProperty({
    enum: [
      'exam_scheduled_to_active',
      'exam_active_to_completed',
      'certificate_issued',
      'generic',
    ],
  })
  type: NotificationType;

  @ApiProperty()
  title: string;

  @ApiProperty()
  message: string;

  @ApiProperty({ required: false })
  actionUrl?: string;

  @ApiProperty({ required: false })
  examId?: string;

  @ApiProperty({ required: false })
  certificateId?: string;

  @ApiProperty({ required: false })
  metadata?: Record<string, unknown>;

  @ApiProperty()
  isRead: boolean;

  @ApiProperty({ required: false })
  readAt?: Date | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
