# Exam Session Contracts

**Module**: exam-sessions
**Base Path**: `/api/v1/exam-sessions`

## Endpoints

### POST /exam-sessions/register

Register for an exam using exam code.

**Access**: Protected (Student role)
**Rate Limit**: 10 requests/minute per user

**Request Body**:

```json
{
  "examCode": "MATH101A"
}
```

**Response 201**:

```json
{
  "success": true,
  "data": {
    "session": {
      "id": "507f1f77bcf86cd799439011",
      "examId": "507f1f77bcf86cd799439012",
      "sessionToken": "sess_abc123def456",
      "exam": {
        "title": "Calculus I Midterm",
        "duration": 120,
        "totalQuestions": 25,
        "passingScore": 70
      },
      "status": "registered",
      "attemptNumber": 1,
      "registeredAt": "2025-09-20T10:30:00.000Z"
    }
  }
}
```

### POST /exam-sessions/{sessionId}/verify-face

Complete facial verification before starting exam.

**Access**: Protected (Student, own session)
**Rate Limit**: 5 requests/minute per session

**Request Body**:

```json
{
  "faceImage": "data:image/jpeg;base64,/9j/4AAQSkZJRgABA...",
  "idDocument": "data:image/jpeg;base64,/9j/4AAQSkZJRgABA..." // optional
}
```

**Response 200**:

```json
{
  "success": true,
  "data": {
    "verification": {
      "success": true,
      "confidence": 0.92,
      "message": "Face verification completed successfully"
    },
    "session": {
      "status": "verified",
      "canStart": true
    }
  }
}
```

### POST /exam-sessions/{sessionId}/start

Start the exam session.

**Access**: Protected (Student, own session)
**Rate Limit**: 3 requests/minute per session

**Request**: No body required

**Response 200**:

```json
{
  "success": true,
  "data": {
    "session": {
      "id": "507f1f77bcf86cd799439011",
      "status": "in_progress",
      "startedAt": "2025-09-20T10:30:00.000Z",
      "expiresAt": "2025-09-20T12:30:00.000Z",
      "timeRemaining": 7200,
      "currentQuestionIndex": 0
    },
    "firstQuestion": {
      "id": "507f1f77bcf86cd799439013",
      "content": "What is the derivative of x²?",
      "choices": [
        { "id": "choice_1", "content": "2x" },
        { "id": "choice_2", "content": "x" },
        { "id": "choice_3", "content": "x²" },
        { "id": "choice_4", "content": "2" }
      ],
      "points": 2,
      "timeEstimate": 60
    }
  }
}
```

### GET /exam-sessions/{sessionId}/questions/{questionIndex}

Get specific question by index.

**Access**: Protected (Student, own session)
**Rate Limit**: Standard

**Response 200**:

```json
{
  "success": true,
  "data": {
    "question": {
      "id": "507f1f77bcf86cd799439013",
      "index": 0,
      "content": "What is the derivative of x²?",
      "choices": [
        { "id": "choice_1", "content": "2x" },
        { "id": "choice_2", "content": "x" },
        { "id": "choice_3", "content": "x²" },
        { "id": "choice_4", "content": "2" }
      ],
      "points": 2,
      "previousAnswer": null,
      "flaggedForReview": false
    },
    "session": {
      "timeRemaining": 7140,
      "currentQuestionIndex": 0,
      "totalQuestions": 25,
      "answeredCount": 0
    }
  }
}
```

### POST /exam-sessions/{sessionId}/answers

Submit answer for current question.

**Access**: Protected (Student, own session)
**Rate Limit**: 100 requests/minute per session

**Request Body**:

```json
{
  "questionId": "507f1f77bcf86cd799439013",
  "choiceId": "choice_1",
  "flagForReview": false,
  "timeSpent": 45
}
```

**Response 200**:

```json
{
  "success": true,
  "data": {
    "answer": {
      "questionId": "507f1f77bcf86cd799439013",
      "choiceId": "choice_1",
      "answeredAt": "2025-09-20T10:31:00.000Z",
      "flaggedForReview": false
    },
    "session": {
      "currentQuestionIndex": 1,
      "answeredCount": 1,
      "timeRemaining": 7095
    }
  }
}
```

### GET /exam-sessions/{sessionId}/progress

Get current exam progress.

**Access**: Protected (Student, own session)
**Rate Limit**: Standard

**Response 200**:

```json
{
  "success": true,
  "data": {
    "session": {
      "id": "507f1f77bcf86cd799439011",
      "status": "in_progress",
      "timeRemaining": 6540,
      "currentQuestionIndex": 5,
      "totalQuestions": 25,
      "answeredCount": 4,
      "flaggedCount": 1
    },
    "navigation": {
      "canGoBack": true,
      "canGoForward": true,
      "canSubmit": false
    },
    "warnings": {
      "timeWarnings": 0,
      "proctoringAlerts": 2,
      "suspiciousActivity": false
    }
  }
}
```

### POST /exam-sessions/{sessionId}/navigate

Navigate to specific question.

**Access**: Protected (Student, own session)
**Rate Limit**: 60 requests/minute per session

**Request Body**:

```json
{
  "questionIndex": 3
}
```

