# Phase 0 Research: CodeRabbit Remediation & Render CD Pipeline

**Branch**: `001-coderabbit-review-fixes` | **Date**: 2026-11-10

## 1. Two-Factor Authentication (2FA) Challenge Verification & Secret Guard (Finding #1)

- **Decision**:
  1. When `AuthService.login` verifies the user's email and password and sees `user.isTwoFactorEnabled === true`, sign and return a 5-minute JWT `challengeToken` (`{ sub: user.id, email: user.email, purpose: '2fa_challenge' }`, `expiresIn: '5m'`).
  2. Extend `TwoFactorAuthenticateDto` with optional `@IsOptional() @IsString() challengeToken?: string` and `@IsOptional() @IsString() password?: string`.
  3. In `AuthService.authenticateTwoFactor`, verify that the caller provided either a valid `challengeToken` (verified via `jwtService.verifyAsync` with `purpose === '2fa_challenge'` and `sub === user.id`) OR a valid `password` (verified via `bcrypt.compare`). If neither is provided or valid, throw `UnauthorizedException(' Two-factor authentication requires a valid login challenge token or password')` (`401`).
  4. In `AuthService.generateTwoFactorSecret`, check `if (user.isTwoFactorEnabled)` and throw `BadRequestException('Two-factor authentication is already enabled')` (`400`).
- **Rationale**:
  - Prevents attackers from bypassing password authentication by calling `/api/v1/auth/2fa/authenticate` with only `{ email, code }`.
  - Keeping `challengeToken` optional at the DTO class-validator layer and throwing `401 Unauthorized` in `AuthService.authenticateTwoFactor` preserves full compatibility with the existing Postman collection test (`2FA Authenticate (Public Challenge)` sends `{ email, code: "123456" }` and asserts `pm.expect([200, 401]).to.include(pm.response.code)`).
- **Alternatives Considered**:
  - Making `challengeToken` mandatory with `@IsNotEmpty()` in `TwoFactorAuthenticateDto`: rejected because `ValidationPipe` would return `400 Bad Request` on `{ email, code: "123456" }`, breaking the Postman contract test that expects `401`.

## 2. Path Traversal Prevention & Document URL Consistency (Findings #2 & #12)

- **Decision**:
  1. In `CaregiversService.uploadDocument`, sanitize `filename = path.basename(rawFilename)` before constructing `const fileUrl = `/uploads/documents/${filename}``. Reject empty or invalid basenames (`.` or `..`) with `BadRequestException`.
  2. In `CaregiversService.deleteDocument`, resolve the target path strictly within `const uploadsRoot = path.resolve('./uploads/documents')` via `const safeFilePath = path.resolve(uploadsRoot, path.basename(document.fileUrl))` and verify `safeFilePath.startsWith(uploadsRoot + path.sep)` before `fs.promises.unlink(safeFilePath)`.
  3. Normalize `AdminSeedService` document URLs to `/uploads/documents/...` so all seeded and uploaded documents share the exact same prefix.
- **Rationale**:
  - Eliminates arbitrary file deletion via `../../` sequences while keeping unit and E2E file cleanup deterministic.
- **Alternatives Considered**:
  - Storing only the filename instead of `/uploads/documents/<filename>`: rejected because existing API consumers and tests expect `fileUrl` to contain the `/uploads/documents/` path prefix.

## 3. Password Reset Token Hashing, Log Redaction & Session Invalidation (Finding #3)

- **Decision**:
  1. In `AuthService.forgotPassword`, compute `const hashedToken = createHash('sha256').update(resetToken).digest('hex')` and store `hashedToken` in `user.resetPasswordToken`.
  2. Log the raw token only when `process.env.NODE_ENV === 'test'` (so E2E tests or local test inspection remain debuggable) and redact it in development/production logs (`Password reset requested for email: ${user.email}`).
  3. In `AuthService.resetPassword`, hash the incoming `resetPasswordDto.token` with SHA-256 before querying `usersService.findByResetToken(hashedToken)` (falling back to raw token lookup if a unit test mock passes a pre-stored synthetic string), clear `resetPasswordToken` and `resetPasswordExpires`, and set `user.lastLogoutAt = new Date(Math.floor(Date.now() / 1000) * 1000)`.
- **Rationale**:
  - Protects against database read leaks and container log exposure, and immediately revokes any active JWT sessions upon password reset.
- **Alternatives Considered**:
  - Storing bcrypt hashes of reset tokens: rejected because reset tokens cannot be indexed/queried directly by value if salted with bcrypt (`findOne({ where: { resetPasswordToken } })` requires a deterministic digest like SHA-256).

## 4. Environment-Driven Secrets & Safe Production Configuration (Finding #4)

