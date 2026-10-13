# Resource Reservation Management System

A full-stack app for coordinating shared office resources such as meeting rooms, equipment, workspaces, and project labs. Staff can manage resources, check availability, make reservations, and cancel bookings from a central dashboard.

## Live application

The production application is deployed on Vercel and uses a hosted Neon PostgreSQL database:

- App: [resource-reservation-management-sys.vercel.app](https://resource-reservation-management-sys.vercel.app)
- GitHub repository: [Resource Reservation Management System](https://github.com/hassan25bd/Resource-Reservation-Management-System)
- Public ER diagram: [docs/er-diagram.md](https://github.com/hassan25bd/Resource-Reservation-Management-System/blob/main/docs/er-diagram.md)

The production database contains shared sample data. Avoid entering confidential or real personal information.

## Features

- Dashboard summaries for resources, active resources, reservations, and bookings today
- Live availability indicators for active, available, and currently occupied resources
- Resource creation, editing, and active/inactive status
- Reservation creation and cancellation
- Availability checks for a requested time window
- Server-side validation and overlap checks
- PostgreSQL exclusion constraint as the final guard against concurrent double-booking
- Persistent storage with PostgreSQL and Prisma
- Responsive PrimeWave-branded interface with a clean white, emerald, and deep-green palette

## Technology

- Next.js App Router and React
- TypeScript
- Tailwind CSS
- PostgreSQL
- Prisma ORM
- Zod validation

## Requirements

- Node.js 20 or later
- npm
- PostgreSQL 14 or later

## Local setup (Windows PowerShell)

1. Install dependencies:

   ```powershell
   npm install
   ```

2. Create a PostgreSQL database. For example, after installing PostgreSQL and adding its `bin` directory to `PATH`:

   ```powershell
   createdb -U postgres resource_reservation
   ```

   If your PostgreSQL installation requires a password, enter it when prompted.

3. Create both environment files. Next.js reads `.env.local`, while Prisma CLI reads `.env`:

   ```powershell
   Copy-Item .env.example .env.local
   Copy-Item .env.example .env
   ```

   Update `DATABASE_URL` in **both** files with your PostgreSQL username, password, host, port, and database name. URL-encode special characters in the password.

4. Generate Prisma Client and apply the checked-in migrations:

   ```powershell
   npm run db:generate
   npm run db:migrate
   ```

   The migrations create the tables and install a PostgreSQL exclusion constraint that rejects overlapping active reservations for the same resource. Adjacent reservations are allowed; cancelled reservations do not block a time slot.

5. (Optional) Add the sample resource catalog:

   ```powershell
   npm run db:seed
   ```

   Seeding is safe to rerun; it only creates sample resources that are not already present.

6. Start the app:

   ```powershell
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Validation commands

```powershell
npm run lint
npm run build
```

Other useful commands:

```powershell
npm run db:studio
npm run db:generate
npm run db:seed
```

## Data model

- `Resource` stores the resource name, category, location, capacity, description, and active status.
- `Reservation` belongs to one resource and stores the booker, time range, purpose, notes, and status.
- The database enforces `startAt < endAt` and prevents overlapping non-cancelled time ranges for the same resource.

See [the ER diagram](./docs/er-diagram.md) and [DBML source](./docs/resource-reservation.dbml).

## Project structure

- `app/` contains the dashboard, shared visual styles, and Next.js Route Handlers under `app/api/`.
- `app/api/resources/` manages the resource catalog; `app/api/reservations/` creates and cancels bookings.
- `app/api/availability/` checks a requested time range; `app/api/dashboard/` provides summary and live inventory availability.
- `lib/prisma.ts` provides the shared Prisma client.
- `prisma/` contains the PostgreSQL data model, migrations, and repeatable sample-data seed.
- `docs/` contains the ER diagram and DBML schema source.

Do not commit real database credentials or other secrets.
