import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema()
export class Choice {
  @Prop({ required: true })
  content: string;

  @Prop({ required: true })
  isCorrect: boolean;
}

export type QuestionDocument = Question & Document;

@Schema({ timestamps: true })
export class Question {
  @Prop({ required: true })
  content: string;

  @Prop({ required: true, min: 1, max: 4 })
  answerQuestion: number; // Correct answer number (1, 2, 3, or 4)

  @Prop({
    type: [Choice],
    required: true,
    validate: [arrayLimit, 'Exactly 4 choices required'],
  })
  answer: Choice[]; // Array of 4 choices (renamed from choices to answer per spec)

  @Prop({ type: Types.ObjectId, ref: 'Course', required: true })
  courseId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  teacherId: Types.ObjectId;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;
}

function arrayLimit(val: Choice[]) {
  return val.length === 4;
}

export const QuestionSchema = SchemaFactory.createForClass(Question);

// Indexes
QuestionSchema.index({ teacherId: 1 });
QuestionSchema.index({ courseId: 1 });
QuestionSchema.index({ createdAt: -1 });