**Response 200**:

```json
{
  "success": true,
  "data": {
    "question": {
      "id": "507f1f77bcf86cd799439016",
      "index": 3,
      "content": "Calculate the integral of 2x dx",
      "choices": [
        { "id": "choice_1", "content": "x² + C" },
        { "id": "choice_2", "content": "2x² + C" },
        { "id": "choice_3", "content": "x + C" },
        { "id": "choice_4", "content": "2 + C" }
      ],
      "points": 3,
      "previousAnswer": "choice_1",
      "flaggedForReview": true
    },
    "session": {
      "currentQuestionIndex": 3,
      "timeRemaining": 6480
    }
  }
}
```

### POST /exam-sessions/{sessionId}/submit

Submit the completed exam.

**Access**: Protected (Student, own session)
**Rate Limit**: 3 requests/minute per session

**Request Body**:

```json
{
  "finalSubmission": true,
  "confirmSubmit": true
}
```

**Response 200**:

```json
{
  "success": true,
  "data": {
    "session": {
      "id": "507f1f77bcf86cd799439011",
      "status": "submitted",
      "submittedAt": "2025-09-20T11:45:00.000Z",
      "timeUsed": 4500,
      "totalQuestions": 25,
      "answeredCount": 24
    },
    "grading": {
      "autoGraded": true,
      "score": {
        "earnedPoints": 42,
        "totalPoints": 50,
        "percentage": 84,
        "passed": true
      },
      "gradedAt": "2025-09-20T11:45:01.000Z"
    },
    "certificate": {
      "eligible": true,
      "status": "pending",
      "estimatedIssuance": "2025-09-20T12:00:00.000Z"
    }
  }
}
```

### GET /exam-sessions/{sessionId}/results

Get exam results (after submission).

**Access**: Protected (Student, own session)
**Rate Limit**: Standard

**Response 200**:

```json
{
  "success": true,
  "data": {
    "session": {
      "id": "507f1f77bcf86cd799439011",
      "status": "graded",
      "submittedAt": "2025-09-20T11:45:00.000Z"
    },
    "exam": {
      "title": "Calculus I Midterm",
      "course": "Mathematics 101",
      "passingScore": 70
    },
    "score": {
      "earnedPoints": 42,
      "totalPoints": 50,
      "percentage": 84,
      "passed": true,
      "grade": "B+",
      "gradedAt": "2025-09-20T11:45:01.000Z"
    },
    "proctoring": {
      "alertCount": 2,
      "riskScore": 15,
      "status": "approved",
      "reviewNotes": "Minor alerts, no evidence of cheating"
    },
    "certificate": {
      "issued": true,
      "tokenId": 12345,
      "txHash": "0x1234567890abcdef...",
      "downloadUrl": "https://api.example.com/certificates/download/...",
      "verificationUrl": "https://verify.example.com/cert/abc123"
    }
  }
}
```

### POST /exam-sessions/{sessionId}/pause

Pause the exam session (if allowed).

**Access**: Protected (Student, own session)
**Rate Limit**: 5 requests/hour per session

**Request Body**:

```json
{
  "reason": "technical_issue"
}
```

**Response 200**:

```json
{
  "success": true,
  "data": {
    "session": {
      "status": "paused",
      "pausedAt": "2025-09-20T11:15:00.000Z",
      "timeRemaining": 3600,
      "maxPauseDuration": 600,
      "resumeBy": "2025-09-20T11:25:00.000Z"
    }
  }
}
```

### POST /exam-sessions/{sessionId}/resume

Resume a paused exam session.

**Access**: Protected (Student, own session)
**Rate Limit**: 5 requests/hour per session

**Request**: No body required

**Response 200**:

```json
{
  "success": true,
  "data": {
    "session": {
      "status": "in_progress",
      "resumedAt": "2025-09-20T11:20:00.000Z",
      "timeRemaining": 3300,
      "pausedDuration": 300
    }
  }
}
```

## WebSocket Events

### Connection: `/ws/exam-session/{sessionToken}`

**Authentication**: JWT token in query parameter or header

**Events Received**:

- `time_warning`: Time remaining warnings (15min, 5min, 1min)
- `proctoring_alert`: Real-time proctoring notifications
- `session_update`: Status changes or administrative updates
- `force_submit`: Teacher-initiated forced submission

**Events Sent**:

- `heartbeat`: Keep session alive (every 30 seconds)
- `question_view`: Track question viewing time
- `tab_focus`: Browser tab focus/blur events

## Error Responses

### 404 Not Found - Session Not Found

```json
{
  "success": false,
  "error": {
    "code": "SESSION_NOT_FOUND",
    "message": "Exam session not found"
  }
}
```

### 409 Conflict - Session Already Started

```json
{
  "success": false,
  "error": {
    "code": "SESSION_ALREADY_STARTED",
    "message": "This exam session has already been started"
  }
}
```

### 422 Unprocessable Entity - Face Verification Failed

```json
{
  "success": false,
  "error": {
    "code": "FACE_VERIFICATION_FAILED",
    "message": "Face verification failed, confidence too low",
    "details": {
      "confidence": 0.45,
      "required": 0.8
    }
  }
}
```
