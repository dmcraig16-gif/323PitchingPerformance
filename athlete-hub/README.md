# Athlete Hub

Coach/athlete performance hub for pitchers: daily mental + physical
check-ins with a readiness calculator, lifting/throwing programming,
command training (intended vs. actual target → miss distance), and velo
tracking — all tied to athlete profiles coaches can view and manage.

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

## What's built

- **Daily check-in + readiness calculator** (`/check-in`) — sleep, soreness,
  mood, energy, nutrition, and previous-day training load roll up into a
  0-100 readiness score with a traffic-light band (`src/lib/readiness.js`).
- **Command training** (`/command`) — click-to-place intended target vs.
  actual pitch location on a strike-zone grid, pitch type + velocity per
  pitch, auto-computed miss distance (inches), and average-miss/velocity
  trends by pitch type and by session (`src/lib/commandMetrics.js`).
- **Programming** (`/program` for athletes, `/coach/programs` for coaches)
  — coaches build lifting and throwing programs out of workouts and
  exercises (sets/reps/video/notes) and assign them to individual athletes;
  athletes mark exercises done day-to-day.
- **Coach roster + athlete profiles** (`/coach/roster`,
  `/coach/athletes/:id`) — today's readiness and recent command metrics at
  a glance per athlete, plus a full profile view with readiness trend,
  miss-distance-by-pitch-type, velocity trend, and program assignment.
- **Auth/roles** — Supabase-backed when configured; a localStorage-backed
  demo mode otherwise so the whole app is clickable without a backend.

## Not yet wired

Journal, devotionals, habits, and mental-game content are routed but still
placeholder screens — see step 5 onward in `ATHLETE_HUB_PLAN.md`.
