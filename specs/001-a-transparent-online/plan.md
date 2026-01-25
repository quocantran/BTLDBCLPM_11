# Implementation Plan: Online Examination Platform with AI Proctoring and Blockchain Certificates

**Branch**: `001-a-transparent-online` | **Date**: 2025-09-20 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-a-transparent-online/spec.md`

## Execution Flow (/plan command scope)

```
1. Load feature spec from Input path
   → ✅ Feature spec loaded successfully
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → ✅ Project Type: Web backend (NestJS API server)
   → ✅ Structure Decision: Single backend project with modular architecture
3. Fill the Constitution Check section based on the content of the constitution document.
   → ✅ Constitution requirements identified and mapped
4. Evaluate Constitution Check section below
   → ✅ No violations found, approach aligns with constitutional principles
   → ✅ Progress Tracking: Initial Constitution Check PASSED
5. Execute Phase 0 → research.md
   → ✅ Technical decisions documented
6. Execute Phase 1 → contracts, data-model.md, quickstart.md
   → ✅ Design artifacts generated
7. Re-evaluate Constitution Check section
   → ✅ Post-design review confirms constitutional compliance
   → ✅ Progress Tracking: Post-Design Constitution Check PASSED
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
   → ✅ Task generation strategy defined
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 8. Phases 2-4 are executed by other commands:

- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary

Primary requirement: Transparent online examination platform with AI-driven anti-cheating and blockchain-issued immutable certificates. Technical approach: NestJS backend with modular domain architecture, MongoDB for persistence, Redis for caching/queues, separate Python AI proctoring service, and EVM blockchain integration for certificate issuance.

## Technical Context

**Language/Version**: Node.js 20+, TypeScript 5.x, NestJS 10.x
**Primary Dependencies**: @nestjs/core, @nestjs/mongoose, @nestjs/passport, @nestjs/swagger, mongoose, passport-jwt, argon2, winston, bullmq, ethers.js, pdfkit, qrcode
**Storage**: MongoDB (primary), Redis (cache/queue), IPFS (certificate metadata)
**Testing**: Jest (unit), Supertest (integration), @nestjs/testing
**Target Platform**: Linux server, Docker containerized
**Project Type**: Single backend API server with domain-modular architecture
**Performance Goals**: <200ms API response time, support 1000+ concurrent exam sessions
**Constraints**: GDPR compliance, immutable certificate records, real-time proctoring
**Scale/Scope**: 10k+ users, multi-tenant course management, blockchain transaction processing

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### I. Domain-Modular Architecture ✅

- **Compliance**: Modules organized by domain: auth, users, courses, exams, exam-sessions, certificates, verification, proctoring, blockchain
- **Implementation**: Each module self-contained with clear boundaries, minimal cross-dependencies

### II. Layered Architecture ✅

- **Compliance**: Strict Controller → Service → Repository layering enforced
- **Implementation**: Controllers handle I/O, Services contain business logic, Repositories manage data access

### III. Spec-First Development ✅

- **Compliance**: Feature specification created before implementation planning
- **Implementation**: This plan.md follows spec.md, all changes will update specifications first

### IV. Security & Validation ✅

- **Compliance**: Input validation with class-validator, JWT auth, RBAC (student/teacher/admin)
- **Implementation**: Global ValidationPipe, exception filters, environment-based secrets

### V. Testing & Documentation ✅

- **Compliance**: ≥60% unit test coverage for core modules, E2E tests, Swagger docs
- **Implementation**: Jest/Supertest testing, @nestjs/swagger with /docs endpoint

### Infrastructure Requirements ✅

- **Database**: MongoDB with indexed queries (examId, userId, exam codes)
- **Cache**: Redis for rate-limiting and session management
- **Files**: IPFS for certificate metadata storage
- **Blockchain**: EVM-compatible (Sepolia testnet)

## Project Structure

### Documentation (this feature)

