type UserRole = 'student' | 'teacher' | 'admin';

export interface SeedUser {
  key: string;
  username: string;
  email: string;
  fullName: string;
  role: UserRole;
  dateOfBirth: string;
  walletAddress?: string;
}

export interface SeedCourse {
  key: string;
  courseName: string;
  teacherKey: string;
}

export interface SeedEnrollment {
  studentKey: string;
  courseKey: string;
}

export interface SeedChoice {
  content: string;
  isCorrect: boolean;
}

export interface SeedQuestion {
  key: string;
  content: string;
  answerQuestion: number;
  answer: SeedChoice[];
  teacherKey: string;
  courseKey: string;
}

export interface SeedExamWindow {
  startTime: Date;
  endTime: Date;
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
}

export interface SeedExam {
  key: string;
  title: string;
  durationMinutes: number;
  rateScore: number;
  courseKey: string;
  questionKeys: string[];
  window: SeedExamWindow;
}

export interface SeedSubmission {
  studentKey: string;
  examKey: string;
  score: number;
  status: 'in_progress' | 'submitted' | 'graded';
  submittedAt?: Date;
  answers: Array<{
    questionKey: string;
    answerNumber: number;
  }>;
}

export interface SeedCertificate {
  studentKey: string;
  courseKey: string;
  submissionRef: number;
  status: 'pending' | 'issued' | 'revoked';
  tokenId?: string;
  ipfsHash?: string;
  ipfsImage?: string;
  transactionHash?: string;
  issuedAt?: Date;
  outdateTime?: Date;
}

export interface SeedNotification {
  recipientKey: string;
  audience: 'student' | 'teacher' | 'admin';
  category: 'exam' | 'certificate' | 'system';
  type:
    | 'exam_scheduled_to_active'
    | 'exam_active_to_completed'
    | 'certificate_issued'
    | 'generic';
  title: string;
  message: string;
  actionUrl?: string;
  isRead?: boolean;
}

export const SEED_PASSWORD = 'password123';

export const SEED_USERS: SeedUser[] = [
  {
    key: 'admin',
    username: 'admin',
    email: 'admin@academix.local',
    fullName: 'System Administrator',
    role: 'admin',
    dateOfBirth: '1985-05-15',
    walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
  },
  {
    key: 'teacher_alice',
    username: 'teacher.alice',
    email: 'teacher1@academix.local',
    fullName: 'Dr. Alice Johnson',
    role: 'teacher',
    dateOfBirth: '1978-03-22',
    walletAddress: '0x2345678901abcdef2345678901abcdef23456789',
  },
  {
    key: 'teacher_bob',
    username: 'teacher.bob',
    email: 'teacher2@academix.local',
    fullName: 'Prof. Bob Smith',
    role: 'teacher',
    dateOfBirth: '1975-11-08',
    walletAddress: '0x3456789012abcdef3456789012abcdef34567890',
  },
  {
    key: 'student_john',
    username: 'student.john',
    email: 'student1@academix.local',
    fullName: 'John Doe',
    role: 'student',
    dateOfBirth: '2000-01-15',
    walletAddress: '0x4567890123abcdef4567890123abcdef45678901',
  },
  {
    key: 'student_jane',
    username: 'student.jane',
    email: 'student2@academix.local',
    fullName: 'Jane Smith',
    role: 'student',
    dateOfBirth: '1999-08-20',
    walletAddress: '0x5678901234abcdef5678901234abcdef56789012',
  },
  {
    key: 'student_michael',
    username: 'student.michael',
    email: 'student3@academix.local',
    fullName: 'Michael Brown',
    role: 'student',
    dateOfBirth: '2001-12-03',
  },
];

export const SEED_COURSES: SeedCourse[] = [
  {
    key: 'course_cs',
    courseName: 'Introduction to Computer Science',
    teacherKey: 'teacher_alice',
  },
  {
    key: 'course_web',
    courseName: 'Web Development Fundamentals',
    teacherKey: 'teacher_alice',
  },
  {
    key: 'course_db',
    courseName: 'Database Management Systems',
    teacherKey: 'teacher_bob',
  },
  {
    key: 'course_algo',
    courseName: 'Data Structures and Algorithms',
    teacherKey: 'teacher_bob',
  },
];

