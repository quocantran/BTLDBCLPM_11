# Data Model: Online Examination Platform

**Feature**: 001-a-transparent-online
**Date**: 2025-09-20
**Database**: MongoDB with Mongoose ODM

## Entity Relationship Overview

```
User (1) ──── manages ────→ (M) Course
Course (1) ──── contains ──→ (M) Exam
Exam (1) ────── has ──────→ (M) Question
User (1) ────── takes ────→ (M) ExamSession
ExamSession (1) ── generates → (1) Certificate
ExamSession (1) ── produces → (M) ProctoringAlert
Certificate (1) ── enables ──→ (M) VerificationRequest
```

## Core Collections

### Users Collection

```typescript
{
  _id: ObjectId,
  email: string, // unique, indexed
  passwordHash: string, // argon2 hashed
  role: enum['student', 'teacher', 'admin'],
  profile: {
    firstName: string,
    lastName: string,
    walletAddress?: string, // optional, for certificate delivery
    avatar?: string, // profile image URL
    bio?: string
  },
  settings: {
    timezone: string,
    notifications: {
      email: boolean,
      examReminders: boolean,
      certificateIssued: boolean
    }
  },
  status: enum['active', 'suspended', 'pending_verification'],
  emailVerified: boolean,
  emailVerificationToken?: string,
  passwordResetToken?: string,
  passwordResetExpires?: Date,
  lastLogin?: Date,
  createdAt: Date,
  updatedAt: Date
}

// Indexes
// { email: 1 } unique
// { role: 1 }
// { status: 1 }
```

### Courses Collection

```typescript
{
  _id: ObjectId,
  name: string,
  description: string,
  teacherId: ObjectId, // ref: Users
  subject: string, // e.g., "Mathematics", "Computer Science"
  level: enum['beginner', 'intermediate', 'advanced'],
  metadata: {
    duration?: string, // e.g., "3 months"
    credits?: number,
    prerequisites?: string[]
  },
  settings: {
    allowAIQuestionGeneration: boolean,
    defaultExamDuration: number, // minutes
    defaultPassingScore: number, // percentage
    certificateTemplate?: string // template ID
  },
  isActive: boolean,
  enrollmentCount: number, // denormalized for performance
  createdAt: Date,
  updatedAt: Date
}

// Indexes
// { teacherId: 1 }
// { isActive: 1 }
// { subject: 1 }
```

### Exams Collection

```typescript
{
  _id: ObjectId,
  title: string,
  description?: string,
  courseId: ObjectId, // ref: Courses
  code: string, // unique, indexed - for student access
  instructions: string, // exam guidelines and rules
  settings: {
    duration: number, // minutes
    startTime?: Date, // scheduled start (optional)
    endTime?: Date, // scheduled end (optional)
    passingScore: number, // percentage (0-100)
    maxAttempts: number, // default: 1
    shuffleQuestions: boolean,
    shuffleAnswers: boolean,
    allowReview: boolean, // can student review answers
    showResultsImmediately: boolean
  },
  proctoring: {
    enabled: boolean,
    strictMode: boolean, // stricter AI monitoring
    requireFaceVerification: boolean,
    allowedBrowsers?: string[], // 'chrome', 'firefox'
    blockCopyPaste: boolean
  },
  status: enum['draft', 'published', 'archived'],
  questionCount: number, // denormalized
  totalPoints: number, // denormalized
  createdBy: ObjectId, // ref: Users
  createdAt: Date,
  updatedAt: Date,
  publishedAt?: Date
}

// Indexes
// { code: 1 } unique, sparse
// { courseId: 1 }
// { status: 1 }
// { createdBy: 1 }
// { startTime: 1, endTime: 1 }
```

### Questions Collection

```typescript
{
  _id: ObjectId,
  examId: ObjectId, // ref: Exams
  type: enum['multiple_choice', 'true_false'], // v1 scope
  content: {
    question: string, // HTML allowed for formatting
    explanation?: string, // shown after submission
    points: number, // default: 1
    difficulty: enum['easy', 'medium', 'hard']
  },
  choices: [
    {
      _id: ObjectId, // for answer tracking
      content: string,
      isCorrect: boolean
    }
  ],
  metadata: {
    tags?: string[], // for categorization
    source?: string, // if AI-generated or from material
    estimatedTime?: number, // seconds to answer
    bloomsTaxonomy?: enum['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create']
  },
  order: number, // position in exam
  isActive: boolean,
  createdBy: ObjectId, // ref: Users
  createdAt: Date,
  updatedAt: Date
}

// Indexes
// { examId: 1, order: 1 }
// { examId: 1, isActive: 1 }
// { type: 1 }
```

### ExamSessions Collection

```typescript
{
  _id: ObjectId,
  userId: ObjectId, // ref: Users
  examId: ObjectId, // ref: Exams
  sessionToken: string, // unique session identifier

  timing: {
    startedAt: Date,
    submittedAt?: Date,
    timeRemaining?: number, // seconds, updated periodically
    pausedDuration?: number, // total paused time in seconds
    warningsSent: number // count of time warnings
  },

  progress: {
    currentQuestionIndex: number,
    questionsAnswered: number,
    totalQuestions: number,
    answers: [
      {
        questionId: ObjectId,
        choiceId?: ObjectId, // selected answer
        timeSpent: number, // seconds on this question
        flaggedForReview: boolean,
        answeredAt: Date
      }
    ]
  },

  scoring: {
    totalPoints?: number,
    earnedPoints?: number,
    percentage?: number,
    passed?: boolean,
    gradedAt?: Date,
    gradedBy?: ObjectId // ref: Users (for manual grading)
  },

  proctoring: {
    faceVerificationCompleted: boolean,
    faceVerificationScore?: number, // confidence 0-1
    alertCount: number, // denormalized count
    riskScore: number, // calculated risk 0-100
    manualReviewRequired: boolean,
    reviewedBy?: ObjectId, // ref: Users
    reviewNotes?: string,
    reviewStatus?: enum['pending', 'approved', 'flagged', 'rejected']
  },

  browser: {
    userAgent?: string,
    screenResolution?: string,
    fullscreenTime?: number, // seconds in fullscreen
    tabSwitches?: number, // count of tab switches
    copyAttempts?: number,
    pasteAttempts?: number
  },

  status: enum['started', 'in_progress', 'paused', 'submitted', 'graded', 'invalidated'],
  attemptNumber: number, // which attempt this is for the user
  ipAddress: string,

  createdAt: Date,
  updatedAt: Date
}

// Indexes
// { userId: 1, examId: 1 }
// { sessionToken: 1 } unique
// { status: 1 }
// { userId: 1, status: 1 }
// { examId: 1, status: 1 }
// { createdAt: 1 } // for cleanup
```

### Certificates Collection

```typescript
{
  _id: ObjectId,
  userId: ObjectId, // ref: Users
  examId: ObjectId, // ref: Exams
  sessionId: ObjectId, // ref: ExamSessions

  blockchain: {
    tokenId?: number, // ERC-721 token ID
    txHash?: string, // transaction hash
    contractAddress: string,
    network: string, // 'sepolia', 'mainnet', etc.
    blockNumber?: number,
    gasUsed?: number
  },

  ipfs: {
    cid?: string, // content identifier
    gateway: string, // IPFS gateway used
    metadataHash: string, // sha256 of metadata
    pinned: boolean
  },

  metadata: {
    studentName: string, // encrypted in IPFS
    courseName: string,
    examTitle: string,
    score: number,
    maxScore: number,
    percentage: number,
    issueDate: Date,
    expiryDate?: Date,
    institutionName: string,
    certificateTemplate: string
  },

  verification: {
    publicId: string, // public lookup ID (non-guessable)
    qrCode: string, // base64 QR code image
    verificationUrl: string,
    downloadUrl?: string, // signed URL for PDF
    sharedCount: number // how many times shared/verified
  },

  status: enum['pending', 'minting', 'issued', 'failed', 'revoked'],
  issuedAt?: Date,
  revokedAt?: Date,
  revokedReason?: string,

  retryCount: number, // for failed blockchain transactions
  lastError?: string,

  createdAt: Date,
  updatedAt: Date
}

// Indexes
// { userId: 1, examId: 1 }
// { tokenId: 1, contractAddress: 1 } unique, sparse
// { publicId: 1 } unique
// { txHash: 1 } sparse
// { status: 1 }
// { createdAt: 1 }
```

