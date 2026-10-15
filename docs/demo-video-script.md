# Demo video script (3–5 minutes)

Target length: about 4 minutes. The production application is available at [https://resource-reservation-management-sys.vercel.app](https://resource-reservation-management-sys.vercel.app) and is connected to hosted PostgreSQL. Alternatively, record locally at `http://localhost:3000` after following the README setup steps.

Use fictional names and email addresses only. If recording against production, use a temporary test account and reservation, then remove them before finishing so the shared reviewer data stays clean.

## 0:00–0:25 — Introduce the problem

“This is the Resource Reservation Management System. It gives teams one place to manage shared office resources, check availability, and make reservations without overlapping bookings.”

## 0:25–0:55 — Dashboard and resource catalog

Show the dashboard and resource directory, including category, location, capacity, and Available / In use / Offline status.

“The dashboard summarizes resources, current availability, and reservations. The catalog makes it easy to understand what each shared space or item is for and whether it can be booked.”

## 0:55–1:25 — Manage a resource

Create a resource such as “Training Room” with a location, capacity, and description. Show it in the catalog and then edit it or mark it inactive.

“Resource changes are validated by the server and saved persistently in PostgreSQL through Prisma. Inactive resources stay in the catalog but cannot be booked.”

## 1:25–2:20 — Sign in and create a booking

Show registration or sign-in. In the booking planner, select an active resource, choose a future time, enter a booking title, and check availability. Confirm the reservation and show it in the upcoming schedule.

“Each user sees and manages their own bookings. The server derives the booker identity from the authenticated session instead of trusting a name or email supplied by the browser.”

## 2:20–3:05 — Demonstrate double-booking protection

Try to book the same resource for an overlapping time. Show the conflict message. If practical, show that a booking starting exactly when the first one ends is allowed.

“The app checks availability before confirmation and validates it again when saving. PostgreSQL also enforces a time-range exclusion constraint, so concurrent requests cannot create overlapping active bookings.”

## 3:05–3:35 — Cancel a booking

Cancel the test booking and show that it disappears from the upcoming list and no longer blocks the slot.

## 3:35–4:10 — Engineering choices and close

“The project uses Next.js App Router, React, TypeScript, PostgreSQL, Prisma, and Zod. Passwords are stored as salted scrypt hashes, sessions are HTTP-only, and both application validation and database constraints protect booking integrity. The repository includes the setup guide, migrations, and ER diagram.”

## Recording checklist

- Hide `.env`, terminal history, passwords, and unrelated desktop content.
- Use fictional names and email addresses.
- Demonstrate a successful booking and an overlapping-booking rejection.
- Keep the recording between 3 and 5 minutes.
- If testing against production, remove the temporary account and reservations after recording.