export const SEED_ENROLLMENTS: SeedEnrollment[] = [
  { studentKey: 'student_john', courseKey: 'course_cs' },
  { studentKey: 'student_john', courseKey: 'course_web' },
  { studentKey: 'student_jane', courseKey: 'course_cs' },
  { studentKey: 'student_jane', courseKey: 'course_db' },
  { studentKey: 'student_michael', courseKey: 'course_web' },
  { studentKey: 'student_michael', courseKey: 'course_algo' },
];

export const SEED_QUESTIONS: SeedQuestion[] = [
  {
    key: 'q_binary_search',
    content: 'What is the time complexity of binary search?',
    teacherKey: 'teacher_alice',
    courseKey: 'course_cs',
    answerQuestion: 2,
    answer: [
      { content: 'O(n)', isCorrect: false },
      { content: 'O(log n)', isCorrect: true },
      { content: 'O(n^2)', isCorrect: false },
      { content: 'O(1)', isCorrect: false },
    ],
  },
  {
    key: 'q_programming_paradigm',
    content: 'Which of the following is NOT a programming paradigm?',
    teacherKey: 'teacher_alice',
    courseKey: 'course_cs',
    answerQuestion: 3,
    answer: [
      { content: 'Object-oriented', isCorrect: false },
      { content: 'Functional', isCorrect: false },
      { content: 'Relational', isCorrect: true },
      { content: 'Procedural', isCorrect: false },
    ],
  },
  {
    key: 'q_html',
    content: 'What does HTML stand for?',
    teacherKey: 'teacher_alice',
    courseKey: 'course_web',
    answerQuestion: 1,
    answer: [
      { content: 'HyperText Markup Language', isCorrect: true },
      { content: 'Home Tool Markup Language', isCorrect: false },
      { content: 'Hyperlinks and Text Markup Language', isCorrect: false },
      { content: 'Hyper Tool Markup Language', isCorrect: false },
    ],
  },
  {
    key: 'q_sql_select',
    content: 'Which SQL command is used to retrieve data?',
    teacherKey: 'teacher_bob',
    courseKey: 'course_db',
    answerQuestion: 2,
    answer: [
      { content: 'INSERT', isCorrect: false },
      { content: 'SELECT', isCorrect: true },
      { content: 'UPDATE', isCorrect: false },
      { content: 'DELETE', isCorrect: false },
    ],
  },
  {
    key: 'q_primary_key',
    content: 'What is a primary key in a database?',
    teacherKey: 'teacher_bob',
    courseKey: 'course_db',
    answerQuestion: 1,
    answer: [
      { content: 'A unique identifier for each record', isCorrect: true },
      { content: 'A foreign key reference', isCorrect: false },
      { content: 'An index for faster queries', isCorrect: false },
      { content: 'A backup key', isCorrect: false },
    ],
  },
  {
    key: 'q_binary_tree',
    content: 'Which traversal visits nodes in Left-Root-Right order?',
    teacherKey: 'teacher_bob',
    courseKey: 'course_algo',
    answerQuestion: 1,
    answer: [
      { content: 'Inorder', isCorrect: true },
      { content: 'Preorder', isCorrect: false },
      { content: 'Postorder', isCorrect: false },
      { content: 'Level-order', isCorrect: false },
    ],
  },
];

const now = new Date();
const oneHour = 60 * 60 * 1000;
const oneDay = 24 * oneHour;

const completedStart = new Date(now.getTime() - 3 * oneDay);
const completedEnd = new Date(now.getTime() - 3 * oneDay + 90 * 60 * 1000);
const activeStart = new Date(now.getTime() - oneHour);
const activeEnd = new Date(now.getTime() + 2 * oneHour);
const scheduledStart = new Date(now.getTime() + oneDay);
const scheduledEnd = new Date(now.getTime() + oneDay + 120 * 60 * 1000);

