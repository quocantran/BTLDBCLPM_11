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
import { generatePrefixedPublicId } from '../common/utils/public-id.util';

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

  try {
    console.log('🌱 Seeding database...');

    // Clear existing data
    console.log('📝 Clearing existing data...');
    await Promise.all([
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
    const hashedPassword = await argon2.hash('password123');

    const users = await userModel.insertMany([
      {
        username: 'admin',
        email: 'admin@edu-chain.com',
        passwordHash: hashedPassword,
        fullName: 'System Administrator',
        dateOfBirth: new Date('1985-05-15'),
        role: 'admin',
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
      },
      {
        username: 'teacher.alice',
        email: 'teacher1@edu-chain.com',
        passwordHash: hashedPassword,
        fullName: 'Dr. Alice Johnson',
        dateOfBirth: new Date('1978-03-22'),
        role: 'teacher',
        walletAddress: '0x2345678901abcdef2345678901abcdef23456789',
      },
      {
        username: 'teacher.bob',
        email: 'teacher2@edu-chain.com',
        passwordHash: hashedPassword,
        fullName: 'Prof. Bob Smith',
        dateOfBirth: new Date('1975-11-08'),
        role: 'teacher',
        walletAddress: '0x3456789012abcdef3456789012abcdef34567890',
      },
      {
        username: 'student.john',
        email: 'student1@edu-chain.com',
        passwordHash: hashedPassword,
        fullName: 'John Doe',
        dateOfBirth: new Date('2000-01-15'),
        role: 'student',
        walletAddress: '0x4567890123abcdef4567890123abcdef45678901',
      },
      {
        username: 'student.jane',
        email: 'student2@edu-chain.com',
        passwordHash: hashedPassword,
        fullName: 'Jane Smith',
        dateOfBirth: new Date('1999-08-20'),
        role: 'student',
        walletAddress: '0x5678901234abcdef5678901234abcdef56789012',
      },
      {
        username: 'student.michael',
        email: 'student3@edu-chain.com',
        passwordHash: hashedPassword,
        fullName: 'Michael Brown',
        dateOfBirth: new Date('2001-12-03'),
        role: 'student',
      },
    ]);

    const [, teacher1, teacher2, student1, student2, student3] = users;

    // Create sample courses
    console.log('📚 Creating sample courses...');
    const courseSeedData = [
      {
        courseName: 'Introduction to Computer Science',
        teacherId: teacher1._id,
      },
      {
        courseName: 'Web Development Fundamentals',
        teacherId: teacher1._id,
      },
      {
        courseName: 'Database Management Systems',
        teacherId: teacher2._id,
      },
      {
        courseName: 'Data Structures and Algorithms',
        teacherId: teacher2._id,
      },
    ];

    const courseDocuments = [] as Array<Record<string, unknown>>;
    for (const payload of courseSeedData) {
      const publicId = await generatePrefixedPublicId('C', courseModel);
      courseDocuments.push({ ...payload, publicId });
    }

    const courses = await courseModel.insertMany(courseDocuments);

    const [course1, course2, course3, course4] = courses;

    // Create enrollments
    console.log('📝 Creating enrollments...');
    await enrollmentModel.insertMany([
      { studentId: student1._id, courseId: course1._id },
      { studentId: student1._id, courseId: course2._id },
      { studentId: student2._id, courseId: course1._id },
      { studentId: student2._id, courseId: course3._id },
      { studentId: student3._id, courseId: course2._id },
      { studentId: student3._id, courseId: course4._id },
    ]);

    // Create sample questions
    console.log('❓ Creating sample questions...');
    const questions = await questionModel.insertMany([
      {
        content: 'What is the time complexity of binary search?',
        teacherId: teacher1._id,
        answerQuestion: 2,
        answer: [
          { content: 'O(n)', isCorrect: false },
          { content: 'O(log n)', isCorrect: true },
          { content: 'O(n^2)', isCorrect: false },
          { content: 'O(1)', isCorrect: false },
        ],
      },
      {
        content: 'Which of the following is NOT a programming paradigm?',
        teacherId: teacher1._id,
        answerQuestion: 3,
        answer: [
          { content: 'Object-oriented', isCorrect: false },
          { content: 'Functional', isCorrect: false },
          { content: 'Relational', isCorrect: true },
          { content: 'Procedural', isCorrect: false },
        ],
      },
      {
        content: 'What does HTML stand for?',
        teacherId: teacher1._id,
        answerQuestion: 1,
        answer: [
          { content: 'HyperText Markup Language', isCorrect: true },
          { content: 'Home Tool Markup Language', isCorrect: false },
          { content: 'Hyperlinks and Text Markup Language', isCorrect: false },
          { content: 'Hyper Tool Markup Language', isCorrect: false },
        ],
      },
      {
        content: 'Which SQL command is used to retrieve data?',
        teacherId: teacher2._id,
        answerQuestion: 2,
        answer: [
          { content: 'INSERT', isCorrect: false },
          { content: 'SELECT', isCorrect: true },
          { content: 'UPDATE', isCorrect: false },
          { content: 'DELETE', isCorrect: false },
        ],
      },
      {
        content: 'What is a primary key in a database?',
        teacherId: teacher2._id,
        answerQuestion: 1,
        answer: [
          { content: 'A unique identifier for each record', isCorrect: true },
          { content: 'A foreign key reference', isCorrect: false },
          { content: 'An index for faster queries', isCorrect: false },
          { content: 'A backup key', isCorrect: false },
        ],
      },
    ]);

    // Create sample exams
    console.log('📋 Creating sample exams...');
    const examSeedData = [
      {
        title: 'Computer Science Midterm Exam',
        durationMinutes: 90,
        startTime: new Date('2025-10-15T09:00:00Z'),
        endTime: new Date('2025-10-15T12:00:00Z'),
        status: 'active',
        courseId: course1._id,
        questions: [questions[0]._id, questions[1]._id, questions[2]._id],
        rateScore: 70,
      },
      {
        title: 'Web Development Final Exam',
        durationMinutes: 120,
        startTime: new Date('2025-11-20T14:00:00Z'),
        endTime: new Date('2025-11-20T18:00:00Z'),
        status: 'draft',
        courseId: course2._id,
        questions: [questions[2]._id],
        rateScore: 75,
      },
      {
        title: 'Database Quiz 1',
        durationMinutes: 45,
        startTime: new Date('2025-09-25T10:00:00Z'),
        endTime: new Date('2025-09-25T12:00:00Z'),
        status: 'completed',
        courseId: course3._id,
        questions: [questions[3]._id, questions[4]._id],
        rateScore: 80,
      },
    ];

    const examDocuments = [] as Array<Record<string, unknown>>;
    for (const payload of examSeedData) {
      const publicId = await generatePrefixedPublicId('E', examModel);
      examDocuments.push({ ...payload, publicId });
    }

    const exams = await examModel.insertMany(examDocuments);

    const [exam1, , exam3] = exams;

    // Create sample submissions
    console.log('📤 Creating sample submissions...');
    const submissions = await submissionModel.insertMany([
      {
        studentId: student1._id,
        examId: exam1._id,
        score: 85,
        status: 'graded',
        submittedAt: new Date('2025-10-15T10:30:00Z'),
        answers: [
          { questionId: questions[0]._id, answerNumber: 2 },
          { questionId: questions[1]._id, answerNumber: 3 },
          { questionId: questions[2]._id, answerNumber: 1 },
        ],
      },
      {
        studentId: student2._id,
        examId: exam1._id,
        score: 92,
        status: 'graded',
        submittedAt: new Date('2025-10-15T10:45:00Z'),
        answers: [
          { questionId: questions[0]._id, answerNumber: 2 },
          { questionId: questions[1]._id, answerNumber: 3 },
          { questionId: questions[2]._id, answerNumber: 1 },
        ],
      },
      {
        studentId: student2._id,
        examId: exam3._id,
        score: 88,
        status: 'graded',
        submittedAt: new Date('2025-09-25T10:30:00Z'),
        answers: [
          { questionId: questions[3]._id, answerNumber: 2 },
          { questionId: questions[4]._id, answerNumber: 1 },
        ],
      },
    ]);

    // Create sample certificates
    console.log('🏆 Creating sample certificates...');
    await certificateModel.insertMany([
      {
        studentId: student1._id,
        courseId: course1._id,
        status: 'issued',
        submissionId: submissions[0]._id,
        tokenId: 'EDU-CERT-001',
        ipfsHash: 'QmXyZ123abc456def789ghi012jkl345mno678pqr901stu234',
        transactionHash:
          '0xabcdef123456789abcdef123456789abcdef123456789abcdef123456789abcdef',
        issuedAt: new Date('2025-10-16T08:00:00Z'),
        outdateTime: new Date('2030-10-16T08:00:00Z'),
      },
      {
        studentId: student2._id,
        courseId: course1._id,
        status: 'issued',
        submissionId: submissions[1]._id,
        tokenId: 'EDU-CERT-002',
        ipfsHash: 'QmAbc456def789ghi012jkl345mno678pqr901stu234vwx567',
        transactionHash:
          '0x123456789abcdef123456789abcdef123456789abcdef123456789abcdef123456',
        issuedAt: new Date('2025-10-16T08:15:00Z'),
        outdateTime: new Date('2030-10-16T08:15:00Z'),
      },
      {
        studentId: student2._id,
        courseId: course3._id,
        status: 'pending',
        submissionId: submissions[2]._id,
      },
    ]);

    console.log('✅ Database seeded successfully!');
    console.log(`
📊 Sample Data Created:
- 👥 Users: 6 (1 admin, 2 teachers, 3 students)
- 📚 Courses: 4
- 📝 Enrollments: 6
- ❓ Questions: 5 (with 4 choices each)
- 📋 Exams: 3
- 📤 Submissions: 3
- 🏆 Certificates: 3

🔐 Login Credentials (all passwords: password123):
- Admin: admin@edu-chain.com
- Teacher 1: teacher1@edu-chain.com  
- Teacher 2: teacher2@edu-chain.com
- Student 1: student1@edu-chain.com
- Student 2: student2@edu-chain.com
- Student 3: student3@edu-chain.com
    `);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    await app.close();
  }
}

bootstrap().catch(console.error);