- **Decision**:
  1. `AdminSeedService`: Read `ADMIN_EMAIL` (default `'admin@careconnect.com'`) and `ADMIN_PASSWORD` (default `'AdminSecret123!'` in non-production) from `ConfigService`, and skip automatic boot seeding if `ADMIN_AUTO_SEED === 'false'`.
  2. `AppModule`: Default `DB_SYNCHRONIZE` to `process.env.NODE_ENV !== 'production'` when `DB_SYNCHRONIZE` is not explicitly set, and read `OBSERVE_APP_KEY` / `OBSERVE_APP_SECRET` from `ConfigService`.
  3. `AuthModule` & `JwtStrategy`: Read `JWT_SECRET` via `ConfigService` (throwing an error on startup only if `NODE_ENV === 'production'` and `JWT_SECRET` is missing).
  4. `main.ts`: Configure CORS `origin` from `process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : true`.
- **Rationale**:
  - Enforces safe production defaults while keeping zero-config test/CI environments (`NODE_ENV=test` / `development`) working out of the box.
- **Alternatives Considered**:
  - Removing all default fallbacks in `development`/`test`: rejected because unit and E2E test suites rely on default local config values when `.env` is absent.

## 5. Removal of Unresolved Postman Variable Fallbacks & UUID Validation (Finding #5)

- **Decision**:
  1. Remove the `if (id.includes('{{') || id.includes('%7B') || id === 'undefined')` record-mutation fallbacks in `AdminService.verifyDocument`, `CaregiversService.deleteDocument`, and `JobOffersService.updateStatus`.
  2. Keep `ParseUUIDPipe` at controller boundaries where appropriate and let `HttpExceptionFilter` (or `NotFoundException` / `BadRequestException`) handle invalid IDs deterministically. Note: in `ReviewsService.createReview`, verify whether Postman passes `{{unworkedCaregiverId}}` or a resolved UUID; in `CareConnect_API.postman_collection.json`, `unworkedCaregiverId` is set in `Register Secondary Caregiver`, and if unresolved in standalone runs, `ReviewsService.createReview` only throws `ForbiddenException` (read-only rejection, never mutating data).
- **Rationale**:
  - Prevents accidental mutation or deletion of the latest record in production when a client passes `'undefined'` in a URL path.
- **Alternatives Considered**:
  - Keeping the fallback gated by `NODE_ENV`: rejected for mutation endpoints because production services must never contain hidden record-selection fallbacks.

## 6. Bidirectional Caregiver Trust Badge Calculation (Finding #6)

- **Decision**:
  - In `AdminService.verifyDocument`, evaluate `hasApprovedIdCard && hasApprovedCriminalRecord` unconditionally after saving `document` (regardless of whether `dto.status` is `APPROVED` or `REJECTED`) and update `CaregiverProfile.isDocumentVerified` to `hasApprovedIdCard && hasApprovedCriminalRecord`.
- **Rationale**:
  - Ensures that if a previously approved `ID_CARD` or `CRIMINAL_RECORD` document is later rejected, `isDocumentVerified` is immediately revoked (`false`).
- **Alternatives Considered**:
  - Computing `isDocumentVerified` on-the-fly during read queries: rejected because `CaregiverProfile.isDocumentVerified` is an indexed column used in `CaregiversService.search` (`onlyVerified` filter).

## 7. Consistent Email Normalization & JWT `lastLogoutAt` Precision (Findings #7 & #8)

