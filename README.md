# Competency360

Competency360 is a staff competency and training-gap analysis system built with Next.js, React, TypeScript, Prisma, and PostgreSQL.

**Live deployment:** https://competency360-live.vercel.app

## Features

- Role-based access for HR, supervisors, and staff
- Job-scope-specific competency assessments
- Reverse scoring for negatively worded survey items
- 30% self-assessment and 70% supervisor-assessment weighting
- Required-level gap and priority classification
- Individual and department report views
- Annual assessment cycles and configurable required levels
- Responsive dashboard with an interactive hanging staff profile card

## Technology stack

- Next.js 15 App Router
- React 19
- TypeScript
- Prisma ORM
- PostgreSQL / Neon
- Vercel
- HTTP-only cookie authentication with JWT
- `tsx --test` test runner

## Demo accounts

All demo accounts use password `Password123!`.

| Role | Email |
|---|---|
| HR | hr@competency360.local |
| Supervisor | supervisor@competency360.local |
| System Developer | staff@competency360.local |
| Lecturer | lecturer@competency360.local |
| Admin Officer | officer@competency360.local |

Change demo passwords and remove demo accounts before real organisational use.

## Local setup

### Prerequisites

- Node.js 20.9 or later
- npm
- PostgreSQL

### Install

```powershell
npm install
Copy-Item .env.example .env
```

Set `DATABASE_URL` and `JWT_SECRET` in `.env`.

- `DATABASE_URL` must be a PostgreSQL connection string.
- `JWT_SECRET` must contain at least 32 random characters.

Example:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require"
JWT_SECRET="replace-with-a-random-secret-of-at-least-32-characters"
```

### Initialise the database

```powershell
npx prisma generate
npx prisma db push
npm run db:seed
```

The seed creates departments, job scopes, competencies, survey questions, the 2026 assessment cycle, and demo users.

### Start the application

```powershell
npm run dev
```

Open http://localhost:3000.

## Calculation rules

- Likert score range: 1–5
- Negative item: `6 - original score`
- Self score: average adjusted score for each competency
- Actual score: `(self average × 0.30) + (supervisor score × 0.70)`
- Gap: `max(0, required level - actual score)`
- Critical: gap greater than or equal to 2
- Moderate: gap greater than or equal to 1 and less than 2
- Minor: gap less than 1

Calculations use exact integer arithmetic for boundary handling. Full precision is stored; UI values are shown to two decimal places.

## Testing

```powershell
npm test
```

Tests cover reverse scoring, weighted scoring, category boundaries, integer arithmetic, negative-item averaging, and floating-point regressions.

## Production deployment

The live deployment uses:

- Vercel for Next.js hosting
- Neon PostgreSQL for persistent storage
- `DATABASE_URL` for the database connection
- `JWT_SECRET` for signed HTTP-only session cookies

Configure both variables in the Vercel project settings.

```powershell
npx prisma generate
npx prisma db push
npm run db:seed
npx vercel deploy --prod
```

Run database setup outside serverless startup code for production deployments.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Generate Prisma client and create the production build |
| `npm start` | Start the production server |
| `npm test` | Run calculation tests |
| `npm run lint` | Run TypeScript checking |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:push` | Synchronise the schema with the database |
| `npm run db:migrate` | Create a development migration |
| `npm run db:seed` | Seed demo data |
| `npm run db:studio` | Open Prisma Studio |

## Security notes

- Keep database and JWT secrets out of source control.
- Rotate database passwords immediately if credentials have been exposed.
- Change all demo passwords before real use.
- Add password reset, audit logging, rate limiting, and CSRF/origin protections before processing real employee data.
- This project is an interview-task implementation and has not undergone production security certification.
