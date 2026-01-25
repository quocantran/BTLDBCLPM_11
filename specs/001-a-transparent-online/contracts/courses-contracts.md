# Course Management Contracts

**Module**: courses, exams
**Base Path**: `/api/v1/courses`, `/api/v1/exams`

## Course Management Endpoints

### POST /courses

Create a new course.

**Access**: Protected (Teacher role)
**Rate Limit**: Standard
**Data Model Reference**: [Courses Collection](../data-model.md#courses-collection)

**Request Body**:

```json
{
  "name": "Calculus I",
  "description": "Introduction to differential and integral calculus",
  "subject": "Mathematics",
  "level": "intermediate",
  "metadata": {
    "duration": "16 weeks",
    "credits": 4,
    "prerequisites": ["Pre-Calculus", "Trigonometry"]
  },
  "settings": {
    "allowAIQuestionGeneration": true,
    "defaultExamDuration": 120,
    "defaultPassingScore": 70
  }
}
```

**Response 201**:

```json
{
  "success": true,
  "data": {
    "course": {
      "id": "507f1f77bcf86cd799439011",
      "name": "Calculus I",
      "description": "Introduction to differential and integral calculus",
      "teacherId": "507f1f77bcf86cd799439010",
      "subject": "Mathematics",
      "level": "intermediate",
      "isActive": true,
      "enrollmentCount": 0,
      "createdAt": "2025-09-20T10:30:00.000Z"
    }
  }
}
```

### GET /courses

List courses for current user.

**Access**: Protected (All roles)
**Rate Limit**: Standard

**Query Parameters**:

- `subject`: Filter by subject
- `level`: Filter by difficulty level
- `teacherId`: Filter by teacher (admin only)
- `limit`: Max results (default: 20)
- `offset`: Pagination offset

**Response 200**:

```json
{
  "success": true,
  "data": {
    "courses": [
      {
        "id": "507f1f77bcf86cd799439011",
        "name": "Calculus I",
        "subject": "Mathematics",
        "level": "intermediate",
        "teacher": {
          "id": "507f1f77bcf86cd799439010",
          "firstName": "John",
          "lastName": "Professor"
        },
        "enrollmentCount": 25,
        "examCount": 3
      }
    ],
    "pagination": {
      "total": 1,
      "limit": 20,
      "offset": 0,
      "hasMore": false
    }
  }
}
```

## Exam Management Endpoints

### POST /exams

Create a new exam.

**Access**: Protected (Teacher role)
**Rate Limit**: Standard
**Data Model Reference**: [Exams Collection](../data-model.md#exams-collection)

**Request Body**:

```json
{
  "title": "Calculus I Midterm",
  "description": "Covers derivatives and basic integration",
  "courseId": "507f1f77bcf86cd799439011",
  "settings": {
    "duration": 120,
    "startTime": "2025-09-25T10:00:00.000Z",
    "endTime": "2025-09-25T18:00:00.000Z",
    "passingScore": 70,
    "maxAttempts": 1,
    "shuffleQuestions": true,
    "allowReview": false
  },
  "proctoring": {
    "enabled": true,
    "strictMode": true,
    "requireFaceVerification": true,
    "blockCopyPaste": true
  }
}
```

**Response 201**:

```json
{
  "success": true,
  "data": {
    "exam": {
      "id": "507f1f77bcf86cd799439012",
      "title": "Calculus I Midterm",
      "courseId": "507f1f77bcf86cd799439011",
      "code": "CALC101M",
      "status": "draft",
      "questionCount": 0,
      "createdAt": "2025-09-20T10:30:00.000Z"
    }
  }
}
```

### POST /exams/{examId}/questions

Add questions to exam.

**Access**: Protected (Teacher, own exam)
**Rate Limit**: Standard
**Data Model Reference**: [Questions Collection](../data-model.md#questions-collection)

**Request Body**:

```json
{
  "questions": [
    {
      "type": "multiple_choice",
      "content": {
        "question": "What is the derivative of x²?",
        "explanation": "Using the power rule: d/dx(x^n) = nx^(n-1)",
        "points": 2,
        "difficulty": "easy"
      },
      "choices": [
        { "content": "2x", "isCorrect": true },
        { "content": "x", "isCorrect": false },
        { "content": "x²", "isCorrect": false },
        { "content": "2", "isCorrect": false }
      ],
      "metadata": {
        "tags": ["derivatives", "power-rule"],
        "estimatedTime": 60
      }
    }
  ]
}
```

### POST /exams/{examId}/publish

Publish exam and generate access code.

**Access**: Protected (Teacher, own exam)
**Rate Limit**: 5 requests/minute

**Response 200**:

```json
{
  "success": true,
  "data": {
    "exam": {
      "id": "507f1f77bcf86cd799439012",
      "status": "published",
      "code": "CALC101M",
      "publishedAt": "2025-09-20T11:00:00.000Z",
      "accessUrl": "https://platform.example.com/exam/CALC101M"
    }
  }
}
```

### GET /exams/{examId}/analytics

Get exam performance analytics.

**Access**: Protected (Teacher, own exam)
**Rate Limit**: Standard

**Response 200**:

```json
{
  "success": true,
  "data": {
    "analytics": {
      "attempts": 25,
      "completed": 23,
      "averageScore": 78.5,
      "passingRate": 87.0,
      "averageTime": 95,
      "questionAnalysis": [
        {
          "questionId": "507f1f77bcf86cd799439013",
          "correctRate": 92.0,
          "averageTime": 45,
          "difficulty": "easy"
        }
      ],
      "proctoringStats": {
        "alertCount": 12,
        "flaggedSessions": 3,
        "averageRiskScore": 15.2
      }
    }
  }
}
```

## AI-Assisted Question Generation

### POST /exams/{examId}/generate-questions

Generate questions using AI from course materials.

**Access**: Protected (Teacher, own exam)
**Rate Limit**: 10 requests/hour
**Implementation Reference**: [AI Integration](../research.md#ai-proctoring-integration)

**Request Body**:

```json
{
  "sourceContent": "Course material text or file upload",
  "questionCount": 10,
  "difficulty": "mixed",
  "questionTypes": ["multiple_choice"],
  "topics": ["derivatives", "integration"]
}
```

**Response 200**:

```json
{
  "success": true,
  "data": {
    "generatedQuestions": [
      {
        "content": {
          "question": "Calculate the derivative of 3x² + 2x - 1",
          "explanation": "Apply the power rule to each term",
          "points": 3,
          "difficulty": "medium"
        },
        "choices": [
          { "content": "6x + 2", "isCorrect": true },
          { "content": "6x² + 2x", "isCorrect": false },
          { "content": "3x + 2", "isCorrect": false },
          { "content": "6x + 1", "isCorrect": false }
        ],
        "confidence": 0.89,
        "needsReview": false
      }
    ],
    "summary": {
      "requested": 10,
      "generated": 8,
      "needsReview": 2,
      "averageConfidence": 0.85
    }
  }
}
```

## Error Responses

### 403 Forbidden - Not Course Teacher

```json
{
  "success": false,
  "error": {
    "code": "NOT_COURSE_TEACHER",
    "message": "Only the course teacher can perform this action"
  }
}
```

### 409 Conflict - Exam Has Active Sessions

```json
{
  "success": false,
  "error": {
    "code": "EXAM_HAS_ACTIVE_SESSIONS",
    "message": "Cannot modify exam while students are taking it",
    "details": {
      "activeSessions": 3
    }
  }
}
```
