# API Contracts Overview

**Feature**: 001-a-transparent-online
**API Version**: v1
**Base URL**: `/api/v1`

## Authentication & Authorization

### JWT Authentication

All protected endpoints require `Authorization: Bearer <token>` header.

**JWT Payload Structure**:

```json
{
  "sub": "user_id",
  "email": "user@example.com",
  "role": "student|teacher|admin",
  "sessionId": "optional_exam_session_id",
  "iat": 1634567890,
  "exp": 1634654290
}
```

### Role-Based Access Control

- **Public**: Certificate verification endpoints
- **Student**: Exam access, session management, own certificates
- **Teacher**: Course/exam management, proctoring oversight, student results
- **Admin**: System administration, user management, platform settings

## Error Response Format

All API errors follow consistent structure:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description",
    "details": {}, // Optional additional context
    "timestamp": "2025-09-20T10:30:00.000Z",
    "path": "/api/v1/endpoint",
    "requestId": "req_123456789"
  }
}
```

## Success Response Format

All successful responses include:

```json
{
  "success": true,
  "data": {}, // Response payload
  "meta": {
    // Optional metadata
    "pagination": {},
    "timing": {},
    "version": "1.0.0"
  }
}
```

## Rate Limiting

- **General API**: 100 requests/minute per IP
- **Authentication**: 10 requests/minute per IP
- **Exam Sessions**: 30 requests/minute per user
- **Certificate Verification**: 50 requests/minute per IP

Rate limit headers included in all responses:

- `X-RateLimit-Limit`: Request limit
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Reset time (Unix timestamp)

## Contract Files Index

1. **[auth-contracts.md](./auth-contracts.md)** - Authentication & user management
2. **[courses-contracts.md](./courses-contracts.md)** - Course & exam management
3. **[exam-session-contracts.md](./exam-session-contracts.md)** - Active exam sessions
4. **[proctoring-contracts.md](./proctoring-contracts.md)** - AI proctoring integration
5. **[certificates-contracts.md](./certificates-contracts.md)** - Certificate issuance & management
6. **[verification-contracts.md](./verification-contracts.md)** - Public certificate verification
7. **[admin-contracts.md](./admin-contracts.md)** - Administrative operations

## Global HTTP Status Codes

- **200 OK**: Successful operation
- **201 Created**: Resource created successfully
- **400 Bad Request**: Invalid request data
- **401 Unauthorized**: Authentication required
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Resource not found
- **409 Conflict**: Resource conflict (duplicate, state)
- **422 Unprocessable Entity**: Validation errors
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Unexpected server error
- **503 Service Unavailable**: External service unavailable

## Swagger Documentation

All endpoints documented with OpenAPI 3.0 specification.
Available at: `GET /docs` (HTML UI) and `GET /docs-json` (JSON spec).
