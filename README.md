# CareConnect API (Caregiving System)

[![NestJS](https://img.shields.io/badge/NestJS-11.x-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![TypeORM](https://img.shields.io/badge/TypeORM-0.3-FE0979?logo=typeorm&logoColor=white)](https://typeorm.io/)
[![Bun](https://img.shields.io/badge/Bun-1.x-fbf0df?logo=bun&logoColor=black)](https://bun.sh/)
[![Swagger](https://img.shields.io/badge/OpenAPI-Swagger-85EA2D?logo=swagger&logoColor=black)](https://swagger.io/)

CareConnect is a robust, enterprise-grade RESTful backend application built with **NestJS**, **TypeScript**, and **PostgreSQL (TypeORM)**. It powers a platform connecting families and clients with verified caregivers (elderly care, pediatric care, post-operative care, and companion care) featuring role-based access control (RBAC), multi-step document verification, atomic reputation scoring, and privacy-first direct contact.

---

## Architecture & System Highlights

- **Role-Based Access Control (RBAC):** Distinct permissions for `CAREGIVER`, `CLIENT`, and `ADMIN` enforced via `@Roles()` decorators and `RolesGuard`, with dynamic admin role assignment (`PATCH /admin/users/:id/role`).
- **Two-Factor Authentication (2FA / TOTP):** RFC 6238 time-based one-time password system (`/auth/2fa/*`) compatible with Google Authenticator and Authy.
- **Active Session Logout:** JWT token invalidation via `POST /auth/logout` and timestamp checks in `JwtStrategy`.
- **Database Seeding Engine:** CLI script (`bun run seed`) and admin endpoint (`POST /admin/seed`) feeding realistic caregivers, clients, offers, applications, and reviews.
- **Privacy Unlocking Model:** Caregiver contact details (phone, email, WhatsApp) remain masked until mutual acceptance.
- **Document Audit Engine:** Secure uploads for identity documents and background checks, verified by administrators to grant trust badges.
- **Atomic Reputation & Ratings:** 1–5 star client reviews calculate weighted average ratings atomically via TypeORM `QueryRunner` transactions.
- **Analytics & History:** Geographic zone demand metrics, care modality reports, and bidirectional engagement history.
- **Continuous Integration & Deployment:** GitHub Actions CI/CD workflows (`ci.yml`, `deploy.yml`) and multi-stage Docker containerization.
- **Interactive OpenAPI/Swagger:** Fully annotated documentation at `/api/v1/docs`.

---

## Domain Modules & API Endpoints

| Module | Route Prefix | Key Functionalities |
| :--- | :--- | :--- |
| **Auth** | `/api/v1/auth` | Registration, bulk register, JWT login, 2FA (generate/enable/disable/authenticate), session logout, and password recovery. |
| **Users** | `/api/v1/users` | Current user profile retrieval (`/users/me`) and account details updates. |
| **Caregivers** | `/api/v1/caregivers` | Profile setup (rates, experience, bio, schedule), document upload, and public search engine with filters. |
| **Job Offers** | `/api/v1/job-offers` | Job postings, search by city/modality/budget, bulk creation, and applicant retrieval. |
| **Applications** | `/api/v1/applications` | Job applications with rate proposals; accept/reject transitions with privacy disclosure. |
| **Contact Requests**| `/api/v1/contact-requests` | Direct client-caregiver messaging with WhatsApp contact unlocking upon acceptance. |
| **Reviews** | `/api/v1/reviews` | Verified ratings (1–5) and client feedback with auto-updated caregiver rating averages. |
| **Admin** | `/api/v1/admin` | Document verification queue, approval/rejection, user account suspension, role assignment, and database seeding. |
| **Reports** | `/api/v1/reports` | Care modality breakdown, top requested geographic zones, and executive summary metrics. |
| **History** | `/api/v1/history` | Bidirectional client-caregiver hiring history with sanitized data and duration calculation. |

---

## Getting Started Locally

### Prerequisites
- [Bun](https://bun.sh/) (Runtime & Package Manager)
- [Docker](https://www.docker.com/) & Docker Compose (for local PostgreSQL 16)

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/ItzDsgM/caregiving-system.git
cd caregiving-system
bun install
```

### 2. Environment Configuration
Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

### 3. Start Database
```bash
docker compose up -d postgres
```

### 4. Feed Initial Database Records (Seed)
```bash
bun run seed
```
This seeds the initial Super Admin (`admin@careconnect.com` / `AdminSecret123!`), sample caregivers, clients, job offers, applications, and reviews.

### 5. Run the Development Server
```bash
bun run start:dev
```
The application will start at `http://localhost:3000`.  
Explore the interactive Swagger documentation at **`http://localhost:3000/api/v1/docs`**.

### 6. Running Tests & Quality Gates
```bash
bun run test        # Run Jest unit test suites (33 suites, 338 tests, 100% pass)
bun run test:cov    # Check code coverage (>98% coverage across statements and lines)
bun run test:e2e    # Run end-to-end integration tests (Supertest)
bun run test:postman # Run automated Newman API collection tests
bun run build       # Verify TypeScript compilation (Zero errors)
```

### 7. Production Docker Build
```bash
docker build -t caregiving-system:latest .
docker run -p 3000:3000 --env-file .env caregiving-system:latest
```

---

## Cloud Deployment & Links

* **Live Production API:** [https://caregiving-system.onrender.com/api/v1](https://caregiving-system.onrender.com/api/v1)
* **Production Swagger UI:** [https://caregiving-system.onrender.com/api/v1/docs](https://caregiving-system.onrender.com/api/v1/docs)
* **Technical Workshop Report:** Consult [`INFORME.md`](./INFORME.md) for full endpoint schemas, request/response examples, and architecture documentation.