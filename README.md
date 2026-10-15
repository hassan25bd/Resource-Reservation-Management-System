# Resource Reservation Management System

A full-stack application for organizing shared office resources and reservations. It gives teams one place to manage rooms and equipment, check availability, and keep bookings from overlapping.

## Live project

- **Production app:** [resource-reservation-management-sys.vercel.app](https://resource-reservation-management-sys.vercel.app)
- **GitHub repository:** [hassan25bd/Resource-Reservation-Management-System](https://github.com/hassan25bd/Resource-Reservation-Management-System)
- **ER diagram:** [docs/er-diagram.md](./docs/er-diagram.md)
- **DBML schema:** [docs/resource-reservation.dbml](./docs/resource-reservation.dbml)

The production app uses a hosted Neon PostgreSQL database. Its catalog is shared, so use fictional details and do not enter confidential or real personal information.

## The problem

As an organization grows, teams share meeting rooms, workspaces, labs, and equipment. When availability is tracked in messages or separate records, people may not know what is free, reservations can overlap, and it becomes difficult to maintain a reliable view of resource usage.

## How this project solves it

The application centralizes the resource catalog, time-based reservations, and availability information:

1. A user creates an account or signs in.
2. They browse active resources and their category, location, capacity, and current status.
3. They select a resource and time range, then check availability.
4. The server validates the request and checks for conflicting reservations.
5. The database independently rejects overlapping reservations, including simultaneous requests that race past the application-level check.
6. Users can see and cancel their own upcoming reservations. Cancelled bookings no longer block a time slot.
7. Signed-in users can add and edit resources or mark them inactive so they cannot be booked.

This is a deliberately focused solution to the assessment scenario: it prioritizes understandable workflows, persistent storage, reliable booking rules, and a responsive interface rather than unrelated enterprise features.

## Features

- Booking planner with resource, reservation, and same-day booking summaries.
- Live active/available/in-use resource indicators; availability refreshes while the booking planner is open.
- Resource directory with category, location, capacity, description, and active status.
- Authenticated resource creation, editing, activation, and deactivation.
- Email/password account registration and sign-in.
- Private upcoming-booking list and ownership-checked cancellation.
- Availability checks for a selected time window.
- Server-side input validation and friendly conflict responses.
- PostgreSQL time-window check and exclusion constraint to prevent double-booking.
- Responsive layouts for desktop and smaller screens.
- Repeatable sample-resource seed command.

## Technology used

| Technology | How it is used |
| --- | --- |
| **Next.js 16 App Router** | Application pages, routing, and server-side Route Handlers. |
| **React 19** | Interactive dashboard, resource forms, and booking workflows. |
| **TypeScript** | Types for application components, data, and API code. |
| **Tailwind CSS 4 and global CSS** | Base styling and responsive PrimeWave-branded interface. |
| **PostgreSQL** | Persistent relational storage and database-enforced booking constraints. |
| **Neon** | Hosted PostgreSQL database used by the production deployment. |
| **Prisma 6** | Database schema, migrations, generated client, and queries. |
| **Zod 4** | Validation of authentication, resource, reservation, and availability input. |
| **Node.js crypto (`scrypt`)** | Salted password hashing, random session tokens, and token hashing. |
| **Vercel** | Production hosting for the Next.js application. |
| **Git and GitHub** | Version control and source-code repository. |

## How the booking protection works

The availability endpoint checks that the requested resource exists, is active, and has no overlapping non-cancelled reservation. When a booking is submitted, the server repeats the validation and conflict check; a prior availability check is not treated as a guarantee that the slot is still free.

The PostgreSQL migration is the final concurrency guard:

- `startAt` must be earlier than `endAt`.
- A GiST exclusion constraint prevents overlapping time ranges for the same resource when the reservation is not cancelled.
- Ranges use the half-open form `[start, end)`, so one booking may start exactly when another ends.
- If two users race to book the same slot, the losing request receives a conflict response instead of creating a duplicate booking.

## Authentication and privacy

- Passwords are stored as `scrypt` hashes with per-user random salts, not as plain text.
- Sessions use random tokens; only a SHA-256 hash of a token is stored in the database.
- The session cookie is HTTP-only, SameSite=Lax, and Secure in production.
- Booking queries and cancellation operations are scoped to the signed-in user.
- Existing reservations can have a nullable user relation to support records created before account sign-in was introduced.

## Data model

- **Resource** describes a bookable room, space, lab, or piece of equipment.
- **Reservation** belongs to one resource and records its owner (when account-linked), title, time window, optional note, and status.
- **User** stores account identity and the password hash and salt.
- **AuthSession** stores a user's hashed session token and expiry time.

The ER diagram and DBML source document the relations. A resource has many reservations; a user has many sessions and may have many reservations. Deleting a resource deletes its reservations; deleting a user removes their sessions and leaves existing reservations without a user reference.

See [the ER diagram](./docs/er-diagram.md) and [the DBML source](./docs/resource-reservation.dbml).

## Application structure

```text
app/
  api/
    auth/                 Registration, sign-in, sign-out, and session endpoints
    availability/         Time-window availability check
    dashboard/            Dashboard counts and live availability
    reservations/          List, create, and cancel the signed-in user's bookings
    resources/             Read and manage the resource catalog
  bookings/                Booking planner page
  login/                   Sign-in and registration page
  resources/               Resource directory and management page
  page.tsx                 Home page
  globals.css              Shared responsive styles
components/
  app-shell.tsx            Shared navigation and authentication-aware layout
lib/
  auth.ts                  Password and session helpers
  prisma.ts                Shared Prisma client
prisma/
  migrations/              PostgreSQL schema and booking-guard migrations
  schema.prisma            Prisma data model
  seed.cjs                 Repeatable sample-resource seed
docs/
  er-diagram.md            Mermaid ER diagram
  resource-reservation.dbml
  submission-checklist.md  Project and external submission checklist
```

### Main API routes

| Route | Purpose |
| --- | --- |
| `/api/auth/register` | Validate registration, create an account, and start a session. |
| `/api/auth/login` | Verify credentials and start a session. |
| `/api/auth/logout` | Invalidate the current session and clear the cookie. |
| `/api/auth/session` | Return the current signed-in user, if any. |
| `/api/resources` | List resources; authenticated users can create and update them. |
| `/api/availability` | Check a resource and requested time range. |
| `/api/reservations` | List, create, or cancel the current user's reservations. |
| `/api/dashboard` | Return dashboard statistics and currently busy resource IDs. |

## Run locally

### Requirements

- Node.js 20 or later
- npm
- PostgreSQL 14 or later (or a PostgreSQL-compatible Neon database)

### Windows PowerShell setup

1. Install dependencies:

   ```powershell
   npm install
   ```

2. Create a PostgreSQL database. For example, after installing PostgreSQL and adding its `bin` directory to `PATH`:

   ```powershell
   createdb -U postgres resource_reservation
   ```

3. Create the environment files. Next.js reads `.env.local`; Prisma CLI reads `.env`:

   ```powershell
   Copy-Item .env.example .env.local
   Copy-Item .env.example .env
   ```

   Set `DATABASE_URL` in both files to the database connection string. URL-encode special characters in the password. Keep these files private; only `.env.example` belongs in Git.

4. Generate Prisma Client and apply migrations:

   ```powershell
   npm run db:generate
   npm run db:migrate
   ```

5. Optionally seed the sample resource catalog:

   ```powershell
   npm run db:seed
   ```

   Seeding is safe to rerun; resources that already exist are not duplicated.

6. Start the development server:

   ```powershell
   npm run dev
   ```

   Visit [http://localhost:3000](http://localhost:3000), create an account, and sign in to manage resources and bookings.

## Validation and useful commands

```powershell
npm run lint
npm run build
```

Additional database commands:

```powershell
npm run db:generate
npm run db:migrate
npm run db:seed
npm run db:studio
```

The application has been validated with linting and a production build. Its production authentication, resource, availability, booking-conflict, and cancellation flows have also been smoke-tested. Temporary test accounts and records were removed after testing.

## Deployment

The production app is hosted on Vercel and connected to Neon PostgreSQL. Production database changes are applied using the checked-in Prisma migrations. Configure `DATABASE_URL` as a Vercel environment variable; never commit a real database URL or other credentials.

## Assessment brief coverage

| Assessment expectation | How this project addresses it |
| --- | --- |
| Interpret the shared-resource business problem | Centralizes resource details, availability, and reservations for teams. |
| Design and build a functional full-stack web app | Implements a responsive Next.js/React UI and server-side Route Handlers. |
| Use a modern JavaScript/TypeScript stack | Uses Next.js App Router, React, and TypeScript. |
| Use persistent data storage | Stores resources, reservations, accounts, and sessions in PostgreSQL. |
| Design an appropriate data structure | Provides Prisma schema, checked-in migrations, ER diagram, and DBML. |
| Address practical reliability challenges | Validates inputs and enforces non-overlapping bookings in both application logic and PostgreSQL. |
| Demonstrate usability and maintainability | Uses focused pages, clear booking feedback, shared layout, and documented local setup. |
| Provide source in GitHub with setup information | This repository includes the application source and this README. |
| Provide an ER diagram | The reviewer-accessible [ER diagram](https://github.com/hassan25bd/Resource-Reservation-Management-System/blob/main/docs/er-diagram.md) is in the repository. |
| Submit a 3–5 minute demonstration video | **Still to do:** record and upload a video. |
| Complete the official submission form | **Still to do:** obtain a working form URL (the URL in the supplied brief returned “Dynamic Link Not Found”), then submit the repository, video, ER diagram, and the same email address used for the application. |

See [the submission checklist](./docs/submission-checklist.md) for the remaining external steps. The project code and deployment are ready; recording and submitting the demo are separate tasks that require the applicant.

## Security

Do not commit `.env`, `.env.local`, production environment files, database credentials, passwords, or other secrets. Use fictional data in the shared production app.
