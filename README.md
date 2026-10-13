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

- **Role-Based Access Control (RBAC):** Distinct permissions for `CAREGIVER`, `CLIENT`, and `ADMIN` enforced via `@Roles()` decorators and `RolesGuard`.
- **Privacy Unlocking Model:** Caregiver contact details (phone, email) remain masked from public listings until a formal contact request or job application is accepted.
- **Document Audit Engine:** Secure uploads for identity documents, background checks, and certifications, verified by administrators to grant trust badges.
- **Atomic Reputation & Ratings:** 1–5 star client reviews calculate weighted average ratings atomically to prevent race conditions.
- **Analytics & History:** Geographic zone demand metrics, care modality reports, and bidirectional engagement history with duration tracking.
- **Standardized Error Handling:** Global `HttpExceptionFilter` ensuring RFC-compliant `{ statusCode, message, timestamp, path }` error envelopes.
- **Interactive OpenAPI/Swagger:** Fully annotated interactive documentation available at `/api/v1/docs` with input schemas, return payloads, and error examples.

---

## Domain Modules & API Endpoints

| Module | Route Prefix | Key Functionalities |
| :--- | :--- | :--- |
| **Auth** | `/api/v1/auth` | User registration, bulk registration, JWT login, and secure password recovery. |
| **Users** | `/api/v1/users` | Current user profile retrieval and account details updates. |
| **Caregivers** | `/api/v1/caregivers` | Profile setup (rates, experience, bio, schedule), document upload, and public search engine. |
| **Job Offers** | `/api/v1/job-offers` | Job postings, search by city/modality/budget, bulk creation, and applicant retrieval. |
| **Applications** | `/api/v1/applications` | Job applications with cover letters and rate proposals; accept/reject transitions. |
| **Contact Requests**| `/api/v1/contact-requests` | Direct client-caregiver messaging with contact info unlocking upon acceptance. |
| **Reviews** | `/api/v1/reviews` | Verified ratings (1–5) and client feedback with auto-updated caregiver rating averages. |
| **Admin** | `/api/v1/admin` | Document verification queue, document approval/rejection, user account suspension. |
| **Reports** | `/api/v1/reports` | Care modality breakdown, top requested geographic zones, and verification metrics. |
| **History** | `/api/v1/history` | Bidirectional client-caregiver hiring history with sanitized data and duration calculation. |

---

## Getting Started Locally

### Prerequisites
- [Bun](https://bun.sh/) (Runtime & Package Manager)
- [Docker](https://www.docker.com/) & Docker Compose (for local PostgreSQL 16)

### 1. Clone & Install Dependencies
```bash
git clone <repository-url>
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

### 4. Run the Development Server
```bash
bun run start:dev
```
The application will start at `http://localhost:3000`.  
Explore the interactive Swagger documentation at **`http://localhost:3000/api/v1/docs`**.

### 5. Running Tests
```bash
bun run test        # Run Jest unit and service test suites (32 suites, 322 tests)
bun run test:e2e    # Run end-to-end integration tests
bun run build       # Verify TypeScript compilation
```