import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Model } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import * as argon2 from 'argon2';
import { User } from '../database/schemas/user.schema';
import { Course } from '../database/schemas/course.schema';
import { Enrollment } from '../database/schemas/enrollment.schema';
import { Question } from '../database/schemas/question.schema';
import { Exam } from '../database/schemas/exam.schema';
import { Submission } from '../database/schemas/submission.schema';
import { Certificate } from '../database/schemas/certificate.schema';
import { Notification } from '../database/schemas/notification.schema';
import { PasswordResetToken } from '../database/schemas/password-reset-token.schema';
import { generatePrefixedPublicId } from '../common/utils/public-id.util';
import {
  SEED_CERTIFICATES,
  SEED_COURSES,
  SEED_ENROLLMENTS,
  SEED_EXAMS,
  SEED_NOTIFICATIONS,
  SEED_PASSWORD,
  SEED_QUESTIONS,
  SEED_SUBMISSIONS,
  SEED_USERS,
} from './seed_data';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const userModel = app.get<Model<User>>(getModelToken(User.name));
  const courseModel = app.get<Model<Course>>(getModelToken(Course.name));
  const enrollmentModel = app.get<Model<Enrollment>>(
    getModelToken(Enrollment.name),
  );
  const questionModel = app.get<Model<Question>>(getModelToken(Question.name));
  const examModel = app.get<Model<Exam>>(getModelToken(Exam.name));
  const submissionModel = app.get<Model<Submission>>(
    getModelToken(Submission.name),
  );
  const certificateModel = app.get<Model<Certificate>>(
    getModelToken(Certificate.name),
  );
  const notificationModel = app.get<Model<Notification>>(
    getModelToken(Notification.name),
  );
  const passwordResetTokenModel = app.get<Model<PasswordResetToken>>(
    getModelToken(PasswordResetToken.name),
  );

  try {
    console.log('🌱 Seeding database...');

    // Clear existing data
    console.log('📝 Clearing existing data...');
    await Promise.all([
      passwordResetTokenModel.deleteMany({}),
      notificationModel.deleteMany({}),
      certificateModel.deleteMany({}),
      submissionModel.deleteMany({}),
      examModel.deleteMany({}),
      questionModel.deleteMany({}),
      enrollmentModel.deleteMany({}),
      courseModel.deleteMany({}),
      userModel.deleteMany({}),
    ]);

    // Create sample users
    console.log('👥 Creating sample users...');
    const hashedPassword = await argon2.hash(SEED_PASSWORD);
    const createdUsers = await userModel.insertMany(
      SEED_USERS.map((user) => ({
        username: user.username,
        email: user.email,
        passwordHash: hashedPassword,
        fullName: user.fullName,
        dateOfBirth: new Date(user.dateOfBirth),
        role: user.role,
        walletAddress: user.walletAddress,
      })),
    );

    const usersByKey = new Map(
      SEED_USERS.map((seedUser, index) => [seedUser.key, createdUsers[index]]),
    );

    // Create sample courses
    console.log('📚 Creating sample courses...');
    const courseDocuments = [] as Array<Record<string, unknown>>;
    for (const payload of SEED_COURSES) {
      const teacher = usersByKey.get(payload.teacherKey);
      if (!teacher) {
        throw new Error(`Teacher ${payload.teacherKey} not found in seed map`);
      }
      const publicId = await generatePrefixedPublicId('C', courseModel);
      courseDocuments.push({
        publicId,
        courseName: payload.courseName,
        teacherId: teacher._id,
      });
    }

    const createdCourses = await courseModel.insertMany(courseDocuments);
    const coursesByKey = new Map(
      SEED_COURSES.map((seedCourse, index) => [seedCourse.key, createdCourses[index]]),
    );

    // Create enrollments
    console.log('📝 Creating enrollments...');
    await enrollmentModel.insertMany(
      SEED_ENROLLMENTS.map((seedEnrollment) => {
        const student = usersByKey.get(seedEnrollment.studentKey);
        const course = coursesByKey.get(seedEnrollment.courseKey);
        if (!student || !course) {
          throw new Error(
            `Enrollment relation invalid: ${seedEnrollment.studentKey} -> ${seedEnrollment.courseKey}`,
          );
        }
        return {
          studentId: student._id,
          courseId: course._id,
        };
      }),
    );

    // Create sample questions
    console.log('❓ Creating sample questions...');
    const createdQuestions = await questionModel.insertMany(
      SEED_QUESTIONS.map((seedQuestion) => {
        const teacher = usersByKey.get(seedQuestion.teacherKey);
        const course = coursesByKey.get(seedQuestion.courseKey);
        if (!teacher || !course) {
          throw new Error(`Question relation invalid: ${seedQuestion.key}`);
        }
        return {
          content: seedQuestion.content,
          teacherId: teacher._id,
          courseId: course._id,
          answerQuestion: seedQuestion.answerQuestion,
          answer: seedQuestion.answer,
        };
      }),
    );

    const questionsByKey = new Map(
      SEED_QUESTIONS.map((seedQuestion, index) => [seedQuestion.key, createdQuestions[index]]),
    );

    // Create sample exams
    console.log('📋 Creating sample exams...');
    const examDocuments = [] as Array<Record<string, unknown>>;
    for (const payload of SEED_EXAMS) {
      const course = coursesByKey.get(payload.courseKey);
      if (!course) {
        throw new Error(`Exam course invalid: ${payload.key}`);
      }
      const examQuestionIds = payload.questionKeys.map((questionKey) => {
        const question = questionsByKey.get(questionKey);
        if (!question) {
          throw new Error(
            `Exam question invalid: exam=${payload.key}, question=${questionKey}`,
          );
        }
        return question._id;
      });
      const publicId = await generatePrefixedPublicId('E', examModel);
      examDocuments.push({
        publicId,
        title: payload.title,
        durationMinutes: payload.durationMinutes,
        startTime: payload.window.startTime,
        endTime: payload.window.endTime,
        status: payload.window.status,
        courseId: course._id,
        questions: examQuestionIds,
        rateScore: payload.rateScore,
      });
    }

    const createdExams = await examModel.insertMany(examDocuments);
    const examsByKey = new Map(
      SEED_EXAMS.map((seedExam, index) => [seedExam.key, createdExams[index]]),
    );

    // Create sample submissions
    console.log('📤 Creating sample submissions...');
    const createdSubmissions = await submissionModel.insertMany(
      SEED_SUBMISSIONS.map((seedSubmission) => {
        const student = usersByKey.get(seedSubmission.studentKey);
        const exam = examsByKey.get(seedSubmission.examKey);
        if (!student || !exam) {
          throw new Error(
            `Submission relation invalid: ${seedSubmission.studentKey} -> ${seedSubmission.examKey}`,
          );
        }

        return {
          studentId: student._id,
          examId: exam._id,
          score: seedSubmission.score,
          status: seedSubmission.status,
          submittedAt: seedSubmission.submittedAt,
          answers: seedSubmission.answers.map((answer) => {
            const question = questionsByKey.get(answer.questionKey);
            if (!question) {
              throw new Error(
                `Submission answer invalid: question=${answer.questionKey}`,
              );
            }
            return {
              questionId: question._id,
              answerNumber: answer.answerNumber,
            };
          }),
        };
      }),
    );

    // Create sample certificates
    console.log('🏆 Creating sample certificates...');
    const createdCertificates = await certificateModel.insertMany(
      SEED_CERTIFICATES.map((seedCertificate) => {
        const student = usersByKey.get(seedCertificate.studentKey);
        const course = coursesByKey.get(seedCertificate.courseKey);
        const submission = createdSubmissions[seedCertificate.submissionRef];

        if (!student || !course || !submission) {
          throw new Error(
            `Certificate relation invalid: student=${seedCertificate.studentKey}, course=${seedCertificate.courseKey}, submissionRef=${seedCertificate.submissionRef}`,
          );
        }

        return {
          studentId: student._id,
          courseId: course._id,
          submissionId: submission._id,
          status: seedCertificate.status,
          tokenId: seedCertificate.tokenId,
          ipfsHash: seedCertificate.ipfsHash,
          ipfsImage: seedCertificate.ipfsImage,
          transactionHash: seedCertificate.transactionHash,
          issuedAt: seedCertificate.issuedAt,
          outdateTime: seedCertificate.outdateTime,
        };
      }),
    );

    // Create sample notifications
    console.log('🔔 Creating sample notifications...');
    await notificationModel.insertMany(
      SEED_NOTIFICATIONS.map((seedNotification, index) => {
        const recipient = usersByKey.get(seedNotification.recipientKey);
        if (!recipient) {
          throw new Error(
            `Notification recipient invalid: ${seedNotification.recipientKey}`,
          );
        }

        const certificate = createdCertificates[0];
        const activeExam = examsByKey.get('exam_web_active');

        return {
          recipientId: recipient._id,
          audience: seedNotification.audience,
          category: seedNotification.category,
          type: seedNotification.type,
          title: seedNotification.title,
          message: seedNotification.message,
          actionUrl: seedNotification.actionUrl,
          examId: index === 1 ? activeExam?._id : undefined,
          certificateId: index === 0 ? certificate?._id : undefined,
          metadata: {
            source: 'seed-script',
            createdBy: 'src/scripts/seed.ts',
          },
          isRead: seedNotification.isRead ?? false,
        };
      }),
    );

    console.log('✅ Database seeded successfully!');
    console.log(`
📊 Sample Data Created:
- 👥 Users: ${createdUsers.length} (1 admin, 2 teachers, 3 students)
- 📚 Courses: ${createdCourses.length}
- 📝 Enrollments: ${SEED_ENROLLMENTS.length}
- ❓ Questions: ${createdQuestions.length}
- 📋 Exams: ${createdExams.length}
- 📤 Submissions: ${createdSubmissions.length}
- 🏆 Certificates: ${createdCertificates.length}
- 🔔 Notifications: ${SEED_NOTIFICATIONS.length}

🔐 Login Credentials (all passwords: ${SEED_PASSWORD}):
- Admin: admin@academix.local
- Teacher 1: teacher1@academix.local
- Teacher 2: teacher2@academix.local
- Student 1: student1@academix.local
- Student 2: student2@academix.local
- Student 3: student3@academix.local
    `);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    await app.close();
  }
}

bootstrap().catch(console.error);
