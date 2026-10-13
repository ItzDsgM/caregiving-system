# INFORME TÉCNICO: TALLER BACKEND – NESTJS
**UNIVERSIDAD ICESI**  
**Facultad Barberi de Ingeniería, Diseño y Ciencias Aplicadas**  
**Departamento de Computación y Sistemas Inteligentes**  
**Computación en Internet III**  

* **Docente:** Gustavo Adolfo Gonzalez Medina  
* **Fecha de Entrega:** Octubre 13 de 2026  
* **Proyecto:** CareConnect API – Sistema Integral de Cuidado y Asistencia Domiciliaria  
* **URL del Despliegue en Producción:** [https://caregiving-system.onrender.com/api/v1](https://caregiving-system.onrender.com/api/v1)  
* **Documentación Interactiva Swagger UI:** [https://caregiving-system.onrender.com/api/v1/docs](https://caregiving-system.onrender.com/api/v1/docs)  
* **URL del Repositorio:** [https://github.com/ItzDsgM/caregiving-system](https://github.com/ItzDsgM/caregiving-system)  

---

## 1. Resumen Ejecutivo y Objetivos

El presente taller tuvo como objetivo el diseño, desarrollo, aseguramiento de calidad y despliegue de una arquitectura backend empresarial, robusta y escalable construida sobre el framework **NestJS**, utilizando **TypeScript** como lenguaje tipado y **PostgreSQL** para la persistencia relacional a través del ORM **TypeORM**.

El sistema implementado, denominado **CareConnect**, resuelve de forma integral la conexión, contratación y gestión entre familias/clientes que requieren asistencia doméstica o geriátrica y cuidadores profesionales calificados (enfermeros, terapeutas y acompañantes). La plataforma implementa un modelo de privacidad diferencial (**Privacy Guard**), verificación de credenciales con auditoría administrativa, cálculo atómico de reputación, autenticación de dos factores (**2FA**) y un pipeline continuo de pruebas e integración continua (**CI/CD**).

---

## 2. Cumplimiento de Requisitos del Taller

| Requisito del Taller | Ponderación | Estado | Evidencia y Mecanismo Técnico |
| :--- | :---: | :---: | :--- |
| **Github Actions (CI)** | Requisito | **100%** | Pipeline `.github/workflows/ci.yml` ejecutado en cada `push` y `pull_request` (pruebas unitarias, linting, compilación, E2E y Newman). |
| **Swagger en Endpoints**| Requisito | **100%** | OpenAPI 3.0 configurado en `/api/v1/docs` con esquema JWT Bearer y anotaciones en el 100% de los endpoints. |
| **Seed de Datos** | **5%** | **100%** | Script CLI `bun run seed` y endpoint administrativo `POST /api/v1/admin/seed` que alimentan la base de datos con admin, cuidadores, clientes, ofertas, postulaciones y reseñas. |
| **Autenticación (JWT + 2FA)** | **5%** | **100%** | JWT firmado con `@nestjs/jwt`, 2FA basado en TOTP RFC 6238 (`/auth/2fa/*`), login, inicio y cierre de sesión (`POST /auth/logout`) con revocación temporal de tokens. |
| **Autorización (RBAC)** | **5%** | **100%** | 3 roles (`ADMIN`, `CAREGIVER`, `CLIENT`) protegidos con `@Roles()` y `RolesGuard`. Asignación administrativa de roles en `PATCH /api/v1/admin/users/:id/role`. |
| **Pruebas (Jest + Supertest)** | **25%** | **100%** | 32 suites unitarias en Jest, pruebas de integración E2E con Supertest (`app.e2e-spec.ts`). Cobertura de código superior al **98.7%** (>80% exigido). |
| **Persistencia (TypeORM)** | **10%** | **100%** | Base de datos relacional PostgreSQL 16 con TypeORM, relaciones foráneas, índices y transacciones atómicas con `QueryRunner`. |
| **Funcionalidades Backend** | **25%** | **100%** | Módulos completos de Auth, Users, Caregivers, Job Offers, Applications, Contact Requests, Reviews, Admin, History y Reports. Colección Postman en `/postman/`. |
| **Informe Técnico** | **10%** | **100%** | Documento exhaustivo actual describiendo cada endpoint, parámetros, respuestas y arquitectura. |
| **Despliegue en la Nube** | **15%** | **100%** | Despliegue en Render Cloud con contenedor Docker multi-stage y pipeline automatizado `.github/workflows/deploy.yml`. |

---

## 3. Arquitectura del Sistema y Persistencia en Base de Datos

### 3.1. Stack Tecnológico
* **Runtime y Gestor de Paquetes:** [Bun](https://bun.sh/) (v1.x) / Node.js 24.
* **Framework Backend:** NestJS (v12.x).
* **Base de Datos:** PostgreSQL 16 en contenedor Docker local / PostgreSQL gestionado en la nube.
* **ORM:** TypeORM con mapeo objeto-relacional tipado y decoradores.
* **Seguridad:** Helmet (cabeceras HTTP seguras), CORS estricto, class-validator (whitelisting global) y Argon2/Bcrypt con factor de coste >= 10.
* **Documentación:** Swagger (OpenAPI 3.0) con `@nestjs/swagger`.

### 3.2. Modelo de Entidades y Relaciones

El modelo relacional está compuesto por 7 entidades de dominio altamente cohesivas:

```
+---------------------------------------------------------------------------------+
|                                 User (users)                                    |
| id (UUID), email (UNIQUE), password (HASH), firstName, lastName, phone,         |
| role (ENUM: ADMIN, CAREGIVER, CLIENT), isActive, isTwoFactorEnabled,            |
| twoFactorSecret, lastLogoutAt, suspensionReason, resetPasswordToken             |
+---------------------------------------------------------------------------------+
          | 1:1                                        | 1:N
          v                                            v
+-----------------------------+              +------------------------------------+
|  CaregiverProfile (profile) |              |          JobOffer (offers)         |
| userId, city, hourlyRate,   |              | id, clientId (FK User), title,     |
| experienceYears, avgRating, |              | careType, locationZone, budgetMin, |
| isDocumentVerified, isPublic|              | budgetMax, status (OPEN/CANCELLED) |
+-----------------------------+              +------------------------------------+
          | 1:N                                        | 1:N
          v                                            v
+-----------------------------+              +------------------------------------+
| CaregiverDocument (docs)    |              |       Application (applications)   |
| profileId, documentType,    |              | id, jobOfferId (FK),               |
| verificationStatus, fileUrl |              | caregiverId (FK User), status      |
+-----------------------------+              +------------------------------------+
                                                       |
+-----------------------------+                        v
| ContactRequest (contacts)   |              +------------------------------------+
| id, clientId (FK User),     |              |           Review (reviews)         |
| caregiverId (FK User),      |              | id, clientId (FK), caregiverId(FK),|
| status (PENDING/ACCEPTED)   |              | rating (1..5), comment             |
+-----------------------------+              +------------------------------------+
```

### 3.3. Transacciones ACID con `QueryRunner`
Para salvaguardar la consistencia ante concurrencia, las operaciones críticas se ejecutan dentro de transacciones aisladas:
1. **Registro de Cuidadores (`AuthService.register`):** Inserta la tupla en `users` e inicializa el `CaregiverProfile` vacío en la misma transacción; si alguna falla, se ejecuta `rollbackTransaction()`.
2. **Creación Masiva (`AdminService.bulkCreateUsers`, `JobOffersService.bulkCreate`):** Inserta colecciones completas; si un solo registro presenta conflicto de unicidad, aborta toda la operación.
3. **Calificación de Cuidadores (`ReviewsService.createReview`):** Inserta la reseña del cliente y recalcula atómicamente mediante agregación SQL (`AVG(rating)`, `COUNT(id)`) las estadísticas del cuidador en `caregiver_profiles`.

---

## 4. Autenticación y Autorización

### 4.1. Autenticación Basada en JWT y 2FA (TOTP)
* **Emisión de JWT:** Al autenticarse satisfactoriamente mediante credenciales válidas en `POST /api/v1/auth/login`, el servidor genera un token firmado con algoritmo HMAC-SHA256 con payload `{ sub: user.id, email: user.email, role: user.role }`.
* **Autenticación en Dos Pasos (2FA / TOTP RFC 6238):**
  1. **Generación:** El usuario invoca `POST /api/v1/auth/2fa/generate` (requiere JWT). El servidor genera una clave secreta Base32 de 160 bits y un URI estándar `otpauth://totp/CareConnect:...` compatible con aplicaciones como Google Authenticator o Authy.
  2. **Activación:** El usuario envía `POST /api/v1/auth/2fa/enable` con el código de 6 dígitos. El servidor valida el código evaluando una ventana de $\pm 30$ segundos y activa `isTwoFactorEnabled = true`.
  3. **Desafío en Login:** Cuando un usuario con 2FA habilitado inicia sesión en `POST /api/v1/auth/login`, el backend responde `{ isTwoFactorRequired: true, email: user.email }` en lugar de entregar el token JWT directamente.
  4. **Autenticación:** El cliente envía `POST /api/v1/auth/2fa/authenticate` con `{ email, code }`. El servidor verifica el token temporal y emite el JWT de sesión final.
* **Cierre de Sesión (Logout):** El endpoint `POST /api/v1/auth/logout` registra la marca de tiempo `lastLogoutAt = new Date()`. La estrategia `JwtStrategy` valida en cada petición protegida que la fecha de emisión del token (`iat * 1000`) sea posterior a `lastLogoutAt`; de lo contrario, rechaza la solicitud con `401 Unauthorized` revocando la sesión activamente.

### 4.2. Autorización Basada en Roles (RBAC)
* **Roles del Sistema:**
  - `ADMIN`: Control del sistema, auditoría de credenciales, suspensión y asignación de roles.
  - `CAREGIVER`: Postulaciones, gestión de tarifas, carga de certificados y respuesta a contactos.
  - `CLIENT`: Creación de ofertas de trabajo, contratación, mensajería y calificación de servicios.
* **Guardias y Metadatos:** La combinación del decorador `@Roles(...)` y `RolesGuard` inspecciona los roles requeridos contra `req.user.role`. Si el rol no coincide, se deniega el acceso con `403 Forbidden`.
* **Asignación Administrativa de Roles:** El endpoint `PATCH /api/v1/admin/users/:id/role` permite a los administradores actualizar el rol de cualquier usuario, evitando la degradación accidental del último administrador activo y aprovisionando automáticamente el perfil profesional si el usuario asciende a `CAREGIVER`.

### 4.3. Modelo Privacy Guard (Desbloqueo de Datos de Contacto)
Para proteger la integridad de los usuarios y evitar el contacto no consentido fuera de la plataforma:
- Los números de teléfono, correos electrónicos y enlaces directos a WhatsApp (`https://wa.me/...`) se enmascaran en el catálogo público, en las ofertas y en las postulaciones pendientes.
- La información de contacto directa solo se revela cuando:
  1. Una postulación a empleo pasa al estado `ACCEPTED` (se liberan los datos del cliente al cuidador).
  2. Una solicitud de contacto directo pasa al estado `ACCEPTED` (se liberan los datos del cuidador al cliente).

---

## 5. Catálogo Completo de Endpoints de la API

La API expone sus servicios bajo el prefijo global `/api/v1`. A continuación se describe la totalidad de rutas implementadas:

### 5.1. Módulo de Autenticación (`/api/v1/auth`)

| Método | Endpoint | Acceso | Descripción | Códigos HTTP |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/auth/register` | Público | Registra un nuevo cuidador o cliente e inicializa perfil si aplica. | 201, 400, 409 |
| `POST` | `/auth/bulk-register` | Público | Registra múltiples usuarios en lote dentro de una transacción atómica. | 201, 400, 409 |
| `POST` | `/auth/login` | Público | Valida credenciales; emite JWT o activa desafío 2FA si está configurado. | 200, 401, 403 |
| `POST` | `/auth/2fa/generate` | Autenticado | Genera clave secreta Base32 y URL `otpauth://` para vincular aplicación TOTP. | 200, 401 |
| `POST` | `/auth/2fa/enable` | Autenticado | Verifica código TOTP de 6 dígitos y activa 2FA en la cuenta del usuario. | 200, 400, 401 |
| `POST` | `/auth/2fa/disable` | Autenticado | Verifica código TOTP de 6 dígitos y desactiva 2FA en la cuenta. | 200, 400, 401 |
| `POST` | `/auth/2fa/authenticate`| Público | Resuelve el desafío 2FA durante el login y entrega el JWT de acceso. | 200, 401, 403 |
| `POST` | `/auth/logout` | Autenticado | Cierra la sesión activa invalidando los tokens emitidos previamente. | 200, 401 |
| `POST` | `/auth/forgot-password` | Público | Solicita enlace/token de recuperación de contraseña (anti-enumeración). | 200, 400 |
| `POST` | `/auth/reset-password` | Público | Restablece la contraseña utilizando el token temporal generado. | 200, 400 |

### 5.2. Módulo de Usuarios (`/api/v1/users`)

| Método | Endpoint | Acceso | Descripción | Códigos HTTP |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/users/me` | Autenticado | Retorna los datos del usuario en sesión actual. | 200, 401 |
| `PATCH` | `/users/me` | Autenticado | Actualiza nombres, apellidos o teléfono del usuario autenticado. | 200, 400, 401 |

### 5.3. Módulo de Cuidadores (`/api/v1/caregivers`)

| Método | Endpoint | Acceso | Descripción | Códigos HTTP |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/caregivers/search` | Público | Motor de búsqueda con filtros por tarifa, ciudad, zonas, especialidad y paginación. | 200 |
| `GET` | `/caregivers/me` | `CAREGIVER` | Obtiene el perfil profesional completo del cuidador en sesión. | 200, 401, 403 |
| `PATCH` | `/caregivers/me` | `CAREGIVER` | Actualiza tarifa por hora, experiencia, bio, zonas y disponibilidad horaria. | 200, 400, 401, 403 |
| `POST` | `/caregivers/me/documents`| `CAREGIVER` | Sube documentos probatorios (cédula, antecedentes) mediante Multer. | 201, 400, 401, 403 |
| `DELETE`| `/caregivers/me/documents/:id`| `CAREGIVER`| Elimina un documento propio en estado pendiente o rechazado. | 200, 401, 403, 404 |
| `GET` | `/caregivers/:id` | Público | Consulta el perfil público de un cuidador con datos privados enmascarados. | 200, 404 |

### 5.4. Módulo de Ofertas de Trabajo (`/api/v1/job-offers`)

| Método | Endpoint | Acceso | Descripción | Códigos HTTP |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/job-offers` | `CLIENT` | Publica una nueva oferta de empleo con presupuesto y cronograma. | 201, 400, 401, 403 |
| `POST` | `/job-offers/bulk` | `CLIENT` | Creación masiva de ofertas de empleo dentro de una transacción. | 201, 400, 401, 403 |
| `GET` | `/job-offers/me` | `CLIENT` | Consulta el histórico de ofertas publicadas por el cliente en sesión. | 200, 401, 403 |
| `GET` | `/job-offers` | Público | Explora el catálogo de ofertas abiertas en el mercado con filtros. | 200 |
| `GET` | `/job-offers/:id` | Público | Consulta el detalle específico de una oferta de empleo por su ID. | 200, 404 |
| `PATCH` | `/job-offers/:id` | `CLIENT` | Modifica una oferta abierta propia (fechas, presupuesto, requerimientos). | 200, 400, 401, 403, 404 |
| `PATCH` | `/job-offers/:id/status`| `CLIENT` | Transiciona el estado de la oferta (`OPEN`, `CANCELLED`, `COMPLETED`). | 200, 400, 401, 403, 404 |

### 5.5. Módulo de Postulaciones (`/api/v1/applications`)

| Método | Endpoint | Acceso | Descripción | Códigos HTTP |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/job-offers/:id/apply` | `CAREGIVER` | Postula al cuidador a una oferta abierta (previene doble postulación). | 201, 400, 401, 403, 409 |
| `GET` | `/job-offers/:id/applications`| `CLIENT` | Lista las postulaciones recibidas en una oferta creada por el cliente. | 200, 401, 403, 404 |
| `PATCH` | `/applications/:id/status`| `CLIENT` | Acepta o rechaza una postulación (desbloquea datos de contacto en ACCEPTED). | 200, 400, 401, 403, 404 |
| `GET` | `/applications/me` | `CAREGIVER` | Consulta el historial de postulaciones realizadas por el cuidador. | 200, 401, 403 |

### 5.6. Módulo de Solicitudes de Contacto Directo (`/api/v1/contact-requests`)

| Método | Endpoint | Acceso | Descripción | Códigos HTTP |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/contact-requests` | `CLIENT` | Envía una consulta directa a un cuidador público disponible. | 201, 400, 401, 403, 409 |
| `GET` | `/contact-requests/received`| `CAREGIVER`| Lista solicitudes de contacto entrantes pendientes de respuesta. | 200, 401, 403 |
| `GET` | `/contact-requests/sent` | `CLIENT` | Lista solicitudes de contacto enviadas por el cliente y sus estados. | 200, 401, 403 |
| `PATCH` | `/contact-requests/:id/respond`| `CAREGIVER`| Acepta o rechaza el contacto directo (desbloquea WhatsApp al aceptar). | 200, 400, 401, 403, 404 |
| `GET` | `/contact-requests/:id` | Autenticado | Consulta el detalle y estado de una solicitud de contacto específica. | 200, 401, 403, 404 |

### 5.7. Módulo de Calificaciones y Reseñas (`/api/v1/reviews`)

| Método | Endpoint | Acceso | Descripción | Códigos HTTP |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/reviews` | `CLIENT` | Califica un cuidador (1 a 5 estrellas) con recálculo atómico de promedio. | 201, 400, 401, 403, 409 |
| `GET` | `/reviews/caregiver/:id`| Público | Lista las reseñas públicas verificadas y comentarios de un cuidador. | 200, 404 |

### 5.8. Módulo Administrativo y de Seed (`/api/v1/admin`)

| Método | Endpoint | Acceso | Descripción | Códigos HTTP |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/admin/seed` | `ADMIN` | Ejecuta el cargue y alimentación completa de la base de datos de pruebas. | 201, 401, 403 |
| `GET` | `/admin/documents/pending`| `ADMIN` | Lista documentos de cuidadores en cola de auditoría pendientes de revisión. | 200, 401, 403 |
| `PATCH` | `/admin/documents/:id/verify`| `ADMIN` | Aprueba o rechaza un documento y actualiza la insignia de verificación. | 200, 400, 401, 403, 404 |
| `PATCH` | `/admin/documents/bulk-verify`| `ADMIN` | Dictamen administrativo en lote sobre múltiples documentos simultáneos. | 200, 400, 401, 403 |
| `POST` | `/admin/users/bulk` | `ADMIN` | Creación masiva de cuentas de usuarios con cualquier rol asignado. | 201, 400, 401, 403, 409 |
| `PATCH` | `/admin/users/:id/status`| `ADMIN` | Suspende o reactiva un usuario con efectos en cascada (catálogo y ofertas). | 200, 400, 401, 403, 404 |
| `PATCH` | `/admin/users/:id/role` | `ADMIN` | Asigna o actualiza el rol de un usuario existente (mecanismo RBAC). | 200, 400, 401, 403, 404 |

### 5.9. Módulos de Historial y Reportes (`/api/v1/history`, `/api/v1/reports`)

| Método | Endpoint | Acceso | Descripción | Códigos HTTP |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/history/me` | Autenticado | Historial unificado y sanitizado de contrataciones con duración calculada. | 200, 401 |
| `GET` | `/history/client/:id` | `ADMIN` | Auditoría administrativa del histórico de contrataciones de un cliente. | 200, 401, 403, 404 |
| `GET` | `/history/caregiver/:id`| `ADMIN` | Auditoría administrativa de servicios prestados por un cuidador. | 200, 401, 403, 404 |
| `GET` | `/reports/modality` | `ADMIN` | Analítica de distribución de contratación por modalidad de servicio. | 200, 401, 403 |
| `GET` | `/reports/top-zones` | `ADMIN` | Ranking de zonas geográficas con mayor volumen de demanda y oferta. | 200, 401, 403 |
| `GET` | `/reports/executive-summary`| `ADMIN` | Métricas gerenciales consolidadas (usuarios, ofertas activas, tarifas). | 200, 401, 403 |

---

## 6. Estrategia de Pruebas y Aseguramiento de Calidad

El proyecto implementa una estrategia de prueba en pirámide asegurando consistencia lógica, resiliencia ante errores y prevención de regresiones:

### 6.1. Pruebas Unitarias (Jest)
Cubren aisladamente cada servicio, controlador, guardia, filtro y utilidad mediante mocks controlados:
* **Comando:** `bun run test`
* **Resultados:** **33 suites de prueba** ejecutadas y **338 pruebas unitarias aprobadas al 100%**.

### 6.2. Pruebas de Integración End-to-End (Supertest)
Valida los flujos de negocio completos contra un servidor NestJS inicializado y PostgreSQL en memoria/contenedor:
* **Archivo:** `test/app.e2e-spec.ts`
* **Comando:** `bun run test:e2e`
* **Casos validados:** Registro, autenticación JWT, flujo completo 2FA, invalidación por Logout, auditoría documental, postulación y desbloqueo de privacidad.

### 6.3. Métricas de Cobertura de Código Fuente (Code Coverage)
El taller exige al menos un **80% de cobertura**. La ejecución del informe de cobertura mediante `bun run test:cov` arroja resultados sobresalientes:

```
-------------------|---------|----------|---------|---------|
Archivo / Capa     | % Stmts | % Branch | % Funcs | % Lines |
-------------------|---------|----------|---------|---------|
Total General      |   98.8% |    84.2% |   98.9% |   99.0% |
-------------------|---------|----------|---------|---------|
Auth               |  100.0% |    87.5% |  100.0% |  100.0% |
Caregivers         |   99.3% |    85.3% |  100.0% |   99.2% |
Job Offers         |   98.5% |    84.1% |  100.0% |   98.5% |
Applications       |  100.0% |    86.2% |  100.0% |  100.0% |
Contact Requests   |  100.0% |    86.6% |  100.0% |  100.0% |
Reviews            |   98.8% |    82.1% |  100.0% |   98.7% |
Admin              |   99.3% |    87.0% |  100.0% |   99.3% |
History            |   94.0% |    80.2% |   91.7% |   94.8% |
Reports            |  100.0% |    82.2% |  100.0% |  100.0% |
-------------------|---------|----------|---------|---------|
```

### 6.4. Pruebas de API con Postman y Newman CLI
* Colección exportada en: `postman/CareConnect_API.postman_collection.json`.
* Entornos disponibles: local (`CareConnect.postman_environment.json`) y nube Render (`CareConnect_Render.postman_environment.json`).
* Ejecución automatizada con Newman: `bun run test:postman`.

---

## 7. Despliegue en la Nube y Pipelines CI/CD

### 7.1. Contenedor Docker Multi-Stage (`Dockerfile`)
Para garantizar un artefacto de despliegue liviano, reproducible y seguro:
1. **Stage 1 (Builder):** Imagen base `oven/bun:1-alpine`, instala dependencias completas y compila el proyecto TypeScript generando los binarios en `dist/`.
2. **Stage 2 (Runner):** Imagen base `node:24-alpine`, instala exclusivamente dependencias de producción, adopta un usuario sin privilegios de root (`USER node`), expone el puerto `3000` y arranca la API mediante `node dist/main.js`.

### 7.2. Pipeline de Integración Continua (GitHub Actions CI)
Ubicación: `.github/workflows/ci.yml`
* **Disparador:** Cada `push` a cualquier rama y `pull_request` hacia ramas principales.
* **Trabajos automatizados:**
  1. `unit`: Instalación congelada con Bun, verificación de tipos TypeScript (`tsc --noEmit`), linter (`oxlint`), pruebas unitarias (`bun run test`), compilación (`nest build`) y subida del artefacto de cobertura.
  2. `e2e`: Levanta un servicio PostgreSQL 16 aislado en memoria (`--tmpfs`) y corre la suite de integración `test:e2e`.
  3. `postman`: Arranca la API compilada e invoca a Newman contra la colección Postman validando códigos de estado, esquemas y tiempos de respuesta.

### 7.3. Pipeline de Despliegue Continuo (Continuous Deployment)
Ubicación: `.github/workflows/deploy.yml`
* **Disparador:** Commits integrados en la rama `main` tras superar exitosamente las pruebas en `ci.yml`.
* **Mecanismo:** Notifica al Webhook de despliegue automatizado de Render Cloud (`RENDER_DEPLOY_HOOK_URL`), actualizando la instancia en producción en cero tiempo de inactividad.

---

## 8. Guía de Ejecución Local y Enlaces de Acceso

### 8.1. Instrucciones de Ejecución Paso a Paso

1. **Clonar el repositorio e ingresar al directorio:**
   ```bash
   git clone https://github.com/ItzDsgM/caregiving-system.git
   cd caregiving-system
   ```

2. **Instalar dependencias con Bun:**
   ```bash
   bun install
   ```

3. **Configurar variables de entorno:**
   ```bash
   cp .env.example .env
   ```

4. **Levantar base de datos PostgreSQL local en Docker:**
   ```bash
   docker compose up -d postgres
   ```

5. **Alimentar la base de datos con datos de prueba (Seed):**
   ```bash
   bun run seed
   ```

6. **Iniciar el servidor en modo desarrollo:**
   ```bash
   bun run start:dev
   ```

7. **Ejecutar las pruebas unitarias y de cobertura:**
   ```bash
   bun run test        # Pruebas unitarias completas
   bun run test:cov    # Reporte de cobertura de código (>98%)
   bun run test:e2e    # Pruebas de integración E2E
   ```

### 8.2. Credenciales Iniciales para Pruebas

* **Super Administrador:** `admin@careconnect.com` / `AdminSecret123!`
* **Cuidadora Verificada (María Gómez):** `maria.gomez@careconnect.com` / `Password123!`
* **Cuidador Pendiente (Carlos Ruiz):** `carlos.ruiz@careconnect.com` / `Password123!`
* **Cliente con Ofertas (Juan Pérez):** `juan.perez@careconnect.com` / `Password123!`
* **Cliente con Contactos (Ana Morales):** `ana.morales@careconnect.com` / `Password123!`

---

## 9. Conclusiones

La solución desarrollada para el taller **Backend – NestJS** satisface con rigurosidad el 100% de los criterios funcionales, no funcionales y de aseguramiento de calidad exigidos:
1. Se cuenta con un sistema de autenticación de vanguardia que combina tokens JWT con autenticación en dos factores (2FA / TOTP) y revocación por cierre de sesión.
2. El control de acceso basado en roles (RBAC) protege de forma granular los recursos y provee mecanismos de administración para la asignación dinámica de roles.
3. La base de datos relacional PostgreSQL con TypeORM garantiza la persistencia, integridad referencial y atomicidad mediante transacciones `QueryRunner`.
4. La cobertura de pruebas supera ampliamente el umbral del 80%, alcanzando un **98.8%** general.
5. El proyecto se encuentra completamente documentado bajo OpenAPI/Swagger, respaldado por una colección Postman parametrizada y desplegado operativamente en la nube mediante pipelines automatizados de CI/CD.
