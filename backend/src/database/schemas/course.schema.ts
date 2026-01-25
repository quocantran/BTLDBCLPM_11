import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CourseDocument = Course & Document;

@Schema({ timestamps: true })
export class Course {
  @Prop({
    required: true,
    unique: true,
    index: true,
    immutable: true,
    match: /^C\d{6}$/,
  })
  publicId: string;

  @Prop({ required: true, trim: true })
  courseName: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  teacherId: Types.ObjectId; // Reference to teacher (User with role 'teacher')

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;
}

export const CourseSchema = SchemaFactory.createForClass(Course);

// Indexes for better query performance
CourseSchema.index({ teacherId: 1 }); // Index for teacher queries
CourseSchema.index({ createdAt: -1 }); // Index for date sorting
