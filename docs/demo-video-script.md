# Demo video script (3–5 minutes)

Target length: about 4 minutes. Record the browser at `http://localhost:3000` and narrate while using a database with a few sample resources. On a fresh database, run `npm run db:seed` first.

## 0:00–0:25 — Introduce the problem

“This is the Resource Reservation Management System. It centralizes shared office resources and bookings, making resource availability visible and preventing overlapping reservations.”

## 0:25–0:55 — Dashboard and resources

Show the dashboard counters and resource catalog.

“The dashboard summarizes the resource inventory, active resources, total reservations, and today’s bookings. The catalog shows each resource’s category, location, capacity, and active status. Resource details can be edited, and inactive resources are excluded from new bookings.”

## 0:55–1:30 — Add a resource

Create a resource such as “Training Room” with a location, capacity, and description. Show it appear in the catalog and reservation selector, then edit a field and toggle its active status.

“Resources are stored persistently in PostgreSQL through Prisma, so they remain after the application restarts.”

## 1:30–2:35 — Check availability and reserve

Select a resource, enter the booker’s name and email, a booking title, and a time range. Check availability, then confirm the reservation. Show it in the bookings list.

“The availability endpoint checks overlapping bookings before the user submits. The server validates the booking data and checks again during creation.”

## 2:35–3:20 — Demonstrate double-booking protection

Try to reserve the same resource during an overlapping period. Show the conflict message. If practical, explain that PostgreSQL also has a partial GiST exclusion constraint, so simultaneous requests cannot bypass the application check. Optionally show that a reservation beginning at the first booking’s end time is allowed.

## 3:20–3:45 — Cancel and availability

Cancel a booking and check the formerly occupied slot again.

“Cancelled reservations no longer block availability. The database guard applies only to non-cancelled reservations.”

## 3:45–4:10 — Engineering decisions and close

“The app uses Next.js App Router, TypeScript, PostgreSQL, Prisma, and Zod. The database stores persistent data and enforces time-window invariants in addition to server-side validation. The ER diagram and local setup steps are included in the repository.”

## Recording checklist

- Hide `.env`, terminal history, passwords, and unrelated desktop content.
- Use realistic but fictional names and email addresses.
- Confirm the app and PostgreSQL are running before recording.
- Capture the conflict case and a successful booking.
- Keep the final recording between 3 and 5 minutes.
