# Administrative Contracts

**Module**: admin
**Base Path**: `/api/v1/admin`

## Overview

Administrative endpoints for system management, user administration, platform settings, and monitoring. Restricted to admin role users only.

**Implementation Reference**: [Security Measures](../research.md#security-measures)

## User Management

### GET /admin/users

List and manage platform users.

**Access**: Protected (Admin role)
**Rate Limit**: Standard

**Query Parameters**:

- `role`: Filter by user role
- `status`: Filter by account status
- `search`: Search by name or email
- `limit`: Results limit (default: 50)
- `offset`: Pagination offset

**Response 200**:

```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "507f1f77bcf86cd799439015",
        "email": "student@university.edu",
        "firstName": "John",
        "lastName": "Student",
        "role": "student",
        "status": "active",
        "emailVerified": true,
        "lastLogin": "2025-09-20T09:30:00.000Z",
        "createdAt": "2025-09-15T10:00:00.000Z",
        "statistics": {
          "examsAttempted": 3,
          "certificatesEarned": 2,
          "averageScore": 78.5
        }
      }
    ],
    "pagination": {
      "total": 1245,
      "limit": 50,
      "offset": 0,
      "hasMore": true
    },
    "summary": {
      "totalUsers": 1245,
      "byRole": {
        "student": 1156,
        "teacher": 87,
        "admin": 2
      },
      "byStatus": {
        "active": 1200,
        "suspended": 15,
        "pending_verification": 30
      }
    }
  }
}
```

### PUT /admin/users/{userId}/status

Update user account status.

**Access**: Protected (Admin role)
**Rate Limit**: 20 requests/minute

**Request Body**:

```json
{
  "status": "suspended",
  "reason": "Violation of academic integrity policy",
  "notifyUser": true,
  "duration": 2592000
}
```

**Response 200**:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439015",
      "status": "suspended",
      "suspendedAt": "2025-09-20T16:00:00.000Z",
      "suspendedBy": "507f1f77bcf86cd799439005",
      "suspensionReason": "Violation of academic integrity policy",
      "suspensionEnds": "2025-10-20T16:00:00.000Z"
    },
    "actions": {
      "userNotified": true,
      "activeSessionsTerminated": 1,
      "certificatesAffected": 0
    }
  }
}
```

### POST /admin/users/{userId}/impersonate

Impersonate user for support purposes.

**Access**: Protected (Admin role)
**Rate Limit**: 5 requests/hour per admin

**Request Body**:

```json
{
  "reason": "Technical support - investigating exam submission issue",
  "duration": 3600,
  "restrictions": ["no_exam_access", "read_only"]
}
```

**Response 200**:

```json
{
  "success": true,
  "data": {
    "impersonation": {
      "token": "imp_eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresAt": "2025-09-20T17:00:00.000Z",
      "restrictions": ["no_exam_access", "read_only"],
      "auditId": "audit_imp_abc123"
    }
  }
}
```

## System Analytics

### GET /admin/analytics/platform

Get comprehensive platform analytics.

**Access**: Protected (Admin role)
**Rate Limit**: Standard

**Query Parameters**:

- `period`: daily, weekly, monthly, custom
- `dateFrom`: Custom period start
- `dateTo`: Custom period end

**Response 200**:

```json
{
  "success": true,
  "data": {
    "analytics": {
      "period": {
        "type": "monthly",
        "from": "2025-09-01T00:00:00.000Z",
        "to": "2025-09-30T23:59:59.000Z"
      },
      "users": {
        "total": 1245,
        "newRegistrations": 89,
        "activeUsers": 967,
        "retentionRate": 77.7
      },
      "exams": {
        "totalExams": 156,
        "examsCreated": 23,
        "examAttempts": 2345,
        "completionRate": 94.2,
        "averageScore": 76.8
      },
      "certificates": {
        "totalIssued": 1789,
        "issuedThisPeriod": 234,
        "verificationRequests": 456,
        "blockchainSuccess": 99.1
      },
      "proctoring": {
        "sessionsMonitored": 2345,
        "alertsGenerated": 567,
        "flaggedSessions": 45,
        "falsePositiveRate": 12.3
      },
      "performance": {
        "averageResponseTime": 185,
        "uptime": 99.8,
        "errorRate": 0.2,
        "peakConcurrentUsers": 145
      }
    }
  }
}
```

### GET /admin/analytics/security

Get security and audit analytics.

**Access**: Protected (Admin role)
**Rate Limit**: Standard

**Response 200**:

```json
{
  "success": true,
  "data": {
    "security": {
      "authenticationEvents": {
        "successfulLogins": 12456,
        "failedAttempts": 234,
        "suspiciousActivity": 12,
        "blockedIPs": 5
      },
      "examSecurity": {
        "proctoringViolations": 45,
        "terminatedSessions": 8,
        "academicMisconduct": 3,
        "falseAlerts": 28
      },
      "systemSecurity": {
        "rateLimitViolations": 156,
        "apiKeyViolations": 2,
        "unauthorizedAccess": 0,
        "dataIntegrityChecks": "passed"
      },
      "auditTrail": {
        "totalEvents": 45678,
        "criticalEvents": 23,
        "lastAuditTime": "2025-09-20T15:00:00.000Z",
        "complianceStatus": "compliant"
      }
    }
  }
}
```

## Platform Configuration

### GET /admin/settings

Get platform configuration settings.

**Access**: Protected (Admin role)
**Rate Limit**: Standard

**Response 200**:

```json
{
  "success": true,
  "data": {
    "settings": {
      "platform": {
        "name": "EduChain Block Platform",
        "version": "1.0.0",
        "maintenanceMode": false,
        "registrationEnabled": true,
        "maxUsersPerOrganization": 10000
      },
      "examSettings": {
        "maxExamDuration": 240,
        "maxQuestionsPerExam": 100,
        "defaultProctoringEnabled": true,
        "aiProctoringStrictness": "medium"
      },
      "certificateSettings": {
        "blockchainNetwork": "sepolia",
        "autoIssuanceEnabled": true,
        "verificationPubliclyEnabled": true,
        "retentionPeriodYears": 10
      },
      "securitySettings": {
        "passwordPolicy": {
          "minLength": 8,
          "requireNumbers": true,
          "requireSymbols": true,
          "requireUppercase": true
        },
        "sessionTimeout": 3600,
        "maxLoginAttempts": 5,
        "lockoutDuration": 900
      }
    }
  }
}
```

### PUT /admin/settings

Update platform settings.

**Access**: Protected (Admin role)
**Rate Limit**: 5 requests/hour

**Request Body**:

```json
{
  "examSettings": {
    "maxExamDuration": 180,
    "aiProctoringStrictness": "high"
  },
  "securitySettings": {
    "sessionTimeout": 7200,
    "maxLoginAttempts": 3
  }
}
```

**Response 200**:

```json
{
  "success": true,
  "data": {
    "updated": {
      "examSettings.maxExamDuration": 180,
      "examSettings.aiProctoringStrictness": "high",
      "securitySettings.sessionTimeout": 7200,
      "securitySettings.maxLoginAttempts": 3
    },
    "effectiveAt": "2025-09-20T16:30:00.000Z",
    "changedBy": "507f1f77bcf86cd799439005"
  }
}
```

## System Maintenance

### POST /admin/maintenance/mode

Enable/disable maintenance mode.

**Access**: Protected (Admin role)
**Rate Limit**: 10 requests/hour

**Request Body**:

```json
{
  "enabled": true,
  "message": "Scheduled maintenance for blockchain network upgrade",
  "estimatedDuration": 7200,
  "allowAdminAccess": true
}
```

**Response 200**:

```json
{
  "success": true,
  "data": {
    "maintenanceMode": {
      "enabled": true,
      "startedAt": "2025-09-20T18:00:00.000Z",
      "estimatedEnd": "2025-09-20T20:00:00.000Z",
      "message": "Scheduled maintenance for blockchain network upgrade",
      "activeUsers": 23,
      "activeSessions": 5
    }
  }
}
```

### POST /admin/maintenance/cleanup

Run system cleanup operations.

**Access**: Protected (Admin role)
**Rate Limit**: 2 requests/hour

**Request Body**:

```json
{
  "operations": [
    "expired_sessions",
    "old_audit_logs",
    "temp_files",
    "unused_verification_tokens"
  ],
  "dryRun": false
}
```

**Response 200**:

```json
{
  "success": true,
  "data": {
    "cleanup": {
      "jobId": "cleanup_ghi789",
      "operations": 4,
      "estimatedDuration": 300,
      "startedAt": "2025-09-20T19:00:00.000Z",
      "dryRun": false
    }
  }
}
```

## Audit and Compliance

### GET /admin/audit/logs

Get audit log entries.

**Access**: Protected (Admin role)
**Rate Limit**: Standard

**Query Parameters**:

- `userId`: Filter by user ID
- `action`: Filter by action type
- `dateFrom`: Time range start
- `dateTo`: Time range end
- `severity`: Filter by severity level

**Response 200**:

```json
{
  "success": true,
  "data": {
    "auditLogs": [
      {
        "id": "audit_log_001",
        "timestamp": "2025-09-20T16:15:00.000Z",
        "userId": "507f1f77bcf86cd799439015",
        "action": "exam_submitted",
        "resource": "exam_session_507f1f77bcf86cd799439011",
        "severity": "info",
        "details": {
          "examId": "507f1f77bcf86cd799439012",
          "score": 84,
          "duration": 7200,
          "proctoringAlerts": 2
        },
        "ipAddress": "192.168.1.100",
        "userAgent": "Mozilla/5.0..."
      }
    ],
    "pagination": {
      "total": 45678,
      "limit": 50,
      "offset": 0
    }
  }
}
```

### POST /admin/compliance/report

Generate compliance report.

**Access**: Protected (Admin role)
**Rate Limit**: 5 requests/day per admin

**Request Body**:

```json
{
  "reportType": "gdpr_compliance",
  "period": {
    "from": "2025-09-01T00:00:00.000Z",
    "to": "2025-09-30T23:59:59.000Z"
  },
  "includePersonalData": false,
  "format": "pdf"
}
```

**Response 200**:

```json
{
  "success": true,
  "data": {
    "report": {
      "id": "compliance_report_abc123",
      "type": "gdpr_compliance",
      "status": "generating",
      "downloadUrl": null,
      "estimatedCompletion": "2025-09-20T20:10:00.000Z",
      "requestedBy": "507f1f77bcf86cd799439005"
    }
  }
}
```

## Error Responses

### 403 Forbidden - Insufficient Admin Privileges

```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_ADMIN_PRIVILEGES",
    "message": "This operation requires super admin privileges"
  }
}
```

### 409 Conflict - Operation Not Allowed

```json
{
  "success": false,
  "error": {
    "code": "OPERATION_NOT_ALLOWED",
    "message": "Cannot suspend user with active exam sessions",
    "details": {
      "activeExamSessions": 2,
      "suggestion": "Wait for sessions to complete or terminate them first"
    }
  }
}
```
