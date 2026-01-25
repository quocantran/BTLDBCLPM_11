# Certificate Management Contracts

**Module**: certificates
**Base Path**: `/api/v1/certificates`

## Overview

Certificate management handles the issuance, tracking, and administration of blockchain-based certificates. Integrates with IPFS for metadata storage and EVM blockchain for immutable records.

**Implementation References**:

- [Blockchain Integration](../research.md#blockchain-integration)
- [Certificates Collection](../data-model.md#certificates-collection)

## Certificate Issuance Endpoints

### POST /certificates/issue

Issue a certificate for a completed exam (typically triggered automatically).

**Access**: Internal (System process) or Admin
**Rate Limit**: 100 requests/minute

**Request Body**:

```json
{
  "sessionId": "507f1f77bcf86cd799439011",
  "overrides": {
    "templateId": "custom_template_id",
    "customMessage": "Exceptional performance",
    "expedited": true
  }
}
```

**Response 201**:

```json
{
  "success": true,
  "data": {
    "certificate": {
      "id": "507f1f77bcf86cd799439030",
      "publicId": "cert_abc123def456",
      "status": "pending",
      "metadata": {
        "studentName": "John Student",
        "courseName": "Calculus I",
        "examTitle": "Midterm Examination",
        "score": 84,
        "percentage": 84,
        "issueDate": "2025-09-20T12:00:00.000Z"
      },
      "estimatedCompletion": "2025-09-20T12:05:00.000Z",
      "trackingId": "cert_track_xyz789"
    }
  }
}
```

### GET /certificates/{certificateId}/status

Check certificate issuance status.

**Access**: Protected (Student - own certificates, Teacher - own exams, Admin)
**Rate Limit**: Standard

**Response 200**:

```json
{
  "success": true,
  "data": {
    "certificate": {
      "id": "507f1f77bcf86cd799439030",
      "status": "minting",
      "progress": {
        "step": "blockchain_transaction",
        "percentage": 75,
        "currentAction": "Waiting for transaction confirmation",
        "estimatedCompletion": "2025-09-20T12:03:00.000Z"
      },
      "blockchain": {
        "txHash": "0x1234567890abcdef...",
        "confirmations": 8,
        "requiredConfirmations": 12,
        "network": "sepolia"
      },
      "ipfs": {
        "cid": "QmXoYV1...Z8N",
        "uploaded": true,
        "pinned": true
      }
    }
  }
}
```

### GET /certificates/{certificateId}

Get complete certificate details.

**Access**: Protected (Student - own certificates, Teacher - own exams, Admin)
**Rate Limit**: Standard

**Response 200**:

```json
{
  "success": true,
  "data": {
    "certificate": {
      "id": "507f1f77bcf86cd799439030",
      "publicId": "cert_abc123def456",
      "status": "issued",
      "metadata": {
        "studentName": "John Student",
        "courseName": "Calculus I",
        "examTitle": "Midterm Examination",
        "score": 84,
        "maxScore": 100,
        "percentage": 84,
        "issueDate": "2025-09-20T12:00:00.000Z"
      },
      "blockchain": {
        "tokenId": 12345,
        "txHash": "0x1234567890abcdef...",
        "contractAddress": "0x742d35Cc6639C0532fEb02035A89e1A1c3C9B71e",
        "network": "sepolia",
        "blockNumber": 12345678
      },
      "verification": {
        "publicUrl": "https://verify.example.com/cert/abc123",
        "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
        "downloadUrl": "https://api.example.com/certificates/download/abc123"
      },
      "issuedAt": "2025-09-20T12:05:00.000Z"
    }
  }
}
```

## Student Certificate Management

### GET /certificates/my

Get current user's certificates.

**Access**: Protected (Student role)
**Rate Limit**: Standard

**Query Parameters**:

- `status`: Filter by status (pending, issued, failed)
- `courseId`: Filter by course
- `limit`: Results limit (default: 20)
- `offset`: Pagination offset

**Response 200**:

```json
{
  "success": true,
  "data": {
    "certificates": [
      {
        "id": "507f1f77bcf86cd799439030",
        "publicId": "cert_abc123def456",
        "status": "issued",
        "exam": {
          "title": "Calculus I Midterm",
          "course": "Calculus I",
          "completedAt": "2025-09-20T11:45:00.000Z"
        },
        "score": {
          "percentage": 84,
          "passed": true
        },
        "blockchain": {
          "tokenId": 12345,
          "network": "sepolia"
        },
        "verification": {
          "publicUrl": "https://verify.example.com/cert/abc123",
          "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
        },
        "issuedAt": "2025-09-20T12:05:00.000Z"
      }
    ],
    "summary": {
      "total": 1,
      "issued": 1,
      "pending": 0,
      "failed": 0
    }
  }
}
```

### GET /certificates/download/{publicId}

Download certificate as PDF.

**Access**: Protected (Student - own certificates, Teacher - own exams)
**Rate Limit**: 10 requests/minute per certificate

**Response 200**: PDF file download
**Headers**:

- `Content-Type: application/pdf`
- `Content-Disposition: attachment; filename="certificate-calc1-john-student.pdf"`

### POST /certificates/{certificateId}/share

Generate shareable verification link.

**Access**: Protected (Student - own certificates)
**Rate Limit**: 20 requests/minute

**Request Body**:

```json
{
  "includeScore": true,
  "expiresIn": 86400,
  "accessLimit": 50,
  "allowedDomains": ["*.university.edu", "employer.com"]
}
```

**Response 200**:

```json
{
  "success": true,
  "data": {
    "shareLink": "https://verify.example.com/shared/temp_xyz789",
    "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    "settings": {
      "expiresAt": "2025-09-21T12:00:00.000Z",
      "accessLimit": 50,
      "accessCount": 0,
      "includeScore": true
    }
  }
}
```

## Teacher Certificate Management

### GET /certificates/issued

Get certificates issued for teacher's exams.

**Access**: Protected (Teacher role)
**Rate Limit**: Standard

**Query Parameters**:

- `examId`: Filter by specific exam
- `courseId`: Filter by course
- `status`: Filter by issuance status
- `dateFrom`: Filter by issue date range
- `dateTo`: Filter by issue date range

**Response 200**:

```json
{
  "success": true,
  "data": {
    "certificates": [
      {
        "id": "507f1f77bcf86cd799439030",
        "student": {
          "id": "507f1f77bcf86cd799439015",
          "firstName": "John",
          "lastName": "Student"
        },
        "exam": {
          "title": "Calculus I Midterm",
          "course": "Calculus I"
        },
        "score": {
          "percentage": 84,
          "passed": true
        },
        "status": "issued",
        "blockchain": {
          "tokenId": 12345,
          "txHash": "0x1234567890abcdef..."
        },
        "issuedAt": "2025-09-20T12:05:00.000Z"
      }
    ],
    "statistics": {
      "totalIssued": 1,
      "averageScore": 84.0,
      "passingRate": 100.0,
      "issuanceSuccessRate": 98.5
    }
  }
}
```

### POST /certificates/bulk-issue

Issue certificates for multiple completed exams.

**Access**: Protected (Teacher role)
**Rate Limit**: 5 requests/minute

**Request Body**:

```json
{
  "examId": "507f1f77bcf86cd799439012",
  "sessionIds": ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439014"],
  "templateOverrides": {
    "ceremonyDate": "2025-09-25T15:00:00.000Z",
    "additionalText": "Dean's List Recognition"
  }
}
```

**Response 200**:

```json
{
  "success": true,
  "data": {
    "bulkIssuance": {
      "jobId": "bulk_issue_abc123",
      "requested": 2,
      "initiated": 2,
      "failed": 0,
      "estimatedCompletion": "2025-09-20T12:10:00.000Z"
    },
    "certificates": [
      {
        "sessionId": "507f1f77bcf86cd799439011",
        "certificateId": "507f1f77bcf86cd799439030",
        "status": "pending"
      },
      {
        "sessionId": "507f1f77bcf86cd799439014",
        "certificateId": "507f1f77bcf86cd799439031",
        "status": "pending"
      }
    ]
  }
}
```

## Administrative Operations

### POST /certificates/{certificateId}/revoke

Revoke a certificate (admin action).

**Access**: Protected (Admin role)
**Rate Limit**: 10 requests/minute

**Request Body**:

```json
{
  "reason": "Academic misconduct discovered",
  "revokeOnBlockchain": false,
  "notifyStudent": true,
  "effectiveDate": "2025-09-20T15:00:00.000Z"
}
```

**Response 200**:

```json
{
  "success": true,
  "data": {
    "certificate": {
      "id": "507f1f77bcf86cd799439030",
      "status": "revoked",
      "revokedAt": "2025-09-20T15:00:00.000Z",
      "revokedBy": "507f1f77bcf86cd799439005",
      "revokedReason": "Academic misconduct discovered"
    },
    "actions": {
      "databaseUpdated": true,
      "blockchainRevoked": false,
      "studentNotified": true,
      "publicVerificationDisabled": true
    }
  }
}
```

### GET /certificates/analytics

Get certificate issuance analytics.

**Access**: Protected (Admin role)
**Rate Limit**: Standard

**Query Parameters**:

- `dateFrom`: Analytics date range start
- `dateTo`: Analytics date range end
- `granularity`: daily, weekly, monthly

**Response 200**:

```json
{
  "success": true,
  "data": {
    "analytics": {
      "period": {
        "from": "2025-09-01T00:00:00.000Z",
        "to": "2025-09-20T23:59:59.000Z"
      },
      "issuance": {
        "totalIssued": 234,
        "totalRevoked": 2,
        "successRate": 99.1,
        "averageIssuanceTime": 185,
        "dailyTrend": [{ "date": "2025-09-20", "issued": 12, "failed": 0 }]
      },
      "blockchain": {
        "totalTransactions": 234,
        "averageGasCost": 0.0012,
        "totalGasUsed": 0.2808,
        "failureRate": 0.4
      },
      "verification": {
        "totalVerifications": 1567,
        "uniqueVerifiers": 892,
        "averageResponseTime": 245,
        "topVerifiers": [
          { "domain": "university.edu", "count": 456 },
          { "domain": "employer.com", "count": 234 }
        ]
      }
    }
  }
}
```

### POST /certificates/retry-failed

Retry failed certificate issuances.

**Access**: Protected (Admin role)
**Rate Limit**: 5 requests/hour

**Request Body**:

```json
{
  "certificateIds": ["507f1f77bcf86cd799439032", "507f1f77bcf86cd799439033"],
  "retryType": "blockchain_only"
}
```

**Response 200**:

```json
{
  "success": true,
  "data": {
    "retryJob": {
      "jobId": "retry_certs_def456",
      "certificateCount": 2,
      "retryType": "blockchain_only",
      "initiatedAt": "2025-09-20T16:00:00.000Z"
    }
  }
}
```

## Error Responses

### 409 Conflict - Certificate Already Exists

```json
{
  "success": false,
  "error": {
    "code": "CERTIFICATE_ALREADY_EXISTS",
    "message": "Certificate already issued for this exam session",
    "details": {
      "existingCertificateId": "507f1f77bcf86cd799439030"
    }
  }
}
```

### 422 Unprocessable Entity - Exam Not Passed

```json
{
  "success": false,
  "error": {
    "code": "EXAM_NOT_PASSED",
    "message": "Cannot issue certificate for failed exam",
    "details": {
      "score": 65,
      "passingScore": 70,
      "percentage": 65.0
    }
  }
}
```

### 503 Service Unavailable - Blockchain Network Issues

```json
{
  "success": false,
  "error": {
    "code": "BLOCKCHAIN_NETWORK_ERROR",
    "message": "Unable to connect to blockchain network",
    "details": {
      "network": "sepolia",
      "retryAfter": 60,
      "fallbackAvailable": false
    }
  }
}
```
