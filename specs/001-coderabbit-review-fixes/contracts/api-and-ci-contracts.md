# Phase 1 Interface & CI/CD Contracts: CodeRabbit Remediation & Render CD

**Branch**: `001-coderabbit-review-fixes` | **Date**: 2026-11-10

## 1. REST API Endpoint Contracts (`/api/v1`)

### 1.1 `POST /api/v1/auth/login` (When 2FA is Enabled)
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "Password123!"
  }
  ```
- **Response (`200 OK` when `isTwoFactorEnabled === true`)**:
  ```json
  {
    "isTwoFactorRequired": true,
    "email": "user@example.com",
    "challengeToken": "<signed-jwt-5m-2fa_challenge>",
    "message": "Two-factor authentication code required. Submit code to /api/v1/auth/2fa/authenticate"
  }
  ```

### 1.2 `POST /api/v1/auth/2fa/authenticate`
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "code": "123456",
    "challengeToken": "<signed-jwt-5m-2fa_challenge>",
    "password": "OptionalFallbackPassword123!"
  }
  ```
- **Responses**:
  - `200 OK`: `{ "access_token": "<jwt>", "user": { ... } }` when `(challengeToken OR password)` AND `code` are valid.
  - `401 Unauthorized`: When `challengeToken` and `password` are missing/invalid OR when `code` is invalid.
  - `403 Forbidden`: When account is suspended (`isActive: false`).

### 1.3 `POST /api/v1/auth/2fa/generate`
- **Headers**: `Authorization: Bearer <access_token>`
- **Responses**:
  - `200 OK`: `{ "secret": "<base32>", "otpauthUrl": "otpauth://totp/..." }` when `isTwoFactorEnabled === false`.
  - `400 Bad Request`: `{ "statusCode": 400, "message": "Two-factor authentication is already enabled", ... }` when `isTwoFactorEnabled === true`.

### 1.4 `POST /api/v1/caregivers/me/documents` & `DELETE /api/v1/caregivers/me/documents/:id`
- **Upload Normalization**: `fileUrl` is stored as `/uploads/documents/<basename>` after `path.basename()` sanitization.
- **Delete Validation**: `:id` MUST be a valid UUID (no `{{deleteDocId}}` or `'undefined'` fallback to the latest record). Physical file deletion only occurs if the resolved path starts with `path.resolve('./uploads/documents') + path.sep`.

### 1.5 `PATCH /api/v1/admin/documents/:id/verify`
- **Validation**: `:id` MUST be a valid UUID (no `{{documentId}}` or `'undefined'` fallback to the latest pending document).
- **Side Effect**: Recomputes `CaregiverProfile.isDocumentVerified = hasApprovedIdCard && hasApprovedCriminalRecord` on both `APPROVED` and `REJECTED` transitions.

### 1.6 `PATCH /api/v1/job-offers/:id/status`
- **Validation**: `:id` MUST be a valid UUID owned by the authenticated `CLIENT` (no `{{offerToCloseId}}` or `'undefined'` fallback).

---

## 2. GitHub Actions Render Continuous Deployment Contract (`.github/workflows/deploy.yml`)

- **Target Cloud Provider**: Exclusively **Render** (`RENDER_DEPLOY_HOOK_URL`). Zero references to Vercel in `.github/workflows/` or `.env.example`.
- **Trigger Contract**:
  - `workflow_run`:
    - `workflows: ['CI']`
    - `types: [completed]`
    - `branches: [main, master]`
  - `workflow_dispatch`: Manual trigger from GitHub Actions UI.
- **Execution Gate**:
  - `if: github.event_name == 'workflow_dispatch' || github.event.workflow_run.conclusion == 'success'`
  - Ensures Render deployment is NEVER triggered directly on `push` before the `CI` workflow (`unit`, `e2e`, `postman`) passes.
