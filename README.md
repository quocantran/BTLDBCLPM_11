# Academix

Transparent online examination platform with role-based access, automatic grading, realtime notifications, AI-assisted face checks, and certificate verification.

## 1) What this system does

Main capabilities found in current codebase:

- Authentication and authorization (student, teacher, admin)
- User profile update and password reset by email
- Course management and enrollment flows
- Exam creation, scheduling, joining, submission, and grading
- Teacher/student dashboards with summary statistics
- Realtime notifications via Socket.IO
- Certificate issuance pipeline
  - generate certificate image
  - upload certificate image and metadata to IPFS (Pinata)
  - mint certificate NFT metadata reference on blockchain
- Public certificate verification API and public verification page

## 2) Project structure

- backend: NestJS API + MongoDB
- frontend: Next.js app (React 19 + Ant Design)
- specs: feature specs/plans/contracts documents

## 3) Prerequisites

- Node.js 20+ (recommended)
- npm 10+ (or compatible)
- MongoDB 7+ (local or remote)

Optional for full features:

- SMTP account for sending password reset email
- Gemini API key for AI image validation/face comparison endpoints
- Pinata API keys for IPFS upload
- Blockchain wallet private key + RPC endpoint for on-chain certificate minting

## 4) Environment files

Created files:

- backend/.env
- frontend/.env.local

### 4.1 Backend environment variables

Required to boot backend:

- NODE_ENV
- PORT
- API_PREFIX
- CORS_ORIGINS
- MONGODB_URI

Strongly recommended for security:

- JWT_SECRET
- JWT_REFRESH_SECRET
- JWT_EXPIRES_IN
- JWT_REFRESH_EXPIRES_IN

Optional by feature:

- Password reset email:
  - PASSWORD_RESET_URL
  - PASSWORD_RESET_TOKEN_TTL
  - PASSWORD_RESET_MAX_REQUESTS
  - EMAIL_SENDER_NAME
  - EMAIL_SENDER_ADDRESS
  - SMTP_HOST
  - SMTP_PORT
  - SMTP_SECURE
  - SMTP_USER
  - SMTP_PASS
- AI face/image endpoints:
  - GEMINI_API_KEY
- IPFS upload:
  - PINATA_API_KEY
  - PINATA_API_SECRET
  - PINATA_GATEWAY_URL
- Blockchain writes:
  - BLOCKCHAIN_RPC_URL
  - BLOCKCHAIN_PRIVATE_KEY
  - BLOCKCHAIN_CHAIN_ID
  - CONTRACT_ADDRESS

Important behavior from code:

- Missing SMTP config: app still runs, password reset emails are logged instead of sent.
- Missing PINATA_*: app still runs, certificate IPFS upload fails and service uses placeholder hash fallback.
- Missing BLOCKCHAIN_PRIVATE_KEY: app still runs, blockchain read works, write/mint operations fail.
- Missing GEMINI_API_KEY: app still runs, AI-based image validation/face verification endpoints fail.

### 4.2 Frontend environment variables

Required:

- NEXT_PUBLIC_API_ENDPOINT
- NEXT_PUBLIC_API_INTERNAL_ENDPOINT

Optional:

- NEXT_PUBLIC_NOTIFICATIONS_WS_ENDPOINT
- NEXT_PUBLIC_SOCKET_ENDPOINT

Important:

- This code expects NEXT_PUBLIC_API_ENDPOINT to include backend prefix, for example:
  - http://localhost:8000/api/v1

## 5) API keys and cost (practical summary)

### 5.1 Is paid API key required to run project?

No, not for basic local startup.

- You can run backend + frontend + MongoDB without paid keys.
- Paid/external keys are only needed for advanced features (AI, IPFS upload, blockchain writes, production email sending).

### 5.2 Service-by-service

- Gemini API (GEMINI_API_KEY)
  - Used for profile image validation and face verification endpoints.
  - Usually has a free tier in Google AI Studio for development/testing.
  - Paid usage depends on model, region, and quota.
- Pinata (PINATA_API_KEY/PINATA_API_SECRET)
  - Used to pin certificate image/metadata to IPFS.
  - Pinata typically provides a free plan with limits.
- Blockchain RPC + private key
  - Current default RPC points to Avalanche Fuji testnet public endpoint.
  - Testnet usage can be zero-cost except rate limits.
  - You still need testnet tokens for writing transactions.
- SMTP (SMTP_*)
  - Can be free (Gmail app password, Mailtrap free tier, etc.) for dev scale.

### 5.3 Free for students?

In many cases: yes, for development/testing.

- Gemini: free-tier quotas are commonly available.
- Pinata: free plan often available.
- Blockchain testnet: free testnet faucets exist.
- SMTP: free dev tiers exist.

Always check each provider policy and pricing page because quotas change over time.

## 6) Run locally (step-by-step)

### 6.1 Backend

```bash
cd backend
npm install
npm run start:dev
```

Backend URLs:

- API root: http://localhost:8000/
- Swagger docs: http://localhost:8000/docs
- Health endpoint: http://localhost:8000/api/v1/health

Optional seed data:

```bash
cd backend
npm run seed
```

### 6.2 Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend URL:

- http://localhost:3000

Public certificate verification page:

- http://localhost:3000/certificate-verify

## 7) Minimal setup vs full setup

### Minimal (fastest success)

Needed:

- MongoDB running
- backend/.env with MONGODB_URI and JWT secrets
- frontend/.env.local with API endpoint values

Result:

- Core auth/course/exam/dashboard/notification flows can run
- AI/IPFS/on-chain advanced features are limited

### Full feature setup

Add valid values for:

- GEMINI_API_KEY
- PINATA_API_KEY
- PINATA_API_SECRET
- BLOCKCHAIN_PRIVATE_KEY (+ funded testnet wallet)
- SMTP_HOST/SMTP_USER/SMTP_PASS

## 8) Notes and caveats from current code

- Backend loads env from backend/.env (ConfigModule envFilePath is .env).
- Frontend helper/service paths assume NEXT_PUBLIC_API_ENDPOINT already contains /api/v1.
- A blockchain config file exists, but BlockchainService reads uppercase keys directly; keep uppercase keys in backend/.env.

## 9) Quick troubleshooting

- 401/invalid token:
  - check JWT_SECRET and JWT_REFRESH_SECRET are set and consistent
- Frontend cannot call backend:
  - verify NEXT_PUBLIC_API_ENDPOINT is exactly http://localhost:8000/api/v1
  - verify CORS_ORIGINS includes http://localhost:3000
- Password reset email not sent:
  - check SMTP_HOST/SMTP_USER/SMTP_PASS
  - if missing, backend only logs email content
- Certificate mint/upload issues:
  - check PINATA_* and BLOCKCHAIN_PRIVATE_KEY
  - verify wallet has testnet balance and RPC is reachable
