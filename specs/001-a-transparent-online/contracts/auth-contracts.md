# Authentication Contracts

**Module**: auth
**Base Path**: `/api/v1/auth`

## Endpoints

### POST /auth/register

Register a new user account.

**Access**: Public
**Rate Limit**: 5 requests/minute per IP

**Request Body**:

```json
{
  "email": "student@university.edu",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "role": "student"
}
```

**Response 201**:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "email": "student@university.edu",
      "firstName": "John",
      "lastName": "Doe",
      "role": "student",
      "status": "pending_verification"
    },
    "message": "Registration successful. Please check your email for verification."
  }
}
```

**Validation Rules**:

- Email: Valid format, unique, max 255 chars
- Password: Min 8 chars, must include uppercase, lowercase, number, special char
- FirstName/LastName: 2-50 chars, alphabetic + spaces/hyphens
- Role: Must be 'student', 'teacher', or 'admin'

### POST /auth/login

Authenticate user and return JWT token.

**Access**: Public
**Rate Limit**: 10 requests/minute per IP

**Request Body**:

```json
{
  "email": "student@university.edu",
  "password": "SecurePass123!"
}
```

**Response 200**:

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "email": "student@university.edu",
      "firstName": "John",
      "lastName": "Doe",
      "role": "student"
    },
    "expiresIn": 3600
  }
}
```

### POST /auth/logout

Invalidate current JWT token.

**Access**: Protected (Bearer token)
**Rate Limit**: Standard

**Request**: No body required

**Response 200**:

```json
{
  "success": true,
  "data": {
    "message": "Logged out successfully"
  }
}
```

### GET /auth/me

Get current user profile.

**Access**: Protected (Bearer token)
**Rate Limit**: Standard

**Response 200**:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "email": "student@university.edu",
      "firstName": "John",
      "lastName": "Doe",
      "role": "student",
      "status": "active",
      "emailVerified": true,
      "walletAddress": "0x742d35Cc6639C0532fEb02035A89e1A1c3C9B71e",
      "lastLogin": "2025-09-20T10:30:00.000Z"
    }
  }
}
```

### POST /auth/verify-email

Verify email address with token.

**Access**: Public
**Rate Limit**: 10 requests/minute per IP

**Request Body**:

```json
{
  "token": "abc123def456ghi789"
}
```

**Response 200**:

```json
{
  "success": true,
  "data": {
    "message": "Email verified successfully",
    "user": {
      "emailVerified": true
    }
  }
}
```

### POST /auth/resend-verification

Resend email verification token.

**Access**: Public
**Rate Limit**: 3 requests/minute per IP

**Request Body**:

```json
{
  "email": "student@university.edu"
}
```

**Response 200**:

```json
{
  "success": true,
  "data": {
    "message": "Verification email sent"
  }
}
```

### POST /auth/forgot-password

Request password reset token.

**Access**: Public
**Rate Limit**: 5 requests/minute per IP

**Request Body**:

```json
{
  "email": "student@university.edu"
}
```

**Response 200**:

```json
{
  "success": true,
  "data": {
    "message": "Password reset email sent if account exists"
  }
}
```

### POST /auth/reset-password

Reset password with token.

**Access**: Public
**Rate Limit**: 5 requests/minute per IP

**Request Body**:

```json
{
  "token": "reset_token_abc123",
  "newPassword": "NewSecurePass456!"
}
```

**Response 200**:

```json
{
  "success": true,
  "data": {
    "message": "Password reset successfully"
  }
}
```

### PUT /auth/change-password

Change password for authenticated user.

**Access**: Protected (Bearer token)
**Rate Limit**: Standard

**Request Body**:

```json
{
  "currentPassword": "SecurePass123!",
  "newPassword": "NewSecurePass456!"
}
```

**Response 200**:

```json
{
  "success": true,
  "data": {
    "message": "Password changed successfully"
  }
}
```

### PUT /auth/profile

Update user profile information.

**Access**: Protected (Bearer token)
**Rate Limit**: Standard

**Request Body**:

```json
{
  "firstName": "John",
  "lastName": "Smith",
  "walletAddress": "0x742d35Cc6639C0532fEb02035A89e1A1c3C9B71e",
  "settings": {
    "timezone": "UTC",
    "notifications": {
      "email": true,
      "examReminders": true
    }
  }
}
```

**Response 200**:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "firstName": "John",
      "lastName": "Smith",
      "walletAddress": "0x742d35Cc6639C0532fEb02035A89e1A1c3C9B71e",
      "updatedAt": "2025-09-20T10:35:00.000Z"
    }
  }
}
```

## Error Responses

### 400 Bad Request - Validation Error

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "fields": {
        "email": ["Email must be valid"],
        "password": ["Password must be at least 8 characters"]
      }
    }
  }
}
```

### 401 Unauthorized - Invalid Credentials

```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid email or password"
  }
}
```

### 409 Conflict - Email Already Exists

```json
{
  "success": false,
  "error": {
    "code": "EMAIL_EXISTS",
    "message": "An account with this email already exists"
  }
}
```

### 422 Unprocessable Entity - Account Not Verified

```json
{
  "success": false,
  "error": {
    "code": "EMAIL_NOT_VERIFIED",
    "message": "Please verify your email before logging in"
  }
}
```