### ProctoringAlerts Collection

```typescript
{
  _id: ObjectId,
  sessionId: ObjectId, // ref: ExamSessions
  userId: ObjectId, // ref: Users (denormalized)
  examId: ObjectId, // ref: Exams (denormalized)

  alert: {
    type: enum['face_mismatch', 'multi_person', 'gaze_offscreen', 'device_detected', 'tab_switch', 'copy_attempt', 'paste_attempt'],
    severity: enum['low', 'medium', 'high', 'critical'],
    confidence: number, // 0-1 for AI alerts
    description: string,
    evidence?: {
      imageData?: string, // base64 screenshot (temporary)
      coordinates?: { x: number, y: number, width: number, height: number },
      duration?: number // how long the behavior lasted
    }
  },

  response: {
    acknowledged: boolean,
    reviewedBy?: ObjectId, // ref: Users
    reviewedAt?: Date,
    action?: enum['ignored', 'warning_sent', 'session_flagged', 'session_terminated'],
    notes?: string
  },

  timestamp: Date,
  questionIndex?: number, // which question was active

  createdAt: Date
}

// Indexes
// { sessionId: 1, timestamp: 1 }
// { userId: 1, timestamp: 1 }
// { alert.type: 1, alert.severity: 1 }
// { response.acknowledged: 1 }
// { createdAt: 1 } // for cleanup
```

### VerificationRequests Collection

```typescript
{
  _id: ObjectId,
  certificateId?: ObjectId, // ref: Certificates (if lookup successful)

  lookup: {
    method: enum['publicId', 'qrCode', 'txHash', 'tokenId'],
    value: string, // the looked-up value
    ip: string,
    userAgent?: string,
    referer?: string
  },

  result: {
    found: boolean,
    verified: boolean, // blockchain verification passed
    certificateData?: {
      studentName: string, // anonymized if public request
      courseName: string,
      examTitle: string,
      issueDate: Date,
      percentage: number,
      institutionName: string
    },
    error?: string
  },

  timing: {
    responseTime: number, // milliseconds
    blockchainQueryTime?: number,
    ipfsQueryTime?: number
  },

  requestedAt: Date
}

// Indexes
// { lookup.value: 1, lookup.method: 1 }
// { lookup.ip: 1, requestedAt: 1 } // rate limiting
// { requestedAt: 1 } // cleanup
// { certificateId: 1 } sparse
```

## Data Relationships & Constraints

### Referential Integrity

- All ObjectId references include validation middleware
- Cascade deletion policies defined for related documents
- Orphan cleanup jobs for exam sessions and alerts

### Data Validation Rules

- Email addresses validated with comprehensive regex
- Password strength enforced (min 8 chars, complexity)
- Exam codes must be 6-8 alphanumeric characters
- Score percentages constrained to 0-100 range
- Timestamps always in UTC

### Performance Optimizations

- Denormalized counts updated via MongoDB transactions
- Compound indexes for common query patterns
- TTL indexes for temporary data (verification tokens, session cache)
- Aggregation pipelines for complex reporting queries

### Security Considerations

- Sensitive fields (passwords, tokens) excluded from default projections
- GDPR compliance with user data deletion procedures
- Audit trail maintained for all certificate operations
- Rate limiting data stored with automatic expiration

This data model supports the constitutional requirements for domain modularity, security, and performance while enabling all functional requirements from the specification.
