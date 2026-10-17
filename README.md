# ChuckFest

Planning app for the annual ChuckFest backpacking trip: date poll, site voting on a map with fire and smoke layers, permit-day plan with alarms, lottery tracker, attendance, gear, rides, and trip history.

Stack: Next.js 16 (App Router, server actions) on Vercel, Neon Postgres via Drizzle, Better Auth (magic links + personal links), Resend email, optional Twilio SMS, Leaflet maps.

## Setup

```bash
npm install
cp .env.local.example .env.local   # fill in DATABASE_URL, BETTER_AUTH_SECRET, RESEND_API_KEY
npm run db:migrate                 # apply migrations in drizzle/
npm run import:legacy              # one-time copy from the old Supabase app (re-runnable)
npm run dev
```

Sign in locally without email: `npx tsx scripts/dev-link.ts you@example.com` prints your personal sign-in link.

## How it fits together

- `src/db/schema.ts`: the whole data model. Change it, then `npm run db:generate` and `npm run db:migrate`.
- `src/server/*`: data access and business rules (votes cap, 2-admin minimum, permit windows, scheduled jobs). Every server action checks the session with `memberOrThrow()` / `adminOrThrow()`.
- `src/lib/*`: pure logic with unit tests (permit timing, date windows, blackouts, smoke KML).
- `src/server/notify.ts`: the only place messages are sent. Logged, de-duplicated, with a kill switch and test mode.
- `src/app/api/cron/run`: runs every 5 minutes (see `vercel.json`): permit alarms (3 days, 1 day, 15 minutes before), poll nudges, lottery reminders, pre-trip briefing and emergency trip plans.
- `src/lib/map-layers.ts`: map overlays, read live from NIFC, CAL FIRE, MTBS, NOAA, USFS, NPS and USGS.

## Roles

Admins (at least 2 at all times) run the trip from `/admin`. Members sign in by emailed magic link or by their personal link, which admins can copy from Admin → Members.

## Tests

`npm test` runs unit tests and database tests against an in-memory Postgres (PGlite).

## One-time site search

`scripts/find-sites.ts` uses Claude with web search to find and score new sites against the group's profile, then queues the ones that pass for review at `/admin/ideas`. It costs real money (roughly $20 to $50 for a full run); run it stage by stage: `discover`, `research`, `report`, `import`.

## Private data

The repo is public. Member contact details live only in the database (or `data/private/`, which is gitignored). Never commit `.env.local`.
