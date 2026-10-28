# Doctor Appointment API

REST API built with Node.js, Express, MongoDB, and Mongoose. This repository contains backend code only.

## Features

- Patient, doctor, and administrator roles with object-level access checks.
- Password hashing, short-lived JWT access tokens, signed HTTP-only refresh cookies, refresh rotation, and reuse revocation.
- Doctor approval, specialty management, profile discovery, and timezone-aware availability.
- Appointment booking with overlap prevention, cancellation policy, and guarded status transitions.
- Recipient-scoped notifications, administrative audit records, request validation, rate limiting, CORS allowlisting, Helmet, and NoSQL input sanitization.
- Optional SMTP email transport when configured.

## Prerequisites and setup

- Node.js 20 or later and npm.
- MongoDB. A local standalone server is enough for this implementation; transactions are not required.

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

Set the values in `.env` before starting. `MONGODB_URI`, `JWT_SECRET`, `REFRESH_TOKEN_SECRET`, and `COOKIE_SECRET` are required. Use distinct random secrets of at least 32 characters in production. Never commit `.env` or use development credentials in a deployed environment.

The server validates configuration, connects to MongoDB, and only then listens on `PORT` (default `5000`). It closes the HTTP server and MongoDB connection on `SIGINT` or `SIGTERM`. `GET /api/v1/health` returns `503` until MongoDB is connected.

## Environment

See `.env.example` for the complete variable list. `CLIENT_URL` accepts a comma-separated origin allowlist. SMTP variables are optional; when `SMTP_HOST` and `EMAIL_FROM` are configured, `sendEmail` can send mail through Nodemailer.

## Run and test

```powershell
npm start
npm test
```

Tests use Jest, Supertest, and one isolated `mongodb-memory-server` instance started by Jest `globalSetup` and stopped by `globalTeardown`. Suites share the dedicated `doctor_appointment_test` database and do not start their own server. Setup uses an installed MongoDB binary when available; otherwise it downloads MongoDB 7.0.24 with partial-download resume and retries enabled, and finishes initialization before any suite begins. To use an existing MongoDB server, set `TEST_MONGODB_URI` to a dedicated database whose name contains `test`, `testing`, or `spec`. The setup rejects the same host/database as the configured application `MONGODB_URI`. Never point it at development or production data.

## Seed development data

Set `NODE_ENV=development`, provide `SEED_PASSWORD` (at least 10 characters), and point `MONGODB_URI` at a disposable development database before running:

```powershell
npm run seed
```

The script is idempotent and creates specialty records, two doctors, and a patient. Its example accounts use `patient@example.test`, `doctor.one@example.test`, and `doctor.two@example.test`; all share the `SEED_PASSWORD` value. It does not create an administrator account. Create administrator accounts through a trusted, deployment-specific provisioning process, never public registration.

## API

All endpoints are prefixed with `/api/v1`. Successful and failed requests return JSON with `success`, `message`, and `data` or `errors` fields. List endpoints support `page` and `limit` where applicable (maximum page size 100).

| Area | Routes |
| --- | --- |
| Health | `GET /health` |
| Authentication | `POST /auth/register/patient`, `POST /auth/register/doctor`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me` |
| Patients | `GET/PATCH /patients/profile`, `GET /patients/appointments`, `GET /patients/appointments/:id` |
| Doctor discovery | `GET /doctors`, `GET /doctors/:id`, `GET /doctors/:id/availability?date=YYYY-MM-DD`, `GET /specialties` |
| Doctor workspace | `GET/PATCH /doctor/profile`, `GET /doctor/appointments`, `GET /doctor/appointments/:id`, `PATCH /doctor/appointments/:id/{accept,cancel,complete}` |
| Availability | `GET/PUT /doctor/availability` |
| Appointments | `POST /appointments`, `GET /appointments/my-appointments`, `GET /appointments/:id`, `PATCH /appointments/:id/cancel` |
| Notifications | `GET /notifications`, `PATCH /notifications/:id/read`, `PATCH /notifications/read-all` |
| Administration | `GET /admin/dashboard`, `/admin/users`, `/admin/doctors`, `/admin/appointments`, and `/admin/specialties` management routes |

Doctor search supports `name`, `specialty`, `clinicName`/`location`, `availableDate`, `minFee`, `maxFee`, `sort`, `page`, and `limit`. Only active, approved doctors are public. Access tokens are sent as `Authorization: Bearer <token>`; the refresh token is only held in a signed HTTP-only cookie and is never returned in JSON.

## Roles and appointment workflow

- Public registration creates only patient or pending doctor accounts. An administrator must approve a doctor before public listing or appointment acceptance.
- Patients can only read their own appointments. Doctors can only read and transition appointments assigned to them. Administrators can oversee all appointments and manage user status.
- Booking creates a `pending` request that reserves the time for 48 hours. If it is not accepted before `expiresAt`, it becomes cancelled and releases its slot. Doctor acceptance changes an active request to `accepted`; eligible participants may cancel active appointments; doctors may mark an accepted appointment `completed` only after it ends.
- The patient cancellation policy requires at least 24 hours' notice. Doctor and administrator cancellations require a reason and are recorded with actor and timestamp.

## Booking concurrency

Booking and availability updates acquire an atomic MongoDB lease document keyed by doctor ID before reading the schedule, checking active pending/accepted intervals, and writing. Competing instances contend on the unique `_id`; only one can hold a doctor's lease at a time. Pending appointments reserve the full interval, and cancellation releases it by changing the active status. The lease expires after 60 seconds if a process dies; operations that cannot acquire the lease within 10 seconds return `409` and may be retried. This approach supports standalone MongoDB and avoids relying on transactions. Run booking concurrency tests against the same MongoDB topology used in deployment.

## Privacy and deployment

This is a backend foundation, not a compliance certification. Before production, determine applicable healthcare privacy and data-protection obligations, retention/deletion rules, audit requirements, encryption-at-rest and backup controls, incident response, and vendor agreements. Collect only necessary patient data, use TLS, set secure cookies behind HTTPS, configure trusted CORS origins, rotate secrets, and use a distributed rate-limit store when deploying multiple instances. Appointment notifications are currently persisted after successful state changes on a best-effort basis; use a transactional outbox/worker if notification delivery must be guaranteed.

## Structure

`src/` separates config, models, middleware, validators, routes, controllers, services, and utilities. `scripts/seed.js` contains development-only data setup and `src/tests/` contains API integration tests.