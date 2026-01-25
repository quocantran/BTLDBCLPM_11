import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PasswordResetTokenDocument = PasswordResetToken & Document;

@Schema({ timestamps: true })
export class PasswordResetToken {
  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  userId?: Types.ObjectId;

  @Prop({ required: true, lowercase: true, trim: true, index: true })
  email: string;

  @Prop({ required: true, unique: true })
  tokenHash: string;

  @Prop({ type: Date, required: true, index: true, expires: 0 })
  expiresAt: Date;

  @Prop({ type: Date })
  usedAt?: Date;

  @Prop({ trim: true })
  requestIp?: string;

  @Prop({ trim: true })
  userAgent?: string;
}

export const PasswordResetTokenSchema =
  SchemaFactory.createForClass(PasswordResetToken);

PasswordResetTokenSchema.index({ email: 1, createdAt: -1 });
PasswordResetTokenSchema.index({ userId: 1, createdAt: -1 });
PasswordResetTokenSchema.index({ tokenHash: 1, expiresAt: 1 });
