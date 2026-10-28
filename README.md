# Doctors Appointment App

This workspace contains an Express/MongoDB API in `backend/` and a React/Vite client in `frontend/`.

## Requirements

- Node.js 20 or later
- MongoDB running locally, or a MongoDB connection string

## Configure the backend

In a terminal:

```powershell
cd backend
Copy-Item .env.example .env
```

Set the backend environment values in `backend/.env`, including `MONGODB_URI`, `JWT_SECRET`, `REFRESH_TOKEN_SECRET`, and `COOKIE_SECRET`. Keep these secrets on the server and do not add them to frontend environment variables.

Start the API:

```powershell
npm install
npm run dev
```

The API listens at `http://localhost:5000` and is mounted at `/api/v1`. The default CORS client origin is `http://localhost:5173`.

## Configure the frontend

In another terminal:

```powershell
cd frontend
Copy-Item .env.example .env
npm install
npm run dev
```

Open the Vite URL shown in the terminal (normally `http://localhost:5173`). `VITE_API_BASE_URL` defaults to `http://localhost:5000/api/v1`.

## Verify

```powershell
cd frontend
npm test
npm run build
```

Backend tests can be run separately with `cd backend; npm test`.

## First Admin Account

An admin was not present when the configured MongoDB database was checked. The backend provides `npm run seed:admin`, which creates the first admin using the existing `User` model and its bcrypt password hook. If `ADMIN_PASSWORD` is not set, the script prompts for it without echoing the password. It does not promote existing users, overwrite an existing account, or create another admin when one already exists.

In PowerShell, set the non-secret identity values and run the script from the backend directory:

```powershell
Set-Location 'C:\Users\CASUAL TEE\Videos\hajime code\DoctorsAppointmentApp\backend'
$env:ADMIN_NAME = Read-Host 'Admin display name'
$env:ADMIN_EMAIL = Read-Host 'Admin email'
npm run seed:admin
Remove-Item Env:ADMIN_NAME, Env:ADMIN_EMAIL -ErrorAction SilentlyContinue
```

Enter a password of 10 to 128 characters containing lowercase, uppercase, and numeric characters when prompted. Keep the terminal session private. The password is not written to a file or printed. For production, the script additionally requires typing `CREATE ADMIN` at its confirmation prompt. Do not put admin credentials in frontend environment variables.

Start the backend and frontend using the commands above, then sign in at `http://localhost:5173/login` with the admin email and password entered during setup. The admin sidebar includes **Doctor approvals** at `/admin/doctor-approvals`; it lists pending applications and provides approve/reject actions. These actions are protected by backend admin authorization.

## Authentication and API contract

The API returns a short-lived access token at sign-in; the client holds it in memory and sends it as a bearer token. Refresh tokens are HTTP-only cookies, so API requests use credentials and refresh through `/auth/refresh`. Roles and approval status are read from authenticated backend responses. The UI provides client-side route guards, while the API remains authoritative for permissions.

The client uses the existing `/doctors`, `/appointments`, `/doctor`, `/patients`, `/admin`, `/notifications`, and `/specialties` routes. Doctor availability and appointment slots are loaded from the API and are never generated in the browser.

## Known backend limits surfaced in the UI

- Specialty management supports create, edit, and deactivate; the API does not expose a reactivation endpoint.
- Patient profile updates support name, phone, and profile image; email and passwords cannot be changed through the current API.
- Availability updates support weekly schedules, breaks, unavailable dates, and exceptions; the client exposes each of these controls.
- The API has no patient appointment reschedule endpoint, live updates, or doctor account activation control.
