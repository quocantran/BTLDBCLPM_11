import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ExamDocument = Exam & Document;

@Schema({ timestamps: true })
export class Exam {
  @Prop({
    required: true,
    unique: true,
    index: true,
    immutable: true,
    match: /^E\d{6}$/,
  })
  publicId: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true, min: 1 })
  durationMinutes: number;

  @Prop({ type: Date, required: true })
  startTime: Date;

  @Prop({ type: Date, required: true })
  endTime: Date;

  @Prop({
    type: String,
    enum: ['scheduled', 'active', 'completed', 'cancelled'],
    default: 'scheduled',
  })
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';

  @Prop({ type: Types.ObjectId, ref: 'Course', required: true })
  courseId: Types.ObjectId;

  @Prop({ type: [Types.ObjectId], ref: 'Question', required: true })
  questions: Types.ObjectId[];

  @Prop({ required: true, min: 0, max: 100 })
  rateScore: number; // Passing score percentage (e.g., 80%)

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;
}

export const ExamSchema = SchemaFactory.createForClass(Exam);

// Indexes
ExamSchema.index({ courseId: 1 });
ExamSchema.index({ status: 1 });
ExamSchema.index({ startTime: 1, endTime: 1 });
ExamSchema.index({ createdAt: -1 });
