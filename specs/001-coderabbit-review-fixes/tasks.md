---

description: "Hyper-specific executable task list for CodeRabbit remediation & Render CD pipeline (optimized for 3.8 Flash execution)"
---

# Tasks: CodeRabbit Security, Logic & Performance Remediation + Render CD Pipeline

**Input**: Design documents from `/specs/001-coderabbit-review-fixes/` (`plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/api-and-ci-contracts.md`, `quickstart.md`) and `.specify/memory/constitution.md` (`v1.0.0`)

**Prerequisites**: `plan.md` (required), `spec.md` (required for user stories), `research.md`, `data-model.md`, `contracts/api-and-ci-contracts.md`

**Tests**: Included per Constitution Principle IV (`Multi-Layer Testing & Quality Gates (NON-NEGOTIABLE)`) and `spec.md` (`SC-003`).

**Organization**: Tasks are grouped by user story (`US1`, `US2`, `US3`) with explicit file paths, exact method names, and verbatim code constraints so a fast model (`3.8 Flash`) can execute each step deterministically without additional context.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (`[US1]`, `[US2]`, `[US3]`)
- Every task includes exact repository-relative file paths and concrete implementation instructions

## Path Conventions

- **Single project**: `src/`, `test/`, `postman/`, `.github/workflows/`, and `.env.example` at repository root

---

## Phase 1: Setup (Environment & Shared Configuration)

**Purpose**: Align environment templates and shared runtime configuration with Render Cloud deployment and configurable security defaults (Finding #4 & Render requirement).

- [X] T001 Update `.env.example` to remove `Vercel Postgres` from line 14 (change comment to `# Database Configuration (Option B: Connection String - Cloud Providers like Render PostgreSQL, Neon, Supabase)`) and append documented defaults for `CORS_ORIGIN=*`, `ADMIN_EMAIL=admin@careconnect.com`, `ADMIN_PASSWORD=AdminSecret123!`, `ADMIN_AUTO_SEED=true`, `OBSERVE_APP_KEY=YOUR_APP_KEY`, and `OBSERVE_APP_SECRET=YOUR_APP_SECRET` in `.env.example`
- [X] T002 [P] Update `bootstrap()` in `src/main.ts` (lines 31–37) so `app.enableCors` reads `process.env.CORS_ORIGIN`: if `process.env.CORS_ORIGIN` is set and not `'*'`, pass `origin: process.env.CORS_ORIGIN.split(',').map((o) => o.trim())`, otherwise keep `origin: true` for local/test compatibility in `src/main.ts`
- [X] T003 [P] Update `AppModule` in `src/app.module.ts` (lines 75–94) so `synchronize` defaults to `process.env.NODE_ENV !== 'production'` when `DB_SYNCHRONIZE` is not explicitly set (`configService.get<string>('DB_SYNCHRONIZE') ? configService.get<string>('DB_SYNCHRONIZE') === 'true' : process.env.NODE_ENV !== 'production'`), and `ObserveModule.forRoot` reads `process.env.OBSERVE_APP_KEY ?? 'YOUR_APP_KEY'` and `process.env.OBSERVE_APP_SECRET ?? 'YOUR_APP_SECRET'` in `src/app.module.ts`

---

## Phase 2: Foundational (Core Auth Config & Admin Boot Seeding Guards)

**Purpose**: Establish environment-aware JWT secret resolution and configurable admin boot seeding before user story work begins (Finding #4).

**⚠️ CRITICAL**: Complete this phase before starting User Stories 1, 2, and 3.

- [X] T004 [P] Update `AuthModule` in `src/auth/auth.module.ts` (lines 19–27) so `useFactory` reads `const secret = configService.get<string>('JWT_SECRET'); if (!secret && process.env.NODE_ENV === 'production') { throw new Error('JWT_SECRET environment variable is required in production'); }` and falls back to `'super_secret_jwt_key_change_in_production'` only in non-production environments in `src/auth/auth.module.ts`
- [X] T005 [P] Update `JwtStrategy` constructor in `src/auth/strategies/jwt.strategy.ts` (lines 16–28) with the same production guard (`const secret = configService.get<string>('JWT_SECRET'); if (!secret && process.env.NODE_ENV === 'production') { throw new Error('JWT_SECRET environment variable is required in production'); }`) and fallback `'super_secret_jwt_key_change_in_production'` in `src/auth/strategies/jwt.strategy.ts`
- [X] T006 [P] Update `AdminSeedService` in `src/admin/admin-seed.service.ts` (lines 25–68) to skip `seedAdmin()` inside `onApplicationBootstrap()` when `process.env.ADMIN_AUTO_SEED === 'false'`, and inside `seedAdmin()` read `const adminEmail = (process.env.ADMIN_EMAIL ?? 'admin@careconnect.com').trim().toLowerCase()` and `const adminPassword = process.env.ADMIN_PASSWORD ?? 'AdminSecret123!'` in `src/admin/admin-seed.service.ts`

**Checkpoint**: Foundational configuration guards are in place; User Story phases can now execute.

---

## Phase 3: User Story 1 - Hardened Authentication, 2FA Challenge & Password Recovery Security (Priority: P1) 🎯 MVP

**Goal**: Prevent 2FA password bypass (`Finding #1`), protect active 2FA secrets from overwrite (`Finding #1`), hash password reset tokens with SHA-256 and redact non-test logs (`Finding #3`), normalize email casing across all auth/user flows (`Finding #7`), and eliminate the same-second JWT `iat` vs `lastLogoutAt` race condition (`Finding #8`).

**Independent Test**: Run `bun x jest src/auth/ src/users/` and verify all unit tests pass for 2FA challenge verification, secret overwrite blocking, SHA-256 reset token hashing, email normalization, and same-second logout/re-login precision.

### Implementation for User Story 1

- [X] T007 [P] [US1] Add `@Transform(({ value }: { value: string }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))` from `class-transformer` to the `email` property in `src/auth/dtos/register.dto.ts` (lines 18–20)
- [X] T008 [P] [US1] Add `@Transform(({ value }: { value: string }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))` from `class-transformer` to the `email` property in `src/auth/dtos/login.dto.ts` (lines 10–12)
- [X] T009 [P] [US1] Add `@Transform(({ value }: { value: string }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))` from `class-transformer` to the `email` property in `src/auth/dtos/forgot-password.dto.ts` (lines 10–12)
- [X] T010 [P] [US1] Add `@Transform(({ value }: { value: string }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))` from `class-transformer` to the `email` property of `AdminCreateUserItemDto` in `src/admin/dtos/bulk-create-users.dto.ts` (lines 18–21)
- [X] T011 [P] [US1] Update `TwoFactorAuthenticateDto` in `src/auth/dtos/two-factor.dto.ts` (lines 23–42) to import `ApiPropertyOptional` from `@nestjs/swagger` and `IsOptional` from `class-validator`, and add two optional fields: `challengeToken?: string` (`@ApiPropertyOptional({ description: 'Short-lived 2FA challenge token returned by POST /api/v1/auth/login' }) @IsOptional() @IsString()`) and `password?: string` (`@ApiPropertyOptional({ description: 'Account password if challengeToken is not provided' }) @IsOptional() @IsString()`) in `src/auth/dtos/two-factor.dto.ts`
- [X] T012 [P] [US1] Normalize `email` parameter in `UsersService.findByEmail` (line 39) and `UsersService.findByEmailWith2faSecret` (line 100) using `const normalizedEmail = email?.trim().toLowerCase();` before querying `this.usersRepository` in `src/users/users.service.ts`
- [X] T013 [US1] Update `AuthService` in `src/auth/auth.service.ts` to implement all 4 security fixes in `src/auth/auth.service.ts`:
  1. Import `createHash` alongside `randomBytes` from `'crypto'` (line 13).
  2. In `login()` (lines 200–221):
     - If `user.lastLogoutAt` is set and falls in the current whole second (`const nowSec = Math.floor(Date.now() / 1000); const logoutSec = Math.floor(new Date(user.lastLogoutAt).getTime() / 1000); if (logoutSec >= nowSec)`), set `user.lastLogoutAt = new Date((nowSec - 1) * 1000)` and `await this.usersService.save(user)` so a newly signed token at `iat = nowSec` is not rejected as logged out.
     - When `user.isTwoFactorEnabled` is `true`, sign a challenge token `const challengeToken = await this.jwtService.signAsync({ sub: user.id, email: user.email, purpose: '2fa_challenge' }, { expiresIn: '5m' });` and return `{ isTwoFactorRequired: true, email: user.email, challengeToken, message: 'Two-factor authentication code required. Submit code to /api/v1/auth/2fa/authenticate' }`.
  3. In `generateTwoFactorSecret()` (lines 230–241): check `if (user.isTwoFactorEnabled) { throw new BadRequestException('Two-factor authentication is already enabled'); }` before generating or overwriting `user.twoFactorSecret`.
  4. In `authenticateTwoFactor()` (lines 325–358):
     - Verify first-factor proof before accepting TOTP:
       - If `dto.challengeToken` is provided, call `const decoded = await this.jwtService.verifyAsync<{ sub: string; purpose?: string }>(dto.challengeToken)` inside a `try/catch` and verify `decoded?.purpose === '2fa_challenge' && decoded?.sub === user.id`; on failure throw `new UnauthorizedException('Invalid or expired 2FA challenge token')`.
       - Else if `dto.password` is provided, verify `await bcrypt.compare(dto.password, user.password)`; if false throw `new UnauthorizedException('Invalid 2FA credentials')`.
       - Else (neither `challengeToken` nor `password` provided), throw `new UnauthorizedException('Two-factor authentication requires a valid challengeToken or password')`.
     - Apply the same `lastLogoutAt` same-second adjustment (`if (logoutSec >= nowSec)`) if `user.lastLogoutAt` is present before issuing `access_token`.
  5. In `logout()` (lines 367–375): set `user.lastLogoutAt = new Date(Math.floor(Date.now() / 1000) * 1000);` (floored to whole seconds).
  6. In `forgotPassword()` (lines 384–407): hash the generated token via `const hashedToken = createHash('sha256').update(resetToken).digest('hex');`, store `user.resetPasswordToken = hashedToken;`, and only log the raw `resetToken` when `process.env.NODE_ENV === 'test'` (`if (process.env.NODE_ENV === 'test') { this.logger.log(\`Password reset requested for email: \${user.email}. Token generated: \${resetToken}\`); } else { this.logger.log(\`Password reset requested for email: \${user.email}.\`); }`).
  7. In `resetPassword()` (lines 417–441): compute `const hashedToken = createHash('sha256').update(resetPasswordDto.token).digest('hex');`, look up `let user = await this.usersService.findByResetToken(hashedToken); if (!user) { user = await this.usersService.findByResetToken(resetPasswordDto.token); }`, and upon resetting password set `user.lastLogoutAt = new Date(Math.floor(Date.now() / 1000) * 1000);` before `await this.usersService.save(user)`.
- [X] T014 [US1] Update `JwtStrategy.validate` in `src/auth/strategies/jwt.strategy.ts` (lines 48–56) to compare timestamps at whole-second precision: `const tokenIssuedAtSec = payload.iat; const lastLogoutAtSec = Math.floor(new Date(user.lastLogoutAt).getTime() / 1000); if (tokenIssuedAtSec <= lastLogoutAtSec)` throw `new UnauthorizedException('Session expired or logged out. Please log in again.')` in `src/auth/strategies/jwt.strategy.ts`
- [X] T015 [P] [US1] Update Swagger documentation on `login` and `authenticateTwoFactor` in `src/auth/auth.controller.ts` (lines 140–210 and 365–385) to document `challengeToken` in the 2FA login response and `2fa/authenticate` request body in `src/auth/auth.controller.ts`
- [X] T016 [US1] Update unit tests in `src/auth/auth.service.spec.ts` and `src/auth/strategies/jwt.strategy.spec.ts` to cover: (a) `login` returning `challengeToken` when 2FA is enabled, (b) `authenticateTwoFactor` succeeding with valid `challengeToken` or `password` and throwing `UnauthorizedException` when missing/invalid, (c) `generateTwoFactorSecret` throwing `BadRequestException` when `isTwoFactorEnabled` is `true`, (d) `forgotPassword` storing the SHA-256 hash of `resetToken` and `resetPassword` setting `lastLogoutAt`, and (e) `JwtStrategy.validate` handling second-granularity `lastLogoutAt` checks in `src/auth/auth.service.spec.ts` and `src/auth/strategies/jwt.strategy.spec.ts`

**Checkpoint**: User Story 1 is complete and independently verifiable via `bun x jest src/auth/ src/users/`.

---

## Phase 4: User Story 2 - Safe Document File Handling, Strict UUID Validation & Trust Badge Accuracy (Priority: P1)

**Goal**: Eliminate path traversal file deletion (`Finding #2`), normalize document `fileUrl` prefixes (`Finding #12`), remove dangerous unresolved Postman variable fallbacks from mutation services (`Finding #5`), and ensure `CaregiverProfile.isDocumentVerified` is revoked when an approved document is later rejected (`Finding #6`).

**Independent Test**: Run `bun x jest src/caregivers/ src/admin/ src/job-offers/ src/reviews/` and verify all unit tests pass.

### Implementation for User Story 2

- [X] T017 [P] [US2] Update `CaregiversService.uploadDocument` and `CaregiversService.deleteDocument` in `src/caregivers/caregivers.service.ts` (lines 83–187):
  1. In `uploadDocument`: sanitize `const rawFilename = file?.filename || uploadDto?.file;` using `const filename = rawFilename ? path.basename(rawFilename.trim()) : '';` and if `!filename || filename === '.' || filename === '..'` throw `new BadRequestException('A valid file is required for document upload')`. Keep `const fileUrl = \`/uploads/documents/\${filename}\`;`.
  2. In `deleteDocument`: remove the `if (documentId.includes('{{') || documentId.includes('%7B') || documentId === 'undefined')` fallback block (lines 133–154) and query solely `const document = await this.documentRepository.findOne({ where: { id: documentId } });`.
  3. In `deleteDocument` physical file removal (lines 173–182): compute `const uploadsRoot = path.resolve('./uploads/documents'); const safeFileName = path.basename(document.fileUrl); const filePath = path.resolve(uploadsRoot, safeFileName);` and only unlink when `filePath.startsWith(uploadsRoot + path.sep) && fs.existsSync(filePath)` in `src/caregivers/caregivers.service.ts`
- [X] T018 [P] [US2] Normalize seeded document `fileUrl` values in `AdminSeedService.seedDatabase` in `src/admin/admin-seed.service.ts` (lines 145, 152, 196) from `'uploads/documents/...'` to `'/uploads/documents/maria_id.pdf'`, `'/uploads/documents/maria_background.pdf'`, and `'/uploads/documents/carlos_id.pdf'` so all documents use a leading slash in `src/admin/admin-seed.service.ts`
- [X] T019 [P] [US2] Update `AdminService.verifyDocument` in `src/admin/admin.service.ts` (lines 86–152):
  1. Remove the `if (documentId.includes('{{') || documentId.includes('%7B') || documentId === 'undefined')` fallback block (lines 89–106) and query solely `const document = await this.documentRepository.findOne({ where: { id: documentId }, relations: { caregiverProfile: true } });`.
  2. Replace the `if (dto.status === VerificationStatus.APPROVED)` conditional wrapper around the trust badge check (lines 127–149) with an unconditional recalculation after `const savedDoc = await this.documentRepository.save(document);`: fetch `allDocs = await this.documentRepository.find({ where: { caregiverProfileId: document.caregiverProfileId } })`, compute `const isVerified = hasApprovedIdCard && hasApprovedCriminalRecord;`, and call `await this.profileRepository.update(document.caregiverProfileId, { isDocumentVerified: isVerified });` on both `APPROVED` and `REJECTED` statuses in `src/admin/admin.service.ts`
- [X] T020 [P] [US2] Update `JobOffersService.updateStatus` in `src/job-offers/job-offers.service.ts` (lines 252–283) to remove the `if (id.includes('{{') || id.includes('%7B') || id === 'undefined')` fallback block and directly call `const offer = await this.findById(id);` before checking `if (offer.clientId !== clientId)` in `src/job-offers/job-offers.service.ts`
- [X] T021 [US2] Update unit tests in `src/caregivers/caregivers.service.spec.ts`, `src/admin/admin.service.spec.ts`, and `src/job-offers/job-offers.service.spec.ts`:
  1. In `src/caregivers/caregivers.service.spec.ts`: add/update tests verifying `uploadDocument` strips `../../` via `path.basename`, `deleteDocument` throws `NotFoundException` for unknown IDs instead of falling back to latest pending document, and `deleteDocument` confines `unlink` to `./uploads/documents`.
  2. In `src/admin/admin.service.spec.ts`: add/update tests verifying `verifyDocument` updates `isDocumentVerified: false` when a document is `REJECTED` and throws `NotFoundException` for unknown IDs.
  3. In `src/job-offers/job-offers.service.spec.ts`: update `updateStatus` tests to expect `NotFoundException` when an invalid/unknown offer ID is passed instead of falling back to the latest offer.

**Checkpoint**: User Story 2 is complete and independently verifiable via `bun x jest src/caregivers/ src/admin/ src/job-offers/`.

---

## Phase 5: User Story 3 - Render-Only Continuous Deployment & Query Performance Optimization (Priority: P2)

**Goal**: Configure `.github/workflows/deploy.yml` exclusively for Render Cloud deployments triggered only after CI passes (`Finding #9` + explicit user requirement), eliminate the $1 + N$ query in `JobOffersService.getMyOffers` (`Finding #10`), and optimize `HistoryService` and `ReportsService` queries (`Finding #11`).

**Independent Test**: Validate `.github/workflows/deploy.yml` syntax/triggers and run `bun x jest src/applications/ src/job-offers/ src/history/ src/reports/`.

### Implementation for User Story 3

- [X] T022 [P] [US3] Update `.github/workflows/deploy.yml` to remove the `push:` trigger (lines 4–5), add `workflow_dispatch:` for manual Render deployment triggers, keep `workflow_run:` (`workflows: ['CI']`, `types: [completed]`, `branches: [main, master]`), and change line 19 `if:` condition to `if: github.event_name == 'workflow_dispatch' || github.event.workflow_run.conclusion == 'success'` so Render deployments never run before CI succeeds in `.github/workflows/deploy.yml`
- [X] T023 [P] [US3] Add a batch counting method `countByJobOffers(jobOfferIds: string[]): Promise<Record<string, number>>` in `src/applications/applications.service.ts` (after `countByJobOffer` at line 254): if `jobOfferIds.length === 0` return `{}`; if `typeof this.applicationRepository.createQueryBuilder === 'function'`, execute `this.applicationRepository.createQueryBuilder('app').select('app.jobOfferId', 'jobOfferId').addSelect('COUNT(app.id)', 'count').where('app.jobOfferId IN (:...jobOfferIds)', { jobOfferIds }).groupBy('app.jobOfferId').getRawMany()` and map counts by `jobOfferId` (defaulting to `0` for offers with zero applications); otherwise fall back to `Promise.all` calling `this.countByJobOffer` in `src/applications/applications.service.ts`
- [X] T024 [US3] Update `JobOffersService.getMyOffers` in `src/job-offers/job-offers.service.ts` (lines 106–122) to call `this.applicationsService.countByJobOffers(offers.map((o) => o.id))` when `typeof (this.applicationsService as any).countByJobOffers === 'function'` (falling back to `Promise.all(offers.map((o) => this.applicationsService.countByJobOffer(o.id)))` when unit tests mock only `countByJobOffer`), eliminating the sequential `for...of` `await` loop in `src/job-offers/job-offers.service.ts`
- [X] T025 [P] [US3] Optimize `HistoryService.getClientHistory` and `HistoryService.getCaregiverHistory` in `src/history/history.service.ts` (lines 87–258) to push status filtering (`'ONGOING'`: `offer.startDate <= :today AND offer.endDate >= :today`; `'COMPLETED'`: `offer.endDate < :today`; `'SCHEDULED'`: `offer.startDate > :today` using `const today = new Date().toISOString().split('T')[0]`) into `qb.andWhere(...)` when `dto.status && dto.status !== 'ALL'`, while keeping `items.filter((item) => item.timeframe.status === dto.status)` as a safe post-map guard for unit test mocks in `src/history/history.service.ts`
- [X] T026 [P] [US3] Optimize `ReportsService.getClientModalityReport` in `src/reports/reports.service.ts` (lines 121–141 and 223–229): if `typeof this.caregiverProfileRepository.createQueryBuilder === 'function'`, query specialty counts in SQL via `this.caregiverProfileRepository.createQueryBuilder('profile').select('UNNEST(profile.specialties)', 'specialty').addSelect('COUNT(DISTINCT profile.id)', 'count').groupBy('specialty').getRawMany()` and `this.caregiverProfileRepository.createQueryBuilder('profile').where('profile.specialties && :disSpecs', { disSpecs: [CareSpecialty.COGNITIVE_DISABILITY, CareSpecialty.PHYSICAL_DISABILITY] }).getCount()`; otherwise fall back to `this.caregiverProfileRepository.find({ select: { id: true, specialties: true } })` so existing unit test mocks in `src/reports/reports.service.spec.ts` continue to work seamlessly in `src/reports/reports.service.ts`
- [X] T027 [P] [US3] Update unit tests in `src/applications/applications.service.spec.ts`, `src/job-offers/job-offers.service.spec.ts`, `src/history/history.service.spec.ts`, and `src/reports/reports.service.spec.ts` to verify batch application counting (`countByJobOffers`), SQL status filtering (`'ONGOING'`, `'COMPLETED'`, `'SCHEDULED'`), and modality report specialty aggregation in `src/applications/applications.service.spec.ts`, `src/job-offers/job-offers.service.spec.ts`, `src/history/history.service.spec.ts`, and `src/reports/reports.service.spec.ts`

**Checkpoint**: User Story 3 is complete and independently verifiable via `bun x jest src/applications/ src/job-offers/ src/history/ src/reports/`.

---

## Phase 6: Polish & Cross-Cutting Concerns (E2E & Full Constitution Verification Gate)

**Purpose**: Update E2E test suite for the new 2FA `challengeToken` contract and run the mandatory Constitution Gate 4 verification suite (`tsc`, `oxlint`, `test:cov`, `build`, `test:e2e`, `test:postman`).

- [X] T028 Update the 2FA E2E test flow in `test/app.e2e-spec.ts` (lines 813–841):
  1. In `'POST /api/v1/auth/login - should require 2FA challenge when 2FA is enabled'`, capture `expect(res.body).toHaveProperty('challengeToken')` into a `let twoFactorChallengeToken: string` variable.
  2. Add/verify an assertion that calling `POST /api/v1/auth/2fa/authenticate` with `{ email: workshopUserData.email, code: validCode }` WITHOUT `challengeToken` or `password` returns `401 Unauthorized`.
  3. In `'POST /api/v1/auth/2fa/authenticate - should exchange valid 2FA code for JWT access token'`, pass `challengeToken: twoFactorChallengeToken` alongside `email` and `code` and assert `200 OK` in `test/app.e2e-spec.ts`
- [X] T029 Run the complete Constitution Gate 4 verification commands (`bun x tsc --noEmit -p tsconfig.json`, `bun run lint`, `bun run test:cov`, `bun run build`, `bun run test:e2e`, and `bun run test:postman`) to confirm zero errors and 100% contract compliance across the repository

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — can start immediately (`T001`–`T003` touch distinct files and can run in parallel).
- **Phase 2 (Foundational)**: Depends on Phase 1 — `T004`–`T006` touch distinct files (`auth.module.ts`, `jwt.strategy.ts`, `admin-seed.service.ts`) and can run in parallel.
- **Phase 3 (User Story 1 - P1 MVP)**: Depends on Phase 2.
  - `T007`–`T012` touch separate DTO and service files and can run in parallel (`[P]`).
  - `T013` (`src/auth/auth.service.ts`) and `T014` (`src/auth/strategies/jwt.strategy.ts`) depend on `T007`–`T012`.
  - `T015` (`src/auth/auth.controller.ts`) and `T016` (unit tests) complete US1.
- **Phase 4 (User Story 2 - P1)**: Depends on Phase 2 (`T006`); independent of US1.
  - `T017` (`caregivers.service.ts`), `T018` (`admin-seed.service.ts`), `T019` (`admin.service.ts`), and `T020` (`job-offers.service.ts`) touch separate files and can run in parallel (`[P]`). (Note: `ReviewsService.createReview` retains its read-only `403 ForbiddenException` guard per `research.md` Section 5 and requires no edits).
  - `T021` updates the corresponding unit test files.
- **Phase 5 (User Story 3 - P2)**: Depends on Phase 2 and `T020` (for `job-offers.service.ts`).
  - `T022` (`.github/workflows/deploy.yml`), `T023` (`applications.service.ts`), `T025` (`history.service.ts`), and `T026` (`reports.service.ts`) can run in parallel (`[P]`).
  - `T024` (`job-offers.service.ts`) depends on `T023`.
  - `T027` updates unit tests for `applications`, `job-offers`, `history`, and `reports`.
- **Phase 6 (Polish & Verification Gate)**: Depends on Phases 3, 4, and 5 (`T028` updates `test/app.e2e-spec.ts`, `T029` executes full CI/Constitution verification).

### Parallel Execution Examples

```bash
# Phase 1 & 2 Parallel Batch (6 independent files):
Task T001: ".env.example"
Task T002: "src/main.ts"
Task T003: "src/app.module.ts"
Task T004: "src/auth/auth.module.ts"
Task T005: "src/auth/strategies/jwt.strategy.ts"
Task T006: "src/admin/admin-seed.service.ts"

# User Story 1 DTO & Lookup Parallel Batch (6 independent files):
Task T007: "src/auth/dtos/register.dto.ts"
Task T008: "src/auth/dtos/login.dto.ts"
Task T009: "src/auth/dtos/forgot-password.dto.ts"
Task T010: "src/admin/dtos/bulk-create-users.dto.ts"
Task T011: "src/auth/dtos/two-factor.dto.ts"
Task T012: "src/users/users.service.ts"

# User Story 2 Service Parallel Batch (4 independent files):
Task T017: "src/caregivers/caregivers.service.ts"
Task T018: "src/admin/admin-seed.service.ts"
Task T019: "src/admin/admin.service.ts"
Task T020: "src/job-offers/job-offers.service.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Complete **Phase 1 (Setup)** and **Phase 2 (Foundational)** (`T001`–`T006`).
2. Complete **Phase 3 (User Story 1)** (`T007`–`T016`) to close all Critical/High authentication, 2FA, and password reset vulnerabilities.
3. Validate independently with `bun x jest src/auth/ src/users/`.

### Incremental Delivery

1. Deliver **User Story 1** (`T007`–`T016`): Authentication, 2FA challenge, SHA-256 reset tokens, email normalization, and logout precision.
2. Deliver **User Story 2** (`T017`–`T021`): Path traversal fix, removal of Postman fallbacks, and caregiver trust badge revocation on rejection.
3. Deliver **User Story 3** (`T022`–`T027`): Render-only GitHub Actions deployment workflow and SQL query optimizations.
4. Execute **Phase 6** (`T028`–`T029`): E2E test updates and full Constitution Gate 4 verification.
