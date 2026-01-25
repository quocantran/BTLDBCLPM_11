# Certificate Verification Contracts

**Module**: verification  
**Base Path**: `/api/v1/verify`

## Public Verification Endpoints

### GET /verify/certificate/{publicId}

Verify certificate by public ID.

**Access**: Public (no authentication)
**Rate Limit**: 50 requests/minute per IP

**Response 200**:

```json
{
  "success": true,
  "data": {
    "certificate": {
      "verified": true,
      "student": {
        "name": "John D.", // Anonymized for privacy
        "id": "masked_student_id"
      },
      "course": {
        "name": "Calculus I",
        "institution": "University of Excellence"
      },
      "exam": {
        "title": "Midterm Examination",
        "score": 84,
        "maxScore": 100,
        "percentage": 84,
        "passed": true
      },
      "issuance": {
        "date": "2025-09-20T12:00:00.000Z",
        "blockchain": {
          "network": "sepolia",
          "txHash": "0x1234567890abcdef...",
          "tokenId": 12345,
          "contractAddress": "0x742d35Cc6639C0532fEb02035A89e1A1c3C9B71e"
        }
      },
      "verification": {
        "timestamp": "2025-09-20T14:30:00.000Z",
        "responseTime": 250,
        "blockchainConfirmed": true
      }
    }
  }
}
```

### GET /verify/qr/{qrToken}

Verify certificate by QR code token.

**Access**: Public (no authentication)  
**Rate Limit**: 50 requests/minute per IP

**Response 200**: Same as above

### POST /verify/batch

Verify multiple certificates in a single request.

**Access**: Public (no authentication)
**Rate Limit**: 10 requests/minute per IP

**Request Body**:

```json
{
  "certificates": [
    {
      "type": "publicId",
      "value": "cert_abc123def456"
    },
    {
      "type": "txHash",
      "value": "0x1234567890abcdef..."
    },
    {
      "type": "tokenId",
      "value": "12345",
      "contractAddress": "0x742d35Cc6639C0532fEb02035A89e1A1c3C9B71e"
    }
  ]
}
```

**Response 200**:

```json
{
  "success": true,
  "data": {
    "results": [
      {
        "input": {
          "type": "publicId",
          "value": "cert_abc123def456"
        },
        "verified": true,
        "certificate": {
          /* Certificate data */
        }
      },
      {
        "input": {
          "type": "txHash",
          "value": "0x1234567890abcdef..."
        },
        "verified": false,
        "error": "Certificate not found"
      }
    ],
    "summary": {
      "total": 3,
      "verified": 2,
      "failed": 1
    }
  }
}
```

### GET /verify/blockchain/{txHash}

Verify certificate directly from blockchain transaction.

**Access**: Public (no authentication)
**Rate Limit**: 30 requests/minute per IP

**Response 200**:

```json
{
  "success": true,
  "data": {
    "transaction": {
      "hash": "0x1234567890abcdef...",
      "blockNumber": 12345678,
      "confirmed": true,
      "confirmations": 150
    },
    "certificate": {
      "tokenId": 12345,
      "contractAddress": "0x742d35Cc6639C0532fEb02035A89e1A1c3C9B71e",
      "metadata": {
        "ipfsCid": "QmXoYV1...Z8N",
        "student": "John D.",
        "course": "Calculus I",
        "score": 84,
        "issueDate": "2025-09-20T12:00:00.000Z"
      },
      "verified": true
    }
  }
}
```

### GET /verify/stats

Get verification statistics (public insights).

**Access**: Public (no authentication)
**Rate Limit**: 10 requests/minute per IP

**Response 200**:

```json
{
  "success": true,
  "data": {
    "statistics": {
      "totalCertificates": 15420,
      "totalVerifications": 3891,
      "averageResponseTime": 245,
      "successRate": 98.7,
      "networksSupported": ["sepolia", "mainnet"],
      "lastUpdated": "2025-09-20T14:30:00.000Z"
    },
    "recentActivity": {
      "verificationsToday": 127,
      "certificatesIssuedToday": 89,
      "averageScoreToday": 78.3
    }
  }
}
```

## Protected Verification Endpoints

### GET /verify/my-certificates

Get current user's certificates.

