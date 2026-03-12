# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**EduCare ERP by Concilio** — a multi-tenant School ERP system built for Indian schools (CBSE curriculum). Supports student lifecycle, attendance, fee management, exams, staff HR, and a parent portal.

## Repository Structure

```
ndps-erp/
├── backend/     Node.js/Express TypeScript API (port 5000)
├── frontend/    Next.js 16 React application (port 3000)
└── docker-compose.yml
```

## Development Commands

### Backend (`cd backend`)

```bash
npm run dev          # Start dev server with hot reload (ts-node-dev)
npm run build        # Compile TypeScript to dist/
npm run start        # Run compiled output
npm run migrate      # Run pending Knex migrations
npm run migrate:rollback  # Roll back last migration
npm run seed         # Seed database
npm test             # Run Jest tests
```

### Frontend (`cd frontend`)

```bash
npm run dev          # Start Next.js dev server
npm run build        # Production build
npm run start        # Run production server
npm run lint         # ESLint
```

### Docker (from root)

```bash
docker-compose up    # Start all services (PostgreSQL, backend, frontend)
```

## Architecture

### Backend

- **Framework**: Express.js with TypeScript, strict mode
- **Database**: PostgreSQL via Knex.js query builder; production DB is Supabase-hosted
- **Auth**: JWT (24h access token, 7d refresh), bcryptjs password hashing
- **Key middleware**: Helmet, CORS (localhost:3000), rate limiting (200 req/15min; 20/15min for auth), Winston logging

**Route structure** (`src/routes/`):
- `/api/auth` — login, registration, JWT refresh
- `/api/students` — full student lifecycle
- `/api/attendance` — daily tracking, 75% auto-eligibility enforcement
- `/api/fees` — installments, late fees (configurable via `LATE_FEE_PER_DAY`), Razorpay integration
- `/api/exams` — marks, results, CBSE grading, report cards
- `/api/staff` — leaves, salary processing
- `/api/parent` — read-only parent portal
- `/api/admin/dashboard` — analytics
- `/api/alerts`, `/api/notices`

**Key directories**:
- `src/config/` — env loading, Knex config, Supabase client, Winston logger
- `src/middleware/` — auth.ts (JWT + RBAC), errorHandler.ts, validate.ts
- `src/migrations/` — numbered Knex migration files
- `src/utils/` — auditLog.ts, encryption.ts, sms.ts (MSG91)

### Frontend

- **Framework**: Next.js 16 App Router, React 19, TypeScript
- **Styling**: Tailwind CSS 4 (via PostCSS `@tailwindcss/postcss`), Framer Motion animations
- **Icons**: Lucide React
- **Path alias**: `@/*` → `./src/*`

**Route layout**:
- `/` — Landing page (EduCare branding, dark green `#2d3a2e` / cream `#f5f2ec`)
- `/login`, `/register`, `/signup` — Auth flows
- `/(dashboard)/*` — Protected admin routes (students, attendance, fees, exams, staff, alerts, notices)
- `/parent/*` — Parent portal (attendance, fees, homework, notices, results)

**Key files**:
- `src/lib/api.ts` — API client class used throughout the app
- `src/lib/mockApi.ts` — Mock API for frontend-only development
- `src/contexts/AuthContext.tsx` — Auth state management
- `src/lib/supabase.ts` — Supabase client for frontend

### Multi-tenancy

Each school is isolated by a `school_id` on all relevant DB tables. Roles: owner, co-owner, admin, teacher, parent.

## Environment Setup

Copy `.env.example` to `backend/.env`. Key variables:
- `DB_*` — PostgreSQL connection (or use Supabase connection string)
- `JWT_SECRET`, `JWT_REFRESH_SECRET`
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`
- `MSG91_AUTH_KEY` — SMS notifications
- `LATE_FEE_PER_DAY=50`, `LATE_FEE_MAX=2000`

Frontend uses `frontend/.env.local` with `NEXT_PUBLIC_API_URL` and Supabase credentials.

## Key Domain Logic

- **Attendance eligibility**: 75% threshold enforced server-side in attendance routes
- **Fees**: Support installments, late fee auto-calculation per day (capped at `LATE_FEE_MAX`), Razorpay for online + cash payment tracking
- **Grading**: CBSE grading scale implemented in exam routes
- **Audit trail**: All mutations logged via `src/utils/auditLog.ts`
- **File uploads**: Multer, stored in `UPLOAD_DIR`, served as static files; max size `MAX_FILE_SIZE` (default 5MB)