```
specs/001-a-transparent-online/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)

```
# NestJS Backend Project Structure
src/
├── auth/               # Authentication module
├── users/              # User management module
├── courses/            # Course management module
├── exams/              # Exam definition module
├── exam-sessions/      # Active exam session module
├── certificates/       # Certificate issuance module
├── verification/       # Certificate verification module
├── proctoring/         # AI proctoring gateway module
├── blockchain/         # Blockchain integration module
├── common/             # Shared utilities and guards
├── config/             # Environment configuration
└── main.ts            # Application bootstrap

test/
├── unit/              # Unit tests by module
├── integration/       # Integration tests
└── e2e/              # End-to-end tests
```

## Progress Tracking

### Phase 0: Research ✅

- [x] Technical stack decisions documented
- [x] Architecture patterns selected
- [x] External integrations identified
- [x] Security considerations mapped

### Phase 1: Design ✅

- [x] Data model specifications created with 7 collections and optimized indexes
- [x] API contracts defined for all 8 domain modules with comprehensive endpoint specifications
- [x] Development quickstart guide written with environment setup and development workflow
- [x] Constitutional compliance verified across all architectural decisions

**API Contract Coverage**:

- [x] [auth-contracts.md](./contracts/auth-contracts.md) - Authentication, authorization, user management (15+ endpoints)
- [x] [courses-contracts.md](./contracts/courses-contracts.md) - Course/exam management, AI question generation (20+ endpoints)
- [x] [exam-session-contracts.md](./contracts/exam-session-contracts.md) - Exam taking, submission, monitoring (12+ endpoints)
- [x] [proctoring-contracts.md](./contracts/proctoring-contracts.md) - AI proctoring integration, real-time monitoring (8+ endpoints)
- [x] [certificates-contracts.md](./contracts/certificates-contracts.md) - Certificate lifecycle, blockchain issuance (10+ endpoints)
- [x] [verification-contracts.md](./contracts/verification-contracts.md) - Public certificate verification (6+ endpoints)
- [x] [blockchain-contracts.md](./contracts/blockchain-contracts.md) - Blockchain operations, IPFS integration (15+ endpoints)
- [x] [admin-contracts.md](./contracts/admin-contracts.md) - Administrative functions, system management (20+ endpoints)

### Phase 2: Task Generation (Planned)

- [ ] Module implementation tasks defined
- [ ] Test-first development workflow established
- [ ] Integration milestones identified
- [ ] Deployment pipeline steps outlined

## Complexity Tracking

**Low Complexity Areas**:

- Standard CRUD operations for users, courses, exams
- JWT-based authentication with NestJS guards
- MongoDB integration with Mongoose

**Medium Complexity Areas**:

- Exam session state management with Redis
- File upload and IPFS integration
- API rate limiting and security middleware

**High Complexity Areas**:

- Real-time AI proctoring integration (requires separate Python service)
- Blockchain certificate issuance with retry/idempotency
- Exam timer and submission handling with network resilience

**Risk Mitigation**:

- AI proctoring service decoupled via message queue
- Blockchain operations wrapped with circuit breaker pattern
- Exam sessions designed with offline recovery capabilities

## Phase 2 Task Generation Strategy

The /tasks command will generate implementation tasks following TDD principles and comprehensive cross-references to our specification files:

### Task Granularity

- **Configuration Tasks**: Environment setup, dependency installation, configuration files
- **Database Tasks**: Schema creation using [data-model.md](./data-model.md) collections, migration scripts, index optimization
- **Service Implementation**: Core business logic following domain contract specifications, validation, error handling
- **API Implementation**: Controller methods implementing [contracts/](./contracts/) endpoints, routing, middleware integration
- **Integration Tasks**: External service connections per [research.md](./research.md) architecture, webhook handlers
- **Testing Tasks**: Unit tests, integration tests covering API contract scenarios, end-to-end scenarios
- **Documentation Tasks**: API docs extending contract specifications, deployment guides, troubleshooting

### Implementation Sequence

The tasks will be generated to follow constitutional layered architecture:

1. **Infrastructure Layer**:

   - Database schemas from [data-model.md](./data-model.md) collections (Users, Courses, Exams, etc.)
   - Configurations per [research.md](./research.md) technology decisions
   - External integrations (MongoDB, Redis, IPFS, Blockchain network)

2. **Domain Layer**:

   - Core business logic implementing entities from [data-model.md](./data-model.md)
   - Domain services handling business rules from [spec.md](./spec.md) requirements
   - AI proctoring integration per [contracts/proctoring-contracts.md](./contracts/proctoring-contracts.md)

3. **Application Layer**:

   - Use cases orchestrating domain services
   - Transaction management for exam sessions and certificate issuance
   - Business logic from [spec.md](./spec.md) functional requirements

4. **API Layer**:

   - Controllers implementing all endpoint specifications:
     - [contracts/auth-contracts.md](./contracts/auth-contracts.md) - Authentication & authorization
     - [contracts/courses-contracts.md](./contracts/courses-contracts.md) - Course & exam management
     - [contracts/exam-session-contracts.md](./contracts/exam-session-contracts.md) - Exam taking & monitoring
     - [contracts/proctoring-contracts.md](./contracts/proctoring-contracts.md) - AI proctoring integration
     - [contracts/certificates-contracts.md](./contracts/certificates-contracts.md) - Certificate lifecycle
     - [contracts/verification-contracts.md](./contracts/verification-contracts.md) - Public verification
     - [contracts/blockchain-contracts.md](./contracts/blockchain-contracts.md) - Blockchain operations
     - [contracts/admin-contracts.md](./contracts/admin-contracts.md) - Administrative functions
   - DTOs matching contract request/response schemas
   - Validation implementing contract parameter specifications
   - Error handling per contract error response definitions

5. **Integration Layer**:
   - External services per [research.md](./research.md) integration patterns
   - Blockchain integration following [contracts/blockchain-contracts.md](./contracts/blockchain-contracts.md)
   - AI proctoring service gateway per [contracts/proctoring-contracts.md](./contracts/proctoring-contracts.md)
   - IPFS metadata storage for certificates
   - WebSocket handlers for real-time proctoring monitoring

### Cross-Module Dependencies

Task generation will account for dependencies between domain modules and their contract implementations:

- **Authentication Foundation** ([auth-contracts.md](./contracts/auth-contracts.md)): Must be implemented before all protected endpoints across modules
- **User Management Base** ([auth-contracts.md](./contracts/auth-contracts.md) user endpoints): Enables course assignment and exam participation
- **Course & Exam Setup** ([courses-contracts.md](./contracts/courses-contracts.md)): Required before exam sessions can be created
- **Exam Session Core** ([exam-session-contracts.md](./contracts/exam-session-contracts.md)): Depends on courses, exams, and user authentication
- **Proctoring Integration** ([proctoring-contracts.md](./contracts/proctoring-contracts.md)): Integrates with exam sessions for monitoring
- **Certificate Issuance** ([certificates-contracts.md](./contracts/certificates-contracts.md)): Requires completed exam sessions and blockchain setup
- **Verification Services** ([verification-contracts.md](./contracts/verification-contracts.md)): Depends on issued certificates and blockchain data
- **Blockchain Infrastructure** ([blockchain-contracts.md](./contracts/blockchain-contracts.md)): Foundational for certificate operations
- **Administrative Tools** ([admin-contracts.md](./contracts/admin-contracts.md)): Supports all modules with management capabilities

### Implementation Reference Guide

Each implementation task will reference:

- **Data Models**: Specific collections from [data-model.md](./data-model.md)
- **API Contracts**: Endpoint specifications from [contracts/](./contracts/) directory
- **Architecture Decisions**: Technology choices from [research.md](./research.md)
- **Business Requirements**: Functional requirements from [spec.md](./spec.md)
- **Constitutional Compliance**: Principles from [constitution.md](../memory/constitution.md)

Tasks will be marked for parallel execution where modules are independent, with clear dependency chains for sequential work.
