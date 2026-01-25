# Research: Online Examination Platform Technical Decisions

**Feature**: 001-a-transparent-online
**Date**: 2025-09-20
**Status**: Completed

## Technology Stack Analysis

### Backend Framework Decision: NestJS

**Selected**: NestJS 10.x with Node.js 20+
**Rationale**:

- TypeScript-first framework aligns with type safety requirements
- Modular architecture supports constitutional domain-modular principle
- Built-in dependency injection enables clean layered architecture
- Extensive ecosystem for auth, validation, documentation
- Proven scalability for examination systems

**Alternatives Considered**:

- Express.js: Too minimal, would require significant boilerplate
- Fastify: Performance benefits but smaller ecosystem
- Koa.js: Less structured, harder to enforce architectural constraints

### Database Architecture: MongoDB + Redis

**Primary Database**: MongoDB with Mongoose ODM
**Rationale**:

- Document model fits exam/question structure naturally
- Flexible schema for evolving question types
- Strong indexing capabilities for performance requirements
- Proven at scale for educational platforms

**Caching Layer**: Redis
**Rationale**:

- Session state management for active exams
- Rate limiting implementation
- Queue management for async operations (AI, blockchain)
- Sub-second response times for exam session queries

### Authentication & Authorization

**JWT Strategy**: passport-jwt with @nestjs/passport
**Password Hashing**: argon2 (OWASP recommended)
**RBAC Implementation**: Custom guards with role decorators
**Rationale**:

- Stateless authentication supports horizontal scaling
- JWT payload can include exam session context
- Role-based access aligns with constitutional security requirements

### AI Proctoring Integration

**Architecture**: Separate Python service with NestJS gateway
**Communication**: HTTP API + Redis job queue
**Rationale**:

- Decouples AI processing from main application
- Python ecosystem superior for computer vision/ML
- Queue-based processing handles varying AI response times
- Failure isolation prevents exam disruption

**Alert Types Supported**:

- `face_mismatch`: Facial recognition discrepancy
- `multi_person`: Multiple faces detected
- `gaze_offscreen`: Student looking away from screen
- `device_detected`: Mobile/prohibited device in frame

### Blockchain Integration

**Network**: Sepolia Testnet (EVM-compatible)
**Standard**: ERC-721 NFT for certificates
**Library**: ethers.js v6
**Metadata Storage**: IPFS with Pinata/Infura
**Rationale**:

- ERC-721 provides unique, non-fungible certificate tokens
- IPFS ensures immutable metadata storage
- Sepolia provides free testing environment
- ethers.js offers comprehensive Ethereum integration

**Certificate Metadata Schema**:

```json
{
  "student": "encrypted_student_id",
  "course": "course_identifier",
  "exam": "exam_title",
  "score": "final_percentage",
  "issueDate": "ISO_timestamp",
  "verificationHash": "sha256_content_hash"
}
```

### Document Generation

**PDF Generation**: PDFKit for programmatic creation
**QR Codes**: qrcode library for verification links
**Templates**: Configurable certificate layouts
**Rationale**:

- PDFKit provides fine-grained control over certificate design
- QR codes enable instant mobile verification
- Template system supports institutional branding

### Logging & Monitoring

**Application Logging**: winston with structured JSON
**HTTP Logging**: morgan middleware
**Audit Trail**: Dedicated audit collection in MongoDB
**Rationale**:

- JSON logs enable structured querying and alerting
- Audit trail meets compliance requirements for education
- Performance monitoring supports constitutional reliability standards

### Security Measures

**Input Validation**: class-validator with whitelist/transform
**Rate Limiting**: express-rate-limit with Redis store
**CORS**: Configured for frontend domains only
**Headers**: helmet.js for security headers
**Environment**: dotenv with joi validation
**Rationale**:

- Defense in depth against common web vulnerabilities
- Rate limiting prevents exam system abuse
- Environment validation catches configuration errors early

### Development & Deployment

**Testing Framework**: Jest + Supertest
**Code Quality**: ESLint + Prettier
**API Documentation**: @nestjs/swagger
**Containerization**: Docker with multi-stage builds
**CI/CD**: GitHub Actions with test/build/deploy pipeline
**Rationale**:

- Jest ecosystem integrates seamlessly with NestJS
- Swagger documentation meets constitutional requirements
- Docker ensures consistent deployment environments

## Performance Considerations

### Database Indexing Strategy

**Required Indexes**:

- `users.email` (unique)
- `exams.code` (unique, sparse)
- `examSessions.userId + examId` (compound)
- `certificates.tokenId` (unique)
- `questions.examId` (for question retrieval)

### Caching Strategy

**Redis Usage**:

- Exam session state (TTL: exam duration + 1 hour)
- Rate limiting counters (TTL: 1 hour)
- User authentication tokens (TTL: JWT expiry)
- AI proctoring job queue (persistent until processed)

### API Response Targets

- Authentication: <100ms
- Exam question retrieval: <200ms
- Answer submission: <300ms
- Certificate verification: <500ms (includes blockchain query)

## Security Risk Analysis

### Exam Integrity Risks

**Risk**: Question bank exposure
**Mitigation**: Role-based question access, encrypted storage

**Risk**: Answer key leakage  
**Mitigation**: Separate answer storage, teacher-only access

**Risk**: Session hijacking
**Mitigation**: JWT with short expiry, IP validation

### Blockchain Risks

**Risk**: Private key exposure
**Mitigation**: Environment-based key management, HSM for production

**Risk**: Transaction failure during certificate issuance
**Mitigation**: Retry mechanism with idempotency, manual recovery process

**Risk**: Network congestion affecting issuance
**Mitigation**: Queue-based processing, status tracking

### AI Proctoring Risks

**Risk**: False positive cheating alerts
**Mitigation**: Teacher review interface, confidence scoring

**Risk**: Privacy concerns with webcam data
**Mitigation**: No video storage, real-time processing only

**Risk**: AI service unavailability
**Mitigation**: Graceful degradation, manual proctoring fallback

## Integration Architecture

### External Service Dependencies

1. **AI Proctoring Service** (Python/Flask)

   - Endpoint: `/analyze-frame`
   - Input: Base64 image, session context
   - Output: Alert array with confidence scores

2. **IPFS Gateway** (Pinata/Infura)

   - Certificate metadata upload
   - Content addressing for immutability

3. **Ethereum RPC** (Infura/Alchemy)

   - Smart contract interaction
   - Transaction broadcasting and monitoring

4. **Email Service** (SendGrid/AWS SES)
   - Account verification
   - Exam notifications
   - Certificate delivery

### Service Communication Patterns

- **Synchronous**: REST APIs for real-time operations
- **Asynchronous**: Redis queues for background processing
- **Event-driven**: WebSocket for exam session updates
- **Batch**: Scheduled jobs for cleanup and reporting

## Development Decision Summary

All technical decisions align with constitutional requirements:

- **Domain-Modular**: Clear module boundaries with minimal coupling
- **Layered**: Controller/Service/Repository pattern enforced
- **Spec-First**: This research follows specification-driven approach
- **Security**: Comprehensive validation and authentication strategy
- **Testing**: Jest framework supports >60% coverage requirement
- **Documentation**: Swagger integration provides required API docs

**Ready for Phase 1**: Data model design and API contract specification.
