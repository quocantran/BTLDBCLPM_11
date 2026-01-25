import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import pinataConfig from './config/pinata.config';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { CertificateModule } from './modules/certificates/certificate.module';
import { CoursesModule } from './modules/courses/courses.module';
import { ExamsModule } from './modules/exams/exams.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { CertificateVerificationModule } from './modules/certificate-verification/certificate-verification.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

// Import all schemas for seeding
import { User, UserSchema } from './database/schemas/user.schema';
import { Course, CourseSchema } from './database/schemas/course.schema';
import {
  Enrollment,
  EnrollmentSchema,
} from './database/schemas/enrollment.schema';
import { Question, QuestionSchema } from './database/schemas/question.schema';
import { Exam, ExamSchema } from './database/schemas/exam.schema';
import {
  Submission,
  SubmissionSchema,
} from './database/schemas/submission.schema';
import {
  Certificate,
  CertificateSchema,
} from './database/schemas/certificate.schema';
import {
  Notification,
  NotificationSchema,
} from './database/schemas/notification.schema';
import { NotificationsModule } from './modules/notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, jwtConfig, pinataConfig],
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('database.uri'),
        retryWrites: true,
        w: 'majority',
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      }),
      inject: [ConfigService],
    }),
    // Register all schemas for seeding
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Course.name, schema: CourseSchema },
      { name: Enrollment.name, schema: EnrollmentSchema },
      { name: Question.name, schema: QuestionSchema },
      { name: Exam.name, schema: ExamSchema },
      { name: Submission.name, schema: SubmissionSchema },
      { name: Certificate.name, schema: CertificateSchema },
      { name: Notification.name, schema: NotificationSchema },
    ]),
    AuthModule,
    HealthModule,
    CertificateModule,
    CoursesModule,
    ExamsModule,
    DashboardModule,
    CertificateVerificationModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
