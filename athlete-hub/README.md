# Athlete Hub

Coach/athlete performance hub for pitchers: daily mental + physical
check-ins with a readiness calculator, lifting/throwing programming, and a
session-based command tracker (bullpen sessions → pitch-by-pitch intended
vs. actual target → miss distance/velocity by pitch type) — all organized
as individual categories within each athlete's profile, and tunable to a
facility's own programming in one config file.

See `../ATHLETE_HUB_PLAN.md` for the full architecture and data model.

## Setup

1. `npm install`
2. `npm run dev` — the app runs immediately in **preview mode** with seeded
   demo data (a coach + two athletes) and no backend required. Use the
   "Preview as" switcher in the header to jump between the coach and
   athlete views.
3. To connect a real backend: create a Supabase project, run the SQL in
   `supabase/schema.sql`, copy `.env.example` to `.env` and fill in your
   project URL + anon key, then restart `npm run dev`. Once `VITE_SUPABASE_URL`
   is set, real auth/signup replaces the demo profile switcher.

## Making it your own facility's programming

`src/lib/facilityConfig.js` is the one file to edit to retune the app —
facility name, what a "program" category can be (lifting/throwing today,
add arm-care/mobility/recovery/etc.), the pitch-type list Command Tracker
offers, the daily check-in fields, and the readiness score's weights. Every
page reads from this file instead of hardcoding those values.

## What's built

- **Daily check-in + readiness calculator** (`/check-in`) — sleep, soreness,
  mood, energy, nutrition, and previous-day training load roll up into a
  0-100 readiness score with a traffic-light band (`src/lib/readiness.js`,
  weights defined in `facilityConfig.js`).
- **Command Tracker** (`/command`) — start a bullpen session, then log each
  pitch one at a time: pitch type, velocity, click-to-place intended target
  vs. actual result on a strike-zone grid, auto-computed miss distance
  (inches). Produces a full pitch list for that pen plus a live pitch-type
  breakdown (avg miss distance / avg velocity) (`src/lib/commandMetrics.js`,
  `src/components/CommandSessionList.jsx` + `CommandSessionDetail.jsx`).
  Coaches can start/log sessions too, from an athlete's profile — useful
  for charting a bullpen live from the mound.
- **Programming** (`/program` for athletes, `/coach/programs` for coaches)
  — coaches build lifting and throwing programs out of workouts and
  exercises (sets/reps/video/notes) and assign them to individual athletes;
  athletes mark exercises done day-to-day.
- **Coach roster + athlete profiles** (`/coach/roster`,
  `/coach/athletes/:id`) — roster shows today's readiness and recent
  command metrics at a glance per athlete. Each athlete's profile is split
  into its own category tabs — **Overview**, **Check-Ins**, **Command
  Tracker**, **Programs** — mirroring how the data is actually captured
  rather than one long scrolling page.
- **Auth/roles** — Supabase-backed when configured; a localStorage-backed
  demo mode otherwise so the whole app is clickable without a backend.

## Not yet wired

Journal, devotionals, habits, and mental-game content are routed but still
placeholder screens — see step 5 onward in `ATHLETE_HUB_PLAN.md`.
