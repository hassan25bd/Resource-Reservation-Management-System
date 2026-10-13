# Submission checklist

## Project package

- [x] Next.js App Router and TypeScript application
- [x] PostgreSQL and Prisma data model
- [x] Dashboard, resource create/edit/status, booking, cancellation, and availability flow
- [x] Server-side booking conflict validation
- [x] PostgreSQL-level booking overlap constraint in a checked-in migration
- [x] README with setup, database, and run instructions
- [x] Mermaid ER diagram and DBML source
- [x] Idempotent sample-resource seed command
- [x] Demo video narration script
- [x] Production deployment with hosted Neon PostgreSQL
- [x] Production migrations and sample resource catalog

## Local validation

- [x] Install dependencies with `npm install`
- [x] Configure `.env` and `.env.local` with a working PostgreSQL URL
- [x] Apply migrations with `npm run db:migrate`
- [x] Run `npm run lint` and `npm run build`
- [ ] Record the demo following [the script](./demo-video-script.md)

## External submission steps

- [x] GitHub repository exists and is connected to the Vercel project
- [ ] Push the latest source and submission-documentation updates to GitHub
- [ ] Upload the 3–5 minute demonstration video and make it accessible to reviewers
- [ ] Confirm the public GitHub [ER diagram](./er-diagram.md) link is reviewer-accessible, or import `resource-reservation.dbml` into dbdiagram.io and create a share link
- [ ] Submit the repository, video, and ER diagram links through the official form (the link in the supplied brief currently returns "Dynamic Link Not Found"; obtain a working form URL)
- [ ] Use the same email address that was used when applying for the internship

The production app is available at [resource-reservation-management-sys.vercel.app](https://resource-reservation-management-sys.vercel.app). The form URL printed in the supplied assessment brief currently returns "Dynamic Link Not Found", so get a corrected URL from the assessment contact before submitting. The form also requires the applicant's application email and final video/diagram links. Record with fictional booking details and clear any temporary production reservation afterwards. Do not publish database credentials; commit only `.env.example`.
