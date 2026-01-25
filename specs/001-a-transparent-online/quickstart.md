# Quickstart Guide: EduChain Block Platform

**Feature**: 001-a-transparent-online
**Target Audience**: Developers setting up the examination platform

## Prerequisites

- **Node.js**: 20.x or higher
- **MongoDB**: 7.x running locally or connection string to remote instance
- **Redis**: 7.x for caching and job queues
- **Git**: For version control
- **Docker**: Optional, for containerized development

## Environment Setup

### 1. Clone and Install Dependencies

```bash
git clone <repository-url> educhain-block
cd educhain-block
npm install
```

### 2. Environment Configuration

Create `.env` file in project root:

```env
# Application
NODE_ENV=development
PORT=3000
API_VERSION=v1

# Database
MONGODB_URI=mongodb://localhost:27017/educhain-block
REDIS_URL=redis://localhost:6379

# JWT Authentication
JWT_SECRET=your-super-secret-jwt-key-min-32-characters
JWT_EXPIRES_IN=3600

# Email Service (SendGrid example)
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=your-sendgrid-api-key
FROM_EMAIL=noreply@yourdomain.com

# Blockchain Configuration
BLOCKCHAIN_NETWORK=sepolia
BLOCKCHAIN_RPC_URL=https://sepolia.infura.io/v3/your-project-id
PRIVATE_KEY=your-ethereum-private-key
CONTRACT_ADDRESS=0x742d35Cc6639C0532fEb02035A89e1A1c3C9B71e

# IPFS Configuration
IPFS_GATEWAY=https://gateway.pinata.cloud
PINATA_API_KEY=your-pinata-api-key
PINATA_SECRET_KEY=your-pinata-secret

# AI Proctoring Service
AI_PROCTORING_URL=http://localhost:5000
AI_PROCTORING_API_KEY=your-ai-service-key

# Security
CORS_ORIGINS=http://localhost:3001,http://localhost:3000
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX=100

# File Upload
MAX_FILE_SIZE=10485760  # 10MB
UPLOAD_PATH=./uploads
```

### 3. Database Setup

Start MongoDB and Redis services:

```bash
# MongoDB (if using local installation)
mongod --dbpath /path/to/your/db

# Redis (if using local installation)
redis-server

# Or using Docker
docker run -d -p 27017:27017 --name mongodb mongo:7
docker run -d -p 6379:6379 --name redis redis:7
```

### 4. Initialize Database

Run database migrations and seed data:

```bash
npm run db:migrate
npm run db:seed  # Optional: Create sample data
```

## Development Workflow

### 1. Start Development Server

```bash
npm run start:dev  # Watch mode with hot reload
```

The API will be available at `http://localhost:3000`

### 2. API Documentation

Access Swagger documentation at:

- **UI**: `http://localhost:3000/docs`
- **JSON**: `http://localhost:3000/docs-json`

### 3. Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov

# Watch mode
npm run test:watch
```

### 4. Code Quality

```bash
# Linting
npm run lint
npm run lint:fix

# Formatting
npm run format
```

## Quick Start User Flows

### 1. Create Admin User

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@university.edu",
    "password": "AdminPass123!",
    "firstName": "Admin",
    "lastName": "User",
    "role": "admin"
  }'
```

### 2. Create Teacher Account

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teacher@university.edu",
    "password": "TeacherPass123!",
    "firstName": "John",
    "lastName": "Teacher",
    "role": "teacher"
  }'
```

### 3. Create Course and Exam

After authentication, teachers can create courses and exams via the API endpoints documented in the contracts.

### 4. Student Exam Flow

1. Student registers with exam code
2. Completes face verification
3. Takes exam with AI proctoring
4. Receives blockchain certificate

## Project Structure Overview

```
src/
├── auth/                 # Authentication module
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── guards/           # JWT, Roles guards
│   └── strategies/       # Passport strategies
├── users/                # User management
├── courses/              # Course management
├── exams/                # Exam definitions
├── exam-sessions/        # Active exam sessions
├── certificates/         # Certificate issuance
├── verification/         # Public verification
├── proctoring/           # AI proctoring gateway
├── blockchain/           # Blockchain integration
├── common/               # Shared utilities
│   ├── decorators/       # Custom decorators
│   ├── filters/          # Exception filters
│   ├── guards/           # Custom guards
│   ├── interceptors/     # Response interceptors
│   └── validators/       # Custom validators
├── config/               # Configuration
│   ├── database.config.ts
│   ├── jwt.config.ts
│   └── app.config.ts
└── main.ts              # Application bootstrap
```

## External Service Setup

### 1. AI Proctoring Service

If running the Python AI service locally:

```bash
cd ai-proctoring-service
pip install -r requirements.txt
python app.py  # Runs on port 5000
```

### 2. Blockchain Setup

Deploy the certificate NFT contract to Sepolia testnet:

```bash
npm run deploy:contract
```

### 3. IPFS Setup

Configure Pinata or local IPFS node for metadata storage.

## Testing Exam Flow

### 1. Create Test Exam

Use the provided Postman collection or curl commands:

```bash
# Login as teacher
TOKEN=$(curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"teacher@university.edu","password":"TeacherPass123!"}' \
  | jq -r '.data.token')

# Create course
COURSE_ID=$(curl -X POST http://localhost:3000/api/v1/courses \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Course","description":"Sample course"}' \
  | jq -r '.data.course.id')

# Create exam with questions
curl -X POST http://localhost:3000/api/v1/exams \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Sample Exam",
    "courseId": "'$COURSE_ID'",
    "duration": 30,
    "questions": [
      {
        "content": "What is 2+2?",
        "choices": [
          {"content": "3", "isCorrect": false},
          {"content": "4", "isCorrect": true},
          {"content": "5", "isCorrect": false}
        ]
      }
    ]
  }'
```

### 2. Take Exam as Student

```bash
# Register as student and follow the exam session flow
# See exam-session-contracts.md for detailed endpoints
```

## Monitoring and Logging

### Development Logging

- Console output with colors
- Request/response logging
- Error stack traces
- Database query logging

### Production Setup

- Structured JSON logging
- Log rotation
- Error tracking (Sentry)
- Performance monitoring

## Troubleshooting

### Common Issues

1. **MongoDB Connection Failed**

   - Check MongoDB is running
   - Verify connection string in .env
   - Ensure database exists

2. **Redis Connection Failed**

   - Check Redis is running
   - Verify Redis URL in .env
   - Check Redis memory limits

3. **Blockchain Transactions Failing**

   - Verify private key has testnet ETH
   - Check RPC URL is accessible
   - Confirm contract address is correct

4. **AI Proctoring Service Unavailable**
   - Ensure Python service is running
   - Check service URL and API key
   - Verify network connectivity

### Debug Mode

```bash
DEBUG=* npm run start:dev  # Enable all debug logs
```

## Next Steps

1. **Frontend Integration**: Connect React/Vue frontend
2. **Production Deployment**: Docker containers + orchestration
3. **Monitoring Setup**: Application and infrastructure monitoring
4. **Security Hardening**: SSL certificates, security headers
5. **Scale Testing**: Load testing with realistic exam scenarios

## Support

- **Documentation**: `/docs` endpoint
- **API Reference**: Contract files in `specs/*/contracts/`
- **Issue Tracking**: GitHub Issues
- **Team Communication**: Slack/Discord channels

This quickstart guide provides everything needed to get the EduChain Block platform running locally for development and testing.
