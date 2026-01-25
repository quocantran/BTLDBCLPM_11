import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema()
export class Answer {
  @Prop({ type: Types.ObjectId, ref: 'Question', required: true })
  questionId: Types.ObjectId;

  @Prop({ required: true, min: 1, max: 4 })
  answerNumber: number;
}

export type SubmissionDocument = Submission & Document;

@Schema({ timestamps: true })
export class Submission {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  studentId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Exam', required: true })
  examId: Types.ObjectId;

  @Prop({ required: true, min: 0, max: 100 })
  score: number;

  @Prop({
    type: String,
    enum: ['in_progress', 'submitted', 'graded'],
    default: 'in_progress',
  })
  status: 'in_progress' | 'submitted' | 'graded';

  @Prop({ type: Date })
  submittedAt?: Date;

  @Prop({ type: [Answer], required: true })
  answers: Answer[];

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;
}

export const SubmissionSchema = SchemaFactory.createForClass(Submission);

// Indexes
SubmissionSchema.index({ studentId: 1 });
SubmissionSchema.index({ examId: 1 });
SubmissionSchema.index({ studentId: 1, examId: 1 }, { unique: true }); // One submission per student per exam
SubmissionSchema.index({ status: 1 });
SubmissionSchema.index({ score: 1 });
SubmissionSchema.index({ submittedAt: -1 });
