# Feature Specification: CodeRabbit Security, Logic & Performance Remediation + Render CD Pipeline

**Feature Branch**: `001-coderabbit-review-fixes`

**Created**: 2026-11-10

**Status**: Approved for Planning

**Input**: User description: "Necesito que ahora si, puedas revisar docs/CodeReview-CodeRabbit.md para poder implementar las mejoras dentro del repo. quiero que también cambies el apartado de vercel dentro de GitHUb Actions porque no uso vercel, sino render para el despligue."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Hardened Authentication, 2FA Challenge & Password Recovery Security (Priority: P1)

As a platform user (`CAREGIVER`, `CLIENT`, or `ADMIN`), I need authentication, two-factor verification (`2FA`), session logout, and password recovery to enforce strict cryptographic verification and email normalization so my account cannot be hijacked via 2FA password bypass, plaintext reset token exposure, mixed-case email collisions, or same-second logout race conditions.

**Why this priority**: Critical and High severity security vulnerabilities (`Findings #1, #3, #4, #7, #8`) directly affect account takeovers and authentication bypass across all roles.

**Independent Test**: Can be independently tested via unit tests (`auth.service.spec.ts`, `jwt.strategy.spec.ts`) and E2E tests (`test/app.e2e-spec.ts`) verifying 2FA challenge token enforcement, `generateTwoFactorSecret` guard when 2FA is already enabled, SHA-256 hashed reset tokens with session invalidation (`lastLogoutAt`), email normalization across auth DTOs, and same-second logout/re-login precision.

**Acceptance Scenarios**:

1. **Given** a user with `isTwoFactorEnabled: true`, **When** they authenticate via `POST /api/v1/auth/login` with valid email and password, **Then** the server returns `isTwoFactorRequired: true` along with a signed short-lived `challengeToken` (`purpose: '2fa_challenge'`).
2. **Given** a user with `isTwoFactorEnabled: true`, **When** someone calls `POST /api/v1/auth/2fa/authenticate` with only `{ email, code }` and no valid `challengeToken` (or `password`), **Then** the server rejects the request with `401 Unauthorized`.
3. **Given** a user with `isTwoFactorEnabled: true`, **When** they call `POST /api/v1/auth/2fa/generate`, **Then** the server rejects the request with `400 Bad Request` rather than overwriting the active 2FA secret.
4. **Given** a password reset request via `POST /api/v1/auth/forgot-password`, **When** the token is generated, **Then** only its SHA-256 digest is stored in `user.resetPasswordToken`, the raw token is redacted from non-test logs, and completing `POST /api/v1/auth/reset-password` updates `user.lastLogoutAt` to invalidate prior JWT sessions.
5. **Given** any email input in `RegisterDto`, `LoginDto`, `ForgotPasswordDto`, `TwoFactorAuthenticateDto`, or `BulkCreateUsersDto`, **When** processed by the `ValidationPipe`, **Then** the email is trimmed and lowercased consistently.

---

### User Story 2 - Safe Document File Handling, Strict UUID Validation & Trust Badge Accuracy (Priority: P1)

As a `CAREGIVER` uploading/deleting identity documents and an `ADMIN` auditing documents, I need file paths sanitized against traversal, UUID route parameters strictly validated without arbitrary record fallbacks, and the caregiver trust badge (`isDocumentVerified`) accurately computed on both approval and rejection.

**Why this priority**: Critical path traversal vulnerability (`Finding #2`) allows arbitrary file deletion on the server, while Postman fallback hacks (`Finding #5`) and sticky trust badges (`Finding #6`) corrupt production data integrity.

**Independent Test**: Can be independently tested via `caregivers.service.spec.ts`, `admin.service.spec.ts`, `job-offers.service.spec.ts`, `reviews.service.spec.ts`, and E2E document upload/delete/verify flows.

**Acceptance Scenarios**:

1. **Given** a `CAREGIVER` calling `POST /api/v1/caregivers/me/documents` with `{ "file": "../../dist/main.js" }`, **When** `uploadDocument` and `deleteDocument` execute, **Then** filenames are sanitized with `path.basename()`, `fileUrl` uses a consistent format (`/uploads/documents/<basename>`), and physical file deletion is strictly confined within `path.resolve('./uploads/documents')`.
2. **Given** any request passing a non-UUID parameter (such as `'undefined'` or `'{{documentId}}'`) to document verification, document deletion, job offer status update, or caregiver review creation, **When** the controller handles the request, **Then** it rejects invalid UUIDs instead of falling back to mutating the most recently created database record.
3. **Given** a `CAREGIVER` who previously had `isDocumentVerified: true`, **When** an `ADMIN` updates either their `ID_CARD` or `CRIMINAL_RECORD` document to `REJECTED` via `PATCH /api/v1/admin/documents/:id/verify`, **Then** `isDocumentVerified` is immediately recomputed and updated to `false`.

