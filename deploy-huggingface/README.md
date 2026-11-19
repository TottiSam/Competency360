---
title: Competency360
emoji: 📊
colorFrom: green
colorTo: yellow
sdk: docker
app_port: 7860
pinned: false
short_description: Staff competency and gap analysis system
---

> Hosted demo: this Space runs the app in Docker with a SQLite database that is re-created with the demo data every time the Space restarts. Sign in with any of the demo accounts listed below.

# Competency360

Staff Competency & Gap Analysis System built with Next.js App Router, TypeScript, Prisma and SQLite.

## Requirements
- Node.js 20.9 or later
- npm
- No Docker or separate database server is required; SQLite is file-based

## 1. Install

```bash
npm install
```

## 2. Configure environment

Copy `.env.example` to `.env`. The SQLite database file is created automatically by Prisma. Set a strong `JWT_SECRET` (at least 32 random characters).

PowerShell:
```powershell
Copy-Item .env.example .env
```

## 3. Create database tables and seed demo data

```bash
npx prisma generate
npx prisma db push
npm run db:seed
```

The seed creates the System Developer, Lecturer and Admin Officer job scopes, departments, competencies, 15 survey questions (5 per job scope), the 2026 assessment cycle if it does not already exist, and demo users. Re-running the seed will not reopen a cycle that HR has closed.

## 4. Start the application

```bash
npm run dev
```

Open http://localhost:3000.

## Demo accounts

All demo accounts use password `Password123!`.

| Role | Email |
|---|---|
| HR | hr@competency360.local |
| Supervisor | supervisor@competency360.local |
| Staff (System Developer) | staff@competency360.local |
| Staff (Lecturer) | lecturer@competency360.local |
| Staff (Admin Officer) | officer@competency360.local |

Change demo passwords and remove demo accounts before any real deployment.

## Main workflows

1. Sign in as a staff member and submit the self-assessment.
2. Sign in as the assigned supervisor and rate each direct report's competencies.
3. The system reverse-scores negatively worded questions, calculates the average self score per competency, applies the 30% self / 70% supervisor weighting, and stores the final competency results.
4. Staff can view their own individual report. Supervisors can view direct-report results. HR can view department reports and configure job scopes, competencies, required levels, questions and assessment cycles.

## Calculation rules

- Likert response: 1–5.
- Negative item adjusted score: `6 - original score`.
- Self score: average of adjusted responses mapped to the competency.
- Actual: `(self average × 0.30) + (supervisor score × 0.70)`.
- Gap: `max(0, required level - actual)`.
- Critical: gap `>= 2`.
- Moderate: gap `>= 1` and `< 2`.
- Minor: gap `< 1`.

Full precision is stored; the UI displays two decimal places.

## Notes / assumptions

- Staff can edit their answers until the assessment cycle closes. If the supervisor has already rated them, the results are recalculated automatically on save.
- A staff member's survey questions are determined by their assigned job scope.
- Default required levels are configured per job scope and competency. HR can override required levels per assessment cycle, preserving annual requirements independently.
- One assessment per staff member per cycle is enforced by a database unique constraint.
- The assessment cycle must be open for submissions and supervisor reviews.
- Supervisors can rate only direct reports. HR can review any staff assessment through the supervisor review endpoint.
- The demo seed creates one direct-report relationship for the supervisor account. Assign additional supervisors in the database or extend the HR staff management screen before production use.
- This is an interview-task implementation, not a production-certified HR platform. Before production, add password reset, audit logging, CSRF/origin protections for cookie-authenticated mutations, rate limiting, automated tests, full staff CRUD and deployment secrets management.

## Useful commands

```bash
npm run db:studio
npx prisma validate
npx prisma db push
```

## UI theme
`app/theme-sage.css` is a sage + lime soft-UI theme loaded after `globals.css`. To return to the original rose theme, delete the `import ./theme-sage.css` line in `app/layout.tsx`.

## Calculation tests

```bash
npm test
```

The tests cover reverse scoring, the 30/70 weighted score, category boundaries and scores above the required level.

## Windows PowerShell quick start

Run these commands from the extracted `competency360` folder:

```powershell
Copy-Item .env.example .env
npm install
npx prisma generate
npx prisma db push
npm run db:seed
npm run dev
```

Use a normal PowerShell window for these commands; administrator mode is not normally required. No Docker is needed because the database is a local SQLite file.


## Scenic glass dashboard update

The overview dashboard now uses a soft farm-inspired sky and rolling-landscape wallpaper treatment behind the content. The hanging staff profile/name-tag cards remain in the foreground with their cords, hooks, gentle swing animation, and hover lift. Assessment statistics and report panels use translucent glass styling.

The existing SQLite configuration, authentication, assessments, supervisor reviews, reports, and system setup are retained.

Run locally without Docker:
1. `npm install`
2. `npx prisma generate`
3. `npx prisma db push`
4. `npm run db:seed`
5. `npm run dev`


## Welcome badge layout and interaction update
- Removed the separate overview greeting heading; the personalised greeting now appears only on the hanging ID badge.
- Enlarged and repositioned the badge on the left side of the overview.
- Reworked the drag release into a damped spring animation with cord extension, swing and gradual settling.
- Other dashboard content and role-based greetings remain in place.


## Pendulum-style welcome ID animation
- The welcome badge now hangs from a fixed suspension point using a fabric-style lanyard.
- Dragging the badge changes the lanyard angle and extension, so the badge follows the pointer like a suspended object.
- On release, gravity-driven pendulum motion and damping create a natural swing that gradually settles.
- The personalised greeting remains inside the enlarged badge; the separate overview greeting remains removed.


## Video-matched hanging ID lanyard
- Removed the horizontal suspension rail and thin vertical cord.
- Replaced the cord with a wide, fabric-textured Competency360 lanyard extending above the visible dashboard area.
- Kept the metal clasp and enlarged personalised ID card.
- The strap, clasp, and card rotate together around a fixed upper pivot, with the existing pendulum physics driving the swing.