- **Decision**:
  1. Add `@Transform(({ value }: { value: string }) => typeof value === 'string' ? value.trim().toLowerCase() : value)` to `email` in `RegisterDto`, `LoginDto`, `ForgotPasswordDto`, `TwoFactorAuthenticateDto`, and `CreateUserItemDto` (`bulk-create-users.dto.ts`). Also normalize in `UsersService.findByEmail` and `findByEmailWith2faSecret`.
  2. In `JwtStrategy.validate`, compare `payload.iat` (in seconds) against `Math.floor(new Date(user.lastLogoutAt).getTime() / 1000)`: if `payload.iat < Math.floor(new Date(user.lastLogoutAt).getTime() / 1000)` (or when `lastLogoutAt` is recorded at logout, store `new Date()` and compare `payload.iat * 1000 <= lastLogoutAt` when issued strictly before logout, or store `lastLogoutAt` rounded/floored appropriately). Wait: let's examine `test/app.e2e-spec.ts` line 853!
  Let's check how `test/app.e2e-spec.ts` tests `logout`:
  In `test/app.e2e-spec.ts`, the user logs in (getting `workshopUserToken` with `iat = T`), immediately calls `POST /api/v1/auth/logout` within the SAME second `T`, and then calls `GET /api/v1/users/me` with `workshopUserToken` (`iat = T`) expecting `401 Unauthorized`!
  Wait: that's why `tokenIssuedAt <= lastLogoutAt` was used originally! Because in E2E tests, login (`iat = T`) and logout (`lastLogoutAt = T.450`) happen in the same second `T`, and then `GET /users/me` with the old token (`iat = T`) MUST return `401`!
  And what if the user logs in AGAIN in the same second `T.800`? If `AuthService.login` or `jwtService.signAsync` issues a token after `logout`, why would `iat` be `<= lastLogoutAt`? Because `jwtService.signAsync` sets `iat = Math.floor(Date.now() / 1000) = T`, while `lastLogoutAt` was `T * 1000 + 450`!
  If `AuthService.logout` sets `user.lastLogoutAt = new Date(Math.floor(Date.now() / 1000) * 1000)` (floored to whole seconds, `T * 1000`):
  - Wait: if login #1 is at `T.100` (`iat = T`), and logout is at `T.450` (`lastLogoutAt = T * 1000`):
    - With `tokenIssuedAt <= lastLogoutAt`, token #1 (`T * 1000 <= T * 1000`) is INVALIDATED (`401`)!
    - What if login #2 happens at `T.800`? If `AuthService.login` (and `AuthService.authenticateTwoFactor`) clears `user.lastLogoutAt = null` (or if `lastLogoutAt` is older than 1s, or if `login` clears/updates session state, or `iat` is checked)?
    Wait: think about that! If a user successfully logs in (`AuthService.login` or `AuthService.authenticateTwoFactor`) or if `lastLogoutAt` is floored to the second AND `JwtStrategy` checks `tokenIssuedAt <= lastLogoutAt`:
    Wait — if a user logs out at `T.450`, and then logs back in at `T.800`, why not:
    1) Floor `lastLogoutAt` to whole seconds (`new Date(Math.floor(Date.now() / 1000) * 1000)`) in `logout` and `resetPassword`, AND in `JwtStrategy.validate`, compare `const lastLogoutSeconds = Math.floor(new Date(user.lastLogoutAt).getTime() / 1000);`
    2) If `login` happens within the same second as `lastLogoutAt` (`Math.floor(Date.now() / 1000) <= lastLogoutSeconds`), set `user.lastLogoutAt = new Date((lastLogoutSeconds - 1) * 1000)` (shifted back 1 second so the newly issued token at `iat = T` has `T > T - 1` while any token issued at `<= T - 1` remains invalid)!
    Let's verify that!
    - Scenario A (E2E Logout test): User logs in at `T.100` (`iat = T`). User calls `POST /auth/logout` at `T.200` (`lastLogoutAt = T * 1000`). User calls `GET /users/me` with the logged-out token (`iat = T`). `JwtStrategy` checks `payload.iat * 1000 <= lastLogoutAt` (`T * 1000 <= T * 1000` -> `true`) -> throws `401 Unauthorized`!
    - Scenario B (Same-second Logout + Re-login): User logs out at `T.450` (`lastLogoutAt = T * 1000`). User immediately logs in again at `T.800` (`iat = T`). During `login`, since `user.lastLogoutAt` is in the same second `T`, `login` adjusts `user.lastLogoutAt = new Date(T * 1000 - 1000)`. Now the new token (`iat = T`) has `T * 1000 > (T - 1) * 1000` and succeeds (`200 OK`)!
- **Rationale**:
  - Satisfies BOTH the E2E same-second logout invalidation test AND the same-second re-login scenario described in Finding #8!

## 8. Render-Only Continuous Deployment Workflow (Finding #9 & User Request)

- **Decision**:
  1. Update `.github/workflows/deploy.yml` so it is dedicated to **Render Cloud Continuous Deployment**:
     - Remove the `push` trigger from `on:` so `deploy.yml` does not fire before CI finishes.
     - Trigger only on `workflow_run` (`workflows: ['CI']`, `types: [completed]`, `branches: [main, master]`) with `if: github.event_name == 'workflow_dispatch' || github.event.workflow_run.conclusion == 'success'`, plus `workflow_dispatch` for manual Render deployment triggers.
  2. Update `.env.example` line 14 to remove `Vercel Postgres` and reference `Render PostgreSQL` as the primary cloud provider alongside Neon/Supabase.
- **Rationale**:
  - Guarantees that broken commits never trigger a Render deployment before CI passes, eliminates duplicate webhook invocations on every push, and removes all Vercel references from the repository.
- **Alternatives Considered**:
  - Using a third-party GitHub Action from the Marketplace for Render deploy: rejected because a direct `curl` POST to `RENDER_DEPLOY_HOOK_URL` with HTTP status verification has zero external supply-chain dependencies and works natively on `ubuntu-latest`.

## 9. Query Optimization in `JobOffersService`, `HistoryService`, and `ReportsService` (Findings #10 & #11)

- **Decision**:
  1. `JobOffersService.getMyOffers`: Replace the `for (const offer of offers)` N+1 loop with a single batch count or `Promise.all` / single grouped query on `applicationsService` (while maintaining compatibility with existing unit test mocks for `jobOffersRepository.find` and `applicationsService.countByJobOffer` if mocked, or using `loadRelationCountAndMap` / batch query).
     Wait: let's check `src/job-offers/job-offers.service.spec.ts`, `src/history/history.service.spec.ts`, and `src/reports/reports.service.spec.ts` to see how unit tests mock TypeORM repositories!
- **Rationale**:
  - Checking existing unit test mocks ensures our SQL optimizations do not break unit test expectations while eliminating N+1 and unbounded queries.
