<!--
Sync Impact Report
- Version change: N/A (template) → 1.0.0
- Modified principles:
  - [PRINCIPLE_1_NAME] → I. Domain-Driven Modularity & Strict Contracts
  - [PRINCIPLE_2_NAME] → II. Security, RBAC & Privacy-by-Design (NON-NEGOTIABLE)
  - [PRINCIPLE_3_NAME] → III. Transactional Data Integrity & Auditable State
  - [PRINCIPLE_4_NAME] → IV. Multi-Layer Testing & Quality Gates (NON-NEGOTIABLE)
  - [PRINCIPLE_5_NAME] → V. Living OpenAPI Specification & Observability
- Added sections:
  - Technical Stack & Repository Scope Constraints
  - Feature Lifecycle & Mandatory Constitution Validation Gates
- Removed sections: None
- Templates requiring updates:
  - ✅ .specify/templates/plan-template.md (Constitution Check gate aligns with Core Principles I–V)
  - ✅ .specify/templates/spec-template.md (User stories and requirements align with RBAC and privacy rules)
  - ✅ .specify/templates/tasks-template.md (Task phases align with multi-layer testing and validation gates)
- Follow-up TODOs: None
-->

# CareConnect API (caregiving-system) Constitution

## Core Principles

### I. Domain-Driven Modularity & Strict Contracts
Every feature MUST be encapsulated within a dedicated NestJS domain module under `src/<module>`
with strict separation between wiring (`*.module.ts`), HTTP routing (`*.controller.ts`), business
logic (`*.service.ts`), persistence models (`entities/*.entity.ts`), and data transfer contracts
(`dtos/*.dto.ts`). All endpoints MUST be served under the `/api/v1` global prefix, validate inputs
through `class-validator` and `class-transformer` via the global `ValidationPipe` (`whitelist: true`,
`forbidNonWhitelisted: true`, `transform: true`), and return normalized JSON error envelopes
(`{ statusCode, message, timestamp, path }`) enforced by `HttpExceptionFilter`.

Rationale: Strict module boundaries and input/output contracts prevent cross-domain coupling,
mass-assignment vulnerabilities, and inconsistent client error handling.

### II. Security, RBAC & Privacy-by-Design (NON-NEGOTIABLE)
All non-public endpoints MUST enforce JWT authentication (`JwtAuthGuard`, including session logout
timestamp validation and RFC 6238 TOTP 2FA verification where applicable) alongside explicit
Role-Based Access Control via `@Roles()` and `RolesGuard` (`CAREGIVER`, `CLIENT`, `ADMIN`).
Sensitive entity fields (such as password hashes and 2FA secrets) MUST be excluded from responses
using `@Exclude()` and `ClassSerializerInterceptor`. Direct caregiver contact data (phone, email,
WhatsApp) MUST remain masked until mutual engagement acceptance (`ACCEPTED` job application or
`ACCEPTED` contact request).

Rationale: CareConnect handles sensitive personal, identity, and caregiving data where unauthorized
access or premature PII disclosure directly compromises user safety and platform trust.

### III. Transactional Data Integrity & Auditable State
Multi-entity mutations and aggregate recalculations (such as review persistence paired with
`totalReviews` and `ratingAverage` updates on `CaregiverProfile`) MUST execute atomically inside a
TypeORM `QueryRunner` transaction with explicit `commitTransaction()`, `rollbackTransaction()`, and
`release()` blocks. Cross-cutting side effects MUST be decoupled via `@nestjs/event-emitter`
(`EventEmitter2`). All database entities MUST use strongly typed enums (`src/common/enums/`) and
UUID identifiers, mapping invalid UUID syntax (`22P02`) to `400 Bad Request`.

Rationale: Atomic transactions and event decoupling prevent partial writes, race conditions in
reputation scoring, and tightly coupled notification side effects.

### IV. Multi-Layer Testing & Quality Gates (NON-NEGOTIABLE)
Every feature or bugfix MUST include unit tests (`src/**/*.spec.ts` using Jest) covering all
service and controller branches, end-to-end integration tests (`test/app.e2e-spec.ts` using
Supertest against PostgreSQL), and updated API collection assertions (`postman/` executed via
Newman) when HTTP contracts change. All changes MUST pass TypeScript type checking
(`tsc --noEmit`), static linting (`oxlint src/ test/`), production build (`nest build`), and
unit coverage verification (`bun run test:cov`) before merge.

Rationale: Multi-layer automated verification guarantees that business rules, database queries,
guards, and HTTP contracts remain regression-free in continuous integration.

### V. Living OpenAPI Specification & Observability
Every controller and DTO MUST declare complete `@nestjs/swagger` metadata (`@ApiTags`,
`@ApiBearerAuth`, `@ApiOperation`, `@ApiResponse`, `@ApiProperty`) so the OpenAPI specification at
`/api/v1/docs` remains synchronized with the implementation at all times. Exported classes and
methods MUST maintain accurate JSDoc comments, and operational events or unhandled exceptions MUST
be instrumented through NestJS `Logger` and `@nestjs/observe`.

Rationale: Synchronized OpenAPI metadata and structured telemetry ensure the API remains
self-documenting, auditable, and diagnosable in production.

## Technical Stack & Repository Scope Constraints

- **Runtime & Toolchain**: Node.js 24 and Bun (`bun.lock` with `--frozen-lockfile` in CI),
  TypeScript 6 (`strict: true`, `moduleResolution: "nodenext"`), NestJS 12, Express 5, Helmet, and
  `@nestjs/throttler`.
- **Persistence Layer**: PostgreSQL 16 managed via TypeORM (`pg` driver) with environment-driven
  SSL and connection pooling.
- **Governed Repository Scope**: Constitutional governance, architectural rules, and validation
  gates apply exclusively to `src/`, `test/`, `postman/`, `scripts/`, `.github/workflows/`, and
  root configuration manifests (`package.json`, `tsconfig*.json`, `jest.config.ts`, `oxlint.json`,
  `Dockerfile`). Unrelated local directories outside these paths are excluded from constitutional
  scope and MUST NOT be used as a source of governance rules.

## Feature Lifecycle & Mandatory Constitution Validation Gates

Every future feature specification, plan, task list, and code implementation MUST be validated
against this Constitution through the following mandatory gates:

1. **Specification Gate (`/speckit-specify` & `/speckit-clarify`)**: Every feature specification
   (`spec.md`) MUST explicitly declare the required roles (`CAREGIVER`, `CLIENT`, `ADMIN`), data
   privacy/masking boundaries, and error/edge-case scenarios before planning begins.
2. **Planning Gate (`/speckit-plan` — Constitution Check)**: Every implementation plan (`plan.md`)
   MUST complete the `## Constitution Check` section by verifying compliance against Principles I–V
   prior to Phase 0 research and re-verifying after Phase 1 design. Any proposed deviation MUST be
   justified in `## Complexity Tracking` and rejected if a compliant alternative exists.
3. **Task & Consistency Gate (`/speckit-tasks` & `/speckit-analyze`)**: Every `tasks.md` artifact
   MUST include explicit tasks for DTO validation, RBAC guards, Swagger annotations, unit tests
   (`*.spec.ts`), and E2E/Postman contract tests. Running `/speckit-analyze` MUST treat any
   conflict with this Constitution as a blocking `CRITICAL` finding.
4. **Implementation & CI Gate (`/speckit-implement` & Pull Requests)**: No feature or
   implementation task may be marked complete until compliance with Principles I–V is verified and
   the full verification suite passes locally and in CI:
   - `bun x tsc --noEmit -p tsconfig.json`
   - `bun run lint`
   - `bun run test:cov`
   - `bun run build`
   - `bun run test:e2e`
   - `bun run test:postman`

## Governance

This Constitution is the supreme architectural and engineering governance document for the
CareConnect API (`caregiving-system`) repository and supersedes any conflicting ad-hoc practices.

- **Mandatory Feature & Implementation Validation**: Every Spec Kit workflow execution
  (`/speckit-specify`, `/speckit-clarify`, `/speckit-plan`, `/speckit-tasks`, `/speckit-analyze`,
  `/speckit-implement`, `/speckit-checklist`, `/speckit-converge`) and every Pull Request review
  MUST actively validate the target feature or implementation against Core Principles I–V and the
  Feature Lifecycle Validation Gates. Non-compliant plans or implementations MUST be blocked until
  remediated.
- **Amendment Procedure**: Any amendment to this Constitution MUST be performed via
  `/speckit-constitution`, include a clear rationale and Sync Impact Report, and verify compatibility
  with dependent Spec Kit templates.
- **Versioning Policy**: `CONSTITUTION_VERSION` follows Semantic Versioning (`MAJOR.MINOR.PATCH`):
  - **MAJOR**: Removal or backward-incompatible redefinition of a Core Principle or mandatory
    validation gate.
  - **MINOR**: Addition of a new principle, governance section, or material expansion of mandatory
    gates.
  - **PATCH**: Wording clarifications, formatting fixes, or non-semantic refinements.

**Version**: 1.0.0 | **Ratified**: 2026-11-10 | **Last Amended**: 2026-11-10
