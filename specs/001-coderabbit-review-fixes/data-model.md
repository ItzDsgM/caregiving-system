# Phase 1 Data Model: CodeRabbit Remediation & Render CD Pipeline

**Branch**: `001-coderabbit-review-fixes` | **Date**: 2026-11-10

## 1. Entity & DTO Refinements

### 1.1 `User` Entity (`src/users/entities/user.entity.ts`)

| Field | Type | Constraints / Behavior Changes |
| :--- | :--- | :--- |
| `id` | `uuid` | Primary Key |
| `email` | `varchar` (unique) | Normalized via `.trim().toLowerCase()` at DTO and service lookup boundaries (`RegisterDto`, `LoginDto`, `ForgotPasswordDto`, `TwoFactorAuthenticateDto`, `BulkCreateUsersDto`). |
| `password` | `varchar` | `@Exclude()` bcrypt hash. |
| `isTwoFactorEnabled` | `boolean` | Guards `generateTwoFactorSecret` (blocks secret overwrite with `400 Bad Request` when `true`). |
| `twoFactorSecret` | `varchar \| null` | `select: false`, `@Exclude()`. |
| `resetPasswordToken` | `varchar \| null` | `@Exclude()`. Stores deterministic `SHA-256` hex digest (`createHash('sha256').update(rawToken).digest('hex')`) instead of plaintext token. |
| `resetPasswordExpires` | `timestamp \| null` | `@Exclude()`. 15-minute expiration window. |
| `lastLogoutAt` | `timestamp \| null` | Truncated to whole-second granularity (`Math.floor(Date.now() / 1000) * 1000`) on `logout()` and `resetPassword()`, and adjusted by `-1s` if a re-login occurs within the exact same second to prevent false `401` rejections on newly minted JWTs. |

### 1.2 `TwoFactorAuthenticateDto` (`src/auth/dtos/two-factor.dto.ts`)

| Field | Type | Validation Rules |
| :--- | :--- | :--- |
| `email` | `string` | `@IsNotEmpty()`, `@IsEmail()`, `@Transform(({ value }) => value?.trim().toLowerCase())` |
| `code` | `string` | `@IsNotEmpty()`, `@IsString()`, `@Length(6, 6)`, `@Matches(/^\d{6}$/)` |
| `challengeToken` | `string?` | `@IsOptional()`, `@IsString()` — Short-lived JWT (`purpose: '2fa_challenge'`, `5m` expiry) returned by `POST /api/v1/auth/login` when `isTwoFactorEnabled` is `true`. |
| `password` | `string?` | `@IsOptional()`, `@IsString()` — Alternative first-factor verification if `challengeToken` is not passed. |

*State Transition Rule*: `AuthService.authenticateTwoFactor` requires `(valid challengeToken OR valid password) AND valid TOTP code`. Missing or invalid first-factor proof throws `401 Unauthorized`.

### 1.3 `CaregiverDocument` & `CaregiverProfile` (`src/caregiver-profiles/entities/`)

| Entity.Field | Type | Validation & State Transition Rules |
| :--- | :--- | :--- |
| `CaregiverDocument.fileUrl` | `varchar` | Always formatted as `/uploads/documents/<sanitized_basename>` where `<sanitized_basename> = path.basename(input)`. Path traversal sequences (`../`, `..\\`) are stripped and physical deletion is restricted to `path.resolve('./uploads/documents')`. |
| `CaregiverDocument.verificationStatus` | `VerificationStatus` | `PENDING` → `APPROVED` \| `REJECTED`. |
| `CaregiverProfile.isDocumentVerified` | `boolean` | Recomputed unconditionally on every `AdminService.verifyDocument` call as `hasApprovedIdCard && hasApprovedCriminalRecord` (grants `true` when both are `APPROVED`, revokes to `false` when either is `REJECTED`). |

### 1.4 `JobOffer` & `Application` (`src/job-offers/`, `src/applications/`)

- **Batch Application Count**: `ApplicationsService.countByJobOffers(jobOfferIds: string[]): Promise<Record<string, number>>` executes a single `GROUP BY app.jobOfferId` SQL query to populate `applicationsCount` in `JobOffersService.getMyOffers`, eliminating the $1 + N$ query loop.
- **SQL Engagement Timeframe Filtering**: `HistoryService` pushes `SCHEDULED` (`offer.startDate > :today`), `ONGOING` (`offer.startDate <= :today AND offer.endDate >= :today`), and `COMPLETED` (`offer.endDate < :today`) conditions and pagination (`skip`/`take`) into the TypeORM `SelectQueryBuilder`.
