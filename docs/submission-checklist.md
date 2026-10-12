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

## Local validation

- [x] Install dependencies with `npm install`
- [x] Configure `.env` and `.env.local` with a working PostgreSQL URL
- [x] Apply migrations with `npm run db:migrate`
- [x] Run `npm run lint` and `npm run build`
- [ ] Record the demo following [the script](./demo-video-script.md)

## External submission steps

- [ ] Create/publish a GitHub repository under the applicant’s account and push this project
- [ ] Upload the 3–5 minute demonstration video and make it accessible to reviewers
- [ ] Import `resource-reservation.dbml` into dbdiagram.io (or publish the Mermaid diagram) and create a reviewer-accessible share link
- [ ] Submit the repository, video, and ER diagram links through the official form
- [ ] Use the same email address that was used when applying for the internship

External accounts, video recording, and the official submission form are outside this local workspace. Do not publish database credentials; commit only `.env.example`.