export const SEED_EXAMS: SeedExam[] = [
  {
    key: 'exam_cs_completed',
    title: 'Computer Science Midterm Exam',
    durationMinutes: 90,
    rateScore: 70,
    courseKey: 'course_cs',
    questionKeys: ['q_binary_search', 'q_programming_paradigm'],
    window: {
      startTime: completedStart,
      endTime: completedEnd,
      status: 'completed',
    },
  },
  {
    key: 'exam_web_active',
    title: 'Web Development Practical Test',
    durationMinutes: 120,
    rateScore: 75,
    courseKey: 'course_web',
    questionKeys: ['q_html'],
    window: {
      startTime: activeStart,
      endTime: activeEnd,
      status: 'active',
    },
  },
  {
    key: 'exam_db_scheduled',
    title: 'Database Quiz 1',
    durationMinutes: 45,
    rateScore: 80,
    courseKey: 'course_db',
    questionKeys: ['q_sql_select', 'q_primary_key'],
    window: {
      startTime: scheduledStart,
      endTime: scheduledEnd,
      status: 'scheduled',
    },
  },
  {
    key: 'exam_algo_cancelled',
    title: 'Algorithms Mock Test',
    durationMinutes: 60,
    rateScore: 70,
    courseKey: 'course_algo',
    questionKeys: ['q_binary_tree'],
    window: {
      startTime: new Date(now.getTime() + 2 * oneDay),
      endTime: new Date(now.getTime() + 2 * oneDay + oneHour),
      status: 'cancelled',
    },
  },
];

export const SEED_SUBMISSIONS: SeedSubmission[] = [
  {
    studentKey: 'student_john',
    examKey: 'exam_cs_completed',
    score: 85,
    status: 'graded',
    submittedAt: new Date(now.getTime() - 3 * oneDay + 45 * 60 * 1000),
    answers: [
      { questionKey: 'q_binary_search', answerNumber: 2 },
      { questionKey: 'q_programming_paradigm', answerNumber: 3 },
    ],
  },
  {
    studentKey: 'student_jane',
    examKey: 'exam_cs_completed',
    score: 92,
    status: 'graded',
    submittedAt: new Date(now.getTime() - 3 * oneDay + 50 * 60 * 1000),
    answers: [
      { questionKey: 'q_binary_search', answerNumber: 2 },
      { questionKey: 'q_programming_paradigm', answerNumber: 3 },
    ],
  },
  {
    studentKey: 'student_michael',
    examKey: 'exam_web_active',
    score: 0,
    status: 'in_progress',
    answers: [{ questionKey: 'q_html', answerNumber: 1 }],
  },
];

export const SEED_CERTIFICATES: SeedCertificate[] = [
  {
    studentKey: 'student_john',
    courseKey: 'course_cs',
    submissionRef: 0,
    status: 'issued',
    tokenId: 'EDU-CERT-001',
    ipfsHash: 'QmXyZ123abc456def789ghi012jkl345mno678pqr901stu234',
    ipfsImage: 'QmImg123abc456def789ghi012jkl345mno678pqr901stu2',
    transactionHash:
      '0xabcdef123456789abcdef123456789abcdef123456789abcdef123456789abcdef',
    issuedAt: new Date(now.getTime() - 2 * oneDay),
    outdateTime: new Date(now.getTime() + 2 * 365 * oneDay),
  },
  {
    studentKey: 'student_jane',
    courseKey: 'course_cs',
    submissionRef: 1,
    status: 'pending',
  },
];

export const SEED_NOTIFICATIONS: SeedNotification[] = [
  {
    recipientKey: 'student_john',
    audience: 'student',
    category: 'certificate',
    type: 'certificate_issued',
    title: 'Certificate Issued',
    message:
      'Your certificate for Introduction to Computer Science has been issued.',
    actionUrl: '/certificate',
    isRead: false,
  },
  {
    recipientKey: 'student_michael',
    audience: 'student',
    category: 'exam',
    type: 'exam_scheduled_to_active',
    title: 'Exam Is Active',
    message: 'Web Development Practical Test is now active.',
    actionUrl: '/exams',
    isRead: false,
  },
  {
    recipientKey: 'teacher_alice',
    audience: 'teacher',
    category: 'system',
    type: 'generic',
    title: 'Welcome Back',
    message: 'Seed data created successfully for test environment.',
    actionUrl: '/dashboard',
    isRead: true,
  },
];
