import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ExamsController } from './exams.controller';
import { ExamsService } from './exams.service';
import { Exam, ExamSchema } from '../../database/schemas/exam.schema';
import {
  Question,
  QuestionSchema,
} from '../../database/schemas/question.schema';
import { Course, CourseSchema } from '../../database/schemas/course.schema';

import {
  Submission,
  SubmissionSchema,
} from '../../database/schemas/submission.schema';
import { User, UserSchema } from '../../database/schemas/user.schema';
import { NotificationsModule } from '../notifications/notifications.module';
import { ExamStatusScheduler } from './exam-status.scheduler';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Exam.name, schema: ExamSchema },
      { name: Question.name, schema: QuestionSchema },
      { name: Course.name, schema: CourseSchema },
      { name: Submission.name, schema: SubmissionSchema },
      { name: User.name, schema: UserSchema },
    ]),
    NotificationsModule,
  ],
  controllers: [ExamsController],
  providers: [ExamsService, ExamStatusScheduler],
  exports: [ExamsService],
})
export class ExamsModule {}