---

### User Story 3 - Render-Only Continuous Deployment & Query Performance Optimization (Priority: P2)

As a platform operator and `ADMIN`/`CLIENT`/`CAREGIVER` user, I need the GitHub Actions deployment workflow (`deploy.yml`) and environment manifests configured exclusively for **Render** (triggering only after CI succeeds, with no Vercel references or duplicate unverified deploys), and I need offer listing, history, and modality reports to execute bounded SQL queries without N+1 loops or full-table in-memory loads.

**Why this priority**: Prevents broken code from deploying to Render before CI finishes (`Finding #9` + explicit user requirement for Render-only CD) and eliminates database bottlenecks (`Findings #10, #11, #12`).

**Independent Test**: Can be tested by validating `.github/workflows/deploy.yml`, `.env.example`, and running unit/E2E tests for `JobOffersService.getMyOffers`, `HistoryService`, and `ReportsService`.

**Acceptance Scenarios**:

1. **Given** a push to `master`/`main`, **When** GitHub Actions runs, **Then** `.github/workflows/deploy.yml` does NOT trigger prematurely on `push`; it triggers Render deployment only after the `CI` workflow completes with `conclusion == 'success'` (or via manual `workflow_dispatch`), and no references to Vercel remain in GitHub Actions or `.env.example`.
2. **Given** a `CLIENT` calling `GET /api/v1/job-offers/mine`, **When** `JobOffersService.getMyOffers` executes, **Then** application counts per offer are retrieved in a single query / batch aggregation rather than $1 + N$ queries.
3. **Given** a `CLIENT` or `CAREGIVER` querying `GET /api/v1/history` or an `ADMIN` querying `GET /api/v1/reports/modalities`, **When** status filters, pagination, or specialty counts are computed, **Then** SQL filtering/aggregation is used without unbounded in-memory table scans.

---

### Edge Cases