**Access**: Protected (Student role)
**Rate Limit**: Standard

**Response 200**:

```json
{
  "success": true,
  "data": {
    "certificates": [
      {
        "id": "507f1f77bcf86cd799439011",
        "publicId": "cert_abc123def456",
        "exam": {
          "title": "Calculus I Midterm",
          "course": "Mathematics 101"
        },
        "score": {
          "percentage": 84,
          "passed": true
        },
        "blockchain": {
          "tokenId": 12345,
          "txHash": "0x1234567890abcdef...",
          "network": "sepolia"
        },
        "status": "issued",
        "issuedAt": "2025-09-20T12:00:00.000Z",
        "downloadUrl": "https://api.example.com/certificates/download/...",
        "verificationUrl": "https://verify.example.com/cert/abc123"
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

### POST /verify/share-certificate

Generate shareable verification link.

**Access**: Protected (Student, own certificates)
**Rate Limit**: 20 requests/minute per user

**Request Body**:

```json
{
  "certificateId": "507f1f77bcf86cd799439011",
  "includeScore": true,
  "expiresIn": 86400 // seconds, optional
}
```

**Response 200**:

```json
{
  "success": true,
  "data": {
    "shareLink": "https://verify.example.com/shared/temp_xyz789",
    "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    "expiresAt": "2025-09-21T14:30:00.000Z",
    "accessCount": 0,
    "maxAccess": 100
  }
}
```

## Administrative Verification Endpoints

### GET /verify/admin/reports

Get verification reports and analytics.

**Access**: Protected (Admin role)
**Rate Limit**: Standard

**Response 200**:

```json
{
  "success": true,
  "data": {
    "reports": {
      "dailyVerifications": [
        {
          "date": "2025-09-20",
          "verifications": 127,
          "uniqueVerifiers": 89,
          "averageResponseTime": 245
        }
      ],
      "popularCertificates": [
        {
          "course": "Mathematics 101",
          "verifications": 45,
          "percentage": 35.4
        }
      ],
      "performanceMetrics": {
        "blockchainQueryTime": 180,
        "ipfsQueryTime": 95,
        "databaseQueryTime": 25,
        "totalResponseTime": 245
      }
    }
  }
}
```

### POST /verify/admin/revoke

Revoke a certificate (administrative action).

**Access**: Protected (Admin role)
**Rate Limit**: 10 requests/minute per admin

**Request Body**:

```json
{
  "certificateId": "507f1f77bcf86cd799439011",
  "reason": "Academic misconduct discovered",
  "revokeBlockchain": false
}
```

**Response 200**:

```json
{
  "success": true,
  "data": {
    "certificate": {
      "id": "507f1f77bcf86cd799439011",
      "status": "revoked",
      "revokedAt": "2025-09-20T15:00:00.000Z",
      "revokedReason": "Academic misconduct discovered"
    },
    "actions": {
      "databaseUpdated": true,
      "blockchainRevoked": false,
      "studentNotified": true
    }
  }
}
```

## Error Responses

### 404 Not Found - Certificate Not Found

```json
{
  "success": false,
  "error": {
    "code": "CERTIFICATE_NOT_FOUND",
    "message": "No certificate found with the provided identifier"
  }
}
```

### 410 Gone - Certificate Revoked

```json
{
  "success": false,
  "error": {
    "code": "CERTIFICATE_REVOKED",
    "message": "This certificate has been revoked",
    "details": {
      "revokedAt": "2025-09-20T15:00:00.000Z",
      "reason": "Academic misconduct"
    }
  }
}
```

### 503 Service Unavailable - Blockchain Service Down

```json
{
  "success": false,
  "error": {
    "code": "BLOCKCHAIN_UNAVAILABLE",
    "message": "Blockchain verification service temporarily unavailable",
    "details": {
      "retryAfter": 30,
      "fallbackAvailable": true
    }
  }
}
```

### 422 Unprocessable Entity - Invalid Certificate Format

```json
{
  "success": false,
  "error": {
    "code": "INVALID_CERTIFICATE_FORMAT",
    "message": "Certificate identifier format is invalid",
    "details": {
      "expectedFormat": "cert_[a-zA-Z0-9]{12}",
      "providedFormat": "invalid_format"
    }
  }
}
```
