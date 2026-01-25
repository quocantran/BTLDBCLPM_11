<!--
SYNC IMPACT REPORT
Version change: Initial creation → 1.0.0
Constitution scope: Backend system for online examinations with AI-powered proctoring and blockchain-based immutable certificates

Principles defined:
- I. Domain-Modular Architecture (modules organized by domain with clear boundaries)
- II. Layered Architecture (Controller → Service → Repository/Integration layering)
- III. Spec-First Development (NON-NEGOTIABLE - spec updates before code changes)
- IV. Security & Validation (input validation, RBAC, unified error handling)
- V. Testing & Documentation Standards (60% coverage, E2E tests, Swagger docs)

Sections added:
- Data & Infrastructure Requirements (MongoDB, Redis, IPFS, EVM-compatible blockchain)
- Development Workflow (trunk-based, CI pipeline, RESTful API with v1 prefix)
- Governance (amendment process, compliance review, semantic versioning)

Templates review status:
✅ plan-template.md - Constitution Check section aligns with new governance requirements
✅ spec-template.md - No changes needed, focuses on user requirements without implementation details
✅ tasks-template.md - TDD approach aligns with testing standards in constitution
✅ agent-file-template.md - Generic template structure compatible with domain-modular architecture

Follow-up TODOs: None - all placeholders resolved
-->

# EduChain Block Constitution

Backend system for online examinations with AI-powered proctoring and blockchain-based immutable certificates.

## Core Principles

### I. Domain-Modular Architecture

Modules MUST be organized by domain (auth, users, courses, exams, exam-sessions, certificates, verification, proctoring, blockchain). Each module MUST be self-contained with clear boundaries and minimal cross-dependencies.

**Rationale**: Domain-driven design ensures maintainability, testability, and team scalability as the examination platform grows.

### II. Layered Architecture

All modules MUST follow strict layering: Controller (I/O) → Service (business logic) → Repository/Integration (DB/queue/RPC). No layer SHALL directly access components beyond its immediate adjacent layer.

**Rationale**: Separation of concerns ensures code is testable, maintainable, and follows single responsibility principle.

### III. Spec-First Development (NON-NEGOTIABLE)

All major changes MUST update `specify.md` and `plan.md` before implementation. No code changes SHALL be merged without corresponding specification updates.

**Rationale**: Documentation-driven development ensures alignment, reduces rework, and maintains system coherence.

### IV. Security & Validation

Mandatory input validation using `class-validator` with whitelist and transform. Unified error response format via Global Exception Filter. Secrets MUST be loaded from ENV, never hardcoded. RBAC implementation required: `student`, `teacher`, `admin`.

**Rationale**: Educational platforms handle sensitive data requiring robust security measures and consistent error handling.

### V. Testing & Documentation Standards

Unit tests ≥ 60% coverage for core modules (auth, exams, sessions, certificates). E2E smoke tests required for main flows. Swagger docs MUST be maintained with version prefix `/docs`.

**Rationale**: Educational systems require high reliability; comprehensive testing and documentation ensure quality and maintainability.

## Data & Infrastructure Requirements

**Database**: MongoDB with Mongoose ODM. Queries MUST be indexed on exam codes, userId, examId for performance.
**Cache**: Redis for rate-limiting and session flags.
**Files**: IPFS for immutable certificate metadata storage.
**Blockchain**: EVM-compatible networks (Sepolia/Avalanche testnet) for certificate verification.

## Development Workflow

**Branching**: Trunk-based development (feature/\* → PR → main).
**CI Pipeline**: MUST include lint, test, build, dockerize stages.
**API**: RESTful JSON with `v1` prefix. Idempotency required for sensitive endpoints (certificate issuance).
**Performance**: Rate limiting by IP/user. AI proctoring service decoupled (Python), NestJS acts as gateway/queue receiver.
**Migrations**: Database migrations MUST be versioned and tracked.

## Governance

This constitution supersedes all other development practices and guidelines. All PRs and code reviews MUST verify compliance with these principles.

**Amendment Process**: Changes to this constitution require:

1. Documented justification for the change
2. Updated impact assessment on existing templates and workflows
3. Migration plan for affected code/practices
4. Team approval before implementation

**Compliance Review**: Regular audits MUST ensure adherence to architectural, security, and quality standards. Non-compliance issues SHALL be prioritized and resolved promptly.

**Versioning**: Constitution follows semantic versioning (MAJOR.MINOR.PATCH) where MAJOR = incompatible governance changes, MINOR = new principles/sections, PATCH = clarifications/refinements.

**Version**: 1.0.0 | **Ratified**: 2025-09-20 | **Last Amended**: 2025-09-20