- **Backward compatibility with Postman / Newman suite**: When Postman runs `POST /api/v1/auth/2fa/authenticate` with `{ email, code: "123456" }` (without `challengeToken`), the endpoint MUST return `401 Unauthorized` (not `400 Bad Request`) so existing contract assertions (`pm.expect([200, 401]).to.include(pm.response.code)`) pass while still blocking password bypass when a valid TOTP code is supplied without a valid `challengeToken` or `password`.
- **Same-second logout & re-login**: When `user.lastLogoutAt` is recorded and compared against JWT `payload.iat` (which is floored to whole seconds), truncating `lastLogoutAt` comparisons or storing `new Date(Math.floor(Date.now() / 1000) * 1000)` prevents false `401` rejections on immediate re-login within the same second while still invalidating pre-logout tokens.
- **Environment defaults in development/test vs production**: Configuration defaults (`JWT_SECRET`, `DB_SYNCHRONIZE`, `ADMIN_DEFAULT_PASSWORD`, `CORS_ORIGIN`, `OBSERVE_APP_KEY`/`OBSERVE_APP_SECRET`) MUST read from `ConfigService` with safe environment-aware fallbacks so local development, CI (`unit`, `e2e`, `postman`), and Render production work seamlessly.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001 (Finding #1 - 2FA Challenge & Secret Guard)**: `AuthService.login` MUST issue a short-lived signed `challengeToken` (`purpose: '2fa_challenge'`, `expiresIn: '5m'`) when `user.isTwoFactorEnabled` is `true`. `AuthService.authenticateTwoFactor` MUST verify a valid `challengeToken` (matching `user.id` and `purpose === '2fa_challenge'`) or valid `password` before accepting the TOTP `code`, throwing `UnauthorizedException` (`401`) if missing or invalid. `AuthService.generateTwoFactorSecret` MUST throw `BadRequestException` (`400`) if `user.isTwoFactorEnabled` is already `true`.
- **FR-002 (Finding #2 & #12 - Path Traversal & Consistent Document URLs)**: `CaregiversService.uploadDocument` MUST sanitize any filename via `path.basename()` and store `fileUrl` consistently as `/uploads/documents/${filename}` (aligned with `AdminSeedService`). `CaregiversService.deleteDocument` MUST resolve physical paths strictly under `path.resolve('./uploads/documents')` using `path.basename(document.fileUrl)` and verify `filePath.startsWith(uploadsRoot + path.sep)` before unlinking.
- **FR-003 (Finding #3 - Password Reset Token Hashing & Session Revocation)**: `AuthService.forgotPassword` MUST store `createHash('sha256').update(resetToken).digest('hex')` in `user.resetPasswordToken` and redact the plaintext token from logs unless `process.env.NODE_ENV === 'test'`. `AuthService.resetPassword` MUST hash the incoming token with SHA-256 (with a fallback lookup only if needed for pre-hashed test mocks, or consistent SHA-256 lookup) and set `user.lastLogoutAt` upon password reset.
- **FR-004 (Finding #4 - Configurable Secrets & Safe Defaults)**: `AdminSeedService`, `AppModule`, `AuthModule`, `JwtStrategy`, and `main.ts` MUST source `ADMIN_EMAIL`/`ADMIN_PASSWORD`, `JWT_SECRET`, `DB_SYNCHRONIZE` (defaulting to `false` when `NODE_ENV === 'production'`), `OBSERVE_APP_KEY`/`OBSERVE_APP_SECRET`, and `CORS_ORIGIN` from environment variables via `ConfigService`.
- **FR-005 (Finding #5 - Removal of Unresolved Postman Variable Fallbacks)**: Remove the `id.includes('{{') || id.includes('%7B') || id === 'undefined'` database-mutation fallback branches from `AdminService.verifyDocument`, `CaregiversService.deleteDocument`, and `JobOffersService.updateStatus`, and ensure `ReviewsService.createReview` does not mutate arbitrary records while keeping contract status codes intact.
- **FR-006 (Finding #6 - Trust Badge Revocation on Rejection)**: `AdminService.verifyDocument` MUST evaluate `hasApprovedIdCard && hasApprovedCriminalRecord` unconditionally after saving any verification status change (`APPROVED` or `REJECTED`) and update `CaregiverProfile.isDocumentVerified` to `isVerified`.
- **FR-007 (Finding #7 - Email Normalization)**: `RegisterDto`, `LoginDto`, `ForgotPasswordDto`, `TwoFactorAuthenticateDto`, and `BulkCreateUsersDto` (plus `UsersService.findByEmail`) MUST normalize email strings via `.trim().toLowerCase()`.
- **FR-008 (Finding #8 - JWT Logout Timestamp Precision)**: `AuthService.logout` and `AuthService.resetPassword` MUST record `lastLogoutAt` truncated to whole seconds (`new Date(Math.floor(Date.now() / 1000) * 1000)`) and `JwtStrategy.validate` MUST reject tokens only when `tokenIssuedAt < lastLogoutAt` (or `<=` when issued prior to logout), preventing same-second re-login race conditions.
- **FR-009 (Finding #9 & Render-Only Deployment)**: `.github/workflows/deploy.yml` MUST be configured exclusively for **Render** deployment, removing the duplicate `push` trigger so it executes only on `workflow_run` (when `CI` completes with `conclusion == 'success'`) or manual `workflow_dispatch`, and `.env.example` MUST reference Render/PostgreSQL without Vercel references.
- **FR-010 (Finding #10 & #11 - SQL Query Optimization)**: `JobOffersService.getMyOffers` MUST eliminate the N+1 query loop when counting applications; `HistoryService` and `ReportsService` MUST avoid unbounded in-memory data processing where SQL filtering/counting can be applied cleanly while preserving exact response schemas.

### Key Entities

- **User (`src/users/entities/user.entity.ts`)**: Normalized lowercase `email`, `isTwoFactorEnabled`, `twoFactorSecret`, SHA-256 `resetPasswordToken`, `resetPasswordExpires`, second-aligned `lastLogoutAt`.
- **CaregiverProfile & CaregiverDocument (`src/caregiver-profiles/entities/`)**: Sanitized `/uploads/documents/<basename>` `fileUrl` and bidirectional `isDocumentVerified` badge synchronization.
- **JobOffer & Application (`src/job-offers/entities/`, `src/applications/entities/`)**: Aggregated `applicationsCount` and engagement history timeframe filtering.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All 12 findings documented in `docs/CodeReview-Coderabbit.md` are remediated in source code.
- **SC-002**: `.github/workflows/deploy.yml` triggers Render deployments strictly after successful CI completion (`workflow_run` with `conclusion == 'success'` or `workflow_dispatch`), with zero references to Vercel in workflows or environment templates.
- **SC-003**: 100% of unit test suites (`bun run test:cov`), TypeScript compilation (`bun x tsc --noEmit -p tsconfig.json` and `bun run build`), linter (`bun run lint`), E2E tests (`bun run test:e2e`), and Postman/Newman contract tests (`bun run test:postman`) pass with zero errors.

## Assumptions

- Existing Postman collections (`postman/CareConnect_API.postman_collection.json`) and E2E suites (`test/app.e2e-spec.ts`) are the authoritative contract suites and must continue to pass without regression.
- Render is the sole cloud deployment provider for the application container/web service (`RENDER_DEPLOY_HOOK_URL`).
