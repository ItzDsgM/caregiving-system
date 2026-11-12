# Quickstart & Validation Guide: CodeRabbit Remediation & Render CD Pipeline

**Branch**: `001-coderabbit-review-fixes` | **Date**: 2026-11-10

## 1. Prerequisites

- **Runtime**: Node.js 24+ and Bun 1.x (`bun --version`)
- **Database**: PostgreSQL 16 running locally (`docker compose up -d postgres` or local instance on port `5432`)
- **Environment**: `.env` configured from `.env.example` (Render / local PostgreSQL configuration)

## 2. Verification Scenarios

### Scenario A: Static Analysis, Linting & Build Gate
Verify that all TypeScript types, strict compiler options, and Oxlint rules pass with zero errors:

```bash
bun x tsc --noEmit -p tsconfig.json
bun run lint
bun run build
```

### Scenario B: Unit Tests & Coverage Gate (Findings #1–#12)
Run the Jest unit test suite and coverage report to validate:
- 2FA challenge token requirement and `generateTwoFactorSecret` guard (`src/auth/auth.service.spec.ts`)
- SHA-256 reset token hashing, log redaction, and `lastLogoutAt` revocation (`src/auth/auth.service.spec.ts`, `src/auth/strategies/jwt.strategy.spec.ts`)
- Path traversal sanitization and removal of unresolved Postman variable fallbacks (`src/caregivers/caregivers.service.spec.ts`, `src/admin/admin.service.spec.ts`, `src/job-offers/job-offers.service.spec.ts`)
- Trust badge (`isDocumentVerified`) revocation on document rejection (`src/admin/admin.service.spec.ts`)
- Batch application counting and SQL query optimizations (`src/job-offers/job-offers.service.spec.ts`, `src/history/history.service.spec.ts`, `src/reports/reports.service.spec.ts`)

```bash
bun run test:cov
```

### Scenario C: End-to-End (E2E) Integration Suite
Run the Supertest E2E suite against PostgreSQL to validate the full lifecycle (including 2FA login challenge -> `2fa/authenticate`, same-second logout/re-login, document audit badge updates, and history/reports):

```bash
bun run test:e2e
```

### Scenario D: Postman / Newman Contract Suite
Start the compiled server and run the automated Newman collection assertions:

```bash
bun run test:postman
```

### Scenario E: Render CD Workflow Inspection
Verify `.github/workflows/deploy.yml` and `.env.example`:
- Confirm `deploy.yml` triggers only on `workflow_run` (`CI` completed with `conclusion == 'success'`) and `workflow_dispatch`.
- Confirm zero references to Vercel exist in `.github/workflows/` or `.env.example`.
