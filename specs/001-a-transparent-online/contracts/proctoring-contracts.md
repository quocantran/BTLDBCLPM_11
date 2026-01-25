# AI Proctoring Contracts

**Module**: proctoring
**Base Path**: `/api/v1/proctoring`

## Overview

The proctoring module acts as a gateway between the NestJS backend and the separate Python AI service. It manages real-time monitoring, alert processing, and session oversight.

**External Service**: Python AI Proctoring Service (Flask/FastAPI)
**Implementation Reference**: [AI Proctoring Integration](../research.md#ai-proctoring-integration)
**Data Model Reference**: [ProctoringAlerts Collection](../data-model.md#proctoringalerts-collection)

## Session Monitoring Endpoints

### POST /proctoring/sessions/{sessionId}/start

Initialize proctoring for an exam session.

**Access**: Protected (Student, own session)
**Rate Limit**: 5 requests/minute per session

**Request Body**:

```json
{
  "browserInfo": {
    "userAgent": "Mozilla/5.0...",
    "screenResolution": "1920x1080",
    "availableResolution": "1920x1040"
  },
  "cameraPermissions": true,
  "microphonePermissions": false
}
```

**Response 200**:

```json
{
  "success": true,
  "data": {
    "proctoring": {
      "sessionId": "507f1f77bcf86cd799439011",
      "enabled": true,
      "aiServiceEndpoint": "wss://ai-proctoring.example.com/monitor",
      "uploadInterval": 10000,
      "alertThresholds": {
        "faceConfidence": 0.8,
        "gazeOffscreen": 5000,
        "multiPerson": 0.3
      },
      "requirements": {
        "fullscreen": true,
        "cameraActive": true,
        "blockedActions": ["copy", "paste", "screenshot"]
      }
    }
  }
}
```

### POST /proctoring/sessions/{sessionId}/frame

Submit webcam frame for AI analysis.

**Access**: Protected (Student, own session)
**Rate Limit**: 1 request/second per session

**Request Body**:

```json
{
  "frameData": "data:image/jpeg;base64,/9j/4AAQSkZJRgABA...",
  "timestamp": "2025-09-20T10:35:00.000Z",
  "questionIndex": 3,
  "metadata": {
    "confidence": 0.95,
    "lighting": "good",
    "resolution": "640x480"
  }
}
```

**Response 200**:

```json
{
  "success": true,
  "data": {
    "analysis": {
      "processedAt": "2025-09-20T10:35:01.000Z",
      "faceDetected": true,
      "faceConfidence": 0.94,
      "alerts": [],
      "riskScore": 5,
      "suggestions": []
    }
  }
}
```

### POST /proctoring/sessions/{sessionId}/alert

Process AI-generated alert.

**Access**: Internal (AI Service API Key)
**Rate Limit**: 100 requests/minute

**Request Body**:

```json
{
  "alertType": "face_mismatch",
  "severity": "high",
  "confidence": 0.87,
  "description": "Face does not match initial verification",
  "evidence": {
    "imageData": "base64_encoded_frame",
    "coordinates": { "x": 100, "y": 150, "width": 200, "height": 250 },
    "previousFaceConfidence": 0.95,
    "currentFaceConfidence": 0.42
  },
  "timestamp": "2025-09-20T10:35:15.000Z",
  "questionIndex": 3
}
```

**Response 200**:

```json
{
  "success": true,
  "data": {
    "alert": {
      "id": "507f1f77bcf86cd799439020",
      "processed": true,
      "action": "warning_sent",
      "notifyTeacher": true,
      "riskScoreUpdate": 25
    }
  }
}
```

## Teacher Oversight Endpoints

### GET /proctoring/sessions/{sessionId}/alerts

Get proctoring alerts for a session.

**Access**: Protected (Teacher, session's exam teacher)
**Rate Limit**: Standard

**Response 200**:

```json
{
  "success": true,
  "data": {
    "alerts": [
      {
        "id": "507f1f77bcf86cd799439020",
        "type": "face_mismatch",
        "severity": "high",
        "confidence": 0.87,
        "description": "Face does not match initial verification",
        "timestamp": "2025-09-20T10:35:15.000Z",
        "questionIndex": 3,
        "acknowledged": false,
        "action": "warning_sent"
      }
    ],
    "summary": {
      "total": 1,
      "unacknowledged": 1,
      "bySeverity": {
        "low": 0,
        "medium": 0,
        "high": 1,
        "critical": 0
      },
      "currentRiskScore": 25
    }
  }
}
```

### POST /proctoring/alerts/{alertId}/review

Review and respond to proctoring alert.

**Access**: Protected (Teacher, alert's exam teacher)
**Rate Limit**: Standard

**Request Body**:

```json
{
  "action": "ignored",
  "notes": "False positive - student adjusting lighting",
  "updateRiskScore": false
}
```

**Response 200**:

```json
{
  "success": true,
  "data": {
    "alert": {
      "id": "507f1f77bcf86cd799439020",
      "acknowledged": true,
      "reviewedBy": "507f1f77bcf86cd799439010",
      "reviewedAt": "2025-09-20T11:00:00.000Z",
      "action": "ignored",
      "notes": "False positive - student adjusting lighting"
    },
    "session": {
      "riskScore": 15,
      "status": "in_progress"
    }
  }
}
```

### GET /proctoring/dashboard

Get real-time proctoring dashboard for teacher.

**Access**: Protected (Teacher role)
**Rate Limit**: Standard

**Response 200**:

```json
{
  "success": true,
  "data": {
    "activeSessions": [
      {
        "sessionId": "507f1f77bcf86cd799439011",
        "student": {
          "id": "507f1f77bcf86cd799439015",
          "firstName": "John",
          "lastName": "Student"
        },
        "exam": {
          "title": "Calculus I Midterm",
          "duration": 120
        },
        "progress": {
          "timeRemaining": 3600,
          "currentQuestionIndex": 5,
          "answeredCount": 4
        },
        "proctoring": {
          "riskScore": 15,
          "alertCount": 2,
          "lastActivity": "2025-09-20T10:55:00.000Z",
          "status": "monitoring"
        }
      }
    ],
    "recentAlerts": [
      {
        "id": "507f1f77bcf86cd799439020",
        "type": "gaze_offscreen",
        "severity": "medium",
        "studentName": "John Student",
        "examTitle": "Calculus I Midterm",
        "timestamp": "2025-09-20T10:50:00.000Z"
      }
    ],
    "statistics": {
      "totalActiveSessions": 1,
      "alertsToday": 8,
      "averageRiskScore": 12.5,
      "flaggedSessions": 0
    }
  }
}
```

## Administrative Actions

### POST /proctoring/sessions/{sessionId}/terminate

Terminate exam session due to proctoring violations.

**Access**: Protected (Teacher, session's exam teacher)
**Rate Limit**: 10 requests/minute

**Request Body**:

```json
{
  "reason": "Multiple severe proctoring violations",
  "allowRetake": false,
  "notifyStudent": true,
  "preserveAnswers": true
}
```

**Response 200**:

```json
{
  "success": true,
  "data": {
    "session": {
      "id": "507f1f77bcf86cd799439011",
      "status": "terminated",
      "terminatedAt": "2025-09-20T11:15:00.000Z",
      "terminatedBy": "507f1f77bcf86cd799439010",
      "reason": "Multiple severe proctoring violations"
    },
    "actions": {
      "studentNotified": true,
      "answersPreserved": true,
      "retakeAllowed": false
    }
  }
}
```

### POST /proctoring/sessions/{sessionId}/flag

Flag session for manual review.

**Access**: Protected (Teacher, session's exam teacher)
**Rate Limit**: Standard

**Request Body**:

```json
{
  "reason": "Suspicious behavior pattern",
  "priority": "high",
  "notes": "Multiple face mismatches followed by perfect score streak"
}
```

## Real-time Monitoring

### WebSocket: `/ws/proctoring/{sessionId}`

**Authentication**: JWT token for teachers monitoring the session

**Events Received**:

- `new_alert`: Real-time proctoring alerts
- `risk_score_update`: Risk score changes
- `session_status_change`: Session status updates
- `behavioral_pattern`: AI-detected behavioral patterns

**Event Examples**:

```json
{
  "event": "new_alert",
  "data": {
    "alertId": "507f1f77bcf86cd799439020",
    "type": "multi_person",
    "severity": "critical",
    "confidence": 0.95,
    "requiresImmediate": true
  }
}
```

## AI Service Integration

### POST /proctoring/ai/health

Check AI service health status.

**Access**: Internal (System health checks)
**Rate Limit**: 60 requests/minute

**Response 200**:

```json
{
  "success": true,
  "data": {
    "aiService": {
      "status": "healthy",
      "version": "1.2.3",
      "responseTime": 145,
      "queueLength": 12,
      "errorRate": 0.02,
      "capabilities": [
        "face_detection",
        "gaze_tracking",
        "person_counting",
        "device_detection"
      ]
    }
  }
}
```

## Error Responses

### 503 Service Unavailable - AI Service Down

```json
{
  "success": false,
  "error": {
    "code": "AI_SERVICE_UNAVAILABLE",
    "message": "AI proctoring service is temporarily unavailable",
    "details": {
      "fallbackMode": true,
      "manualReviewRequired": true
    }
  }
}
```

### 422 Unprocessable Entity - Invalid Frame Data

```json
{
  "success": false,
  "error": {
    "code": "INVALID_FRAME_DATA",
    "message": "Unable to process webcam frame",
    "details": {
      "expectedFormat": "JPEG base64",
      "minResolution": "480x360",
      "maxSize": "2MB"
    }
  }
}
```
