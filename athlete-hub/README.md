# 3:23

Coach/athlete performance hub for pitchers, built around a WHOOP/4APP-style
**Readiness** tracker as the centerpiece: slider-based daily check-ins,
optional WHOOP metrics blended into the score, a circular gauge, and
band-colored trend bars. Around that: lifting/throwing programming built
Trainerize-style from a reusable exercise library, weight/velocity trend
tracking on every logged result, a session-based command tracker, and a
journal — all organized as individual categories within each athlete's
profile, and tunable to a facility's own programming in one config file.

See `../ATHLETE_HUB_PLAN.md` for the full architecture and data model.

## Setup

1. `npm install`
2. `npm run dev` — the app runs immediately in **preview mode** with seeded
   demo data (a coach, two rostered athletes, and one unassigned athlete)
   and no backend required. Use the "Preview as" switcher in the header to
   jump between the coach and athlete views.
3. To connect a real backend: create a Supabase project, run the SQL in
   `supabase/schema.sql`, copy `.env.example` to `.env` and fill in your
   project URL + anon key, then restart `npm run dev`. Once
   `VITE_SUPABASE_URL` is set, real auth/signup replaces the demo profile
   switcher — sign up picks a name + role (athlete/coach), and lands
   athletes on today's check-in first, coaches on their roster.

## Making it your own facility's programming

`src/lib/facilityConfig.js` is the one file to edit to retune the app —
facility name, logo (`LOGO_CIRCLE`/`LOGO_SQUARE`, pointing at `public/`),
what a "program"/exercise category can be, the pitch-type list Command
Tracker offers, the daily check-in's sliders and optional WHOOP fields
(`WHOOP_FIELDS`, `WHOOP_RECOVERY_WEIGHT`), and the readiness score's
weights. Every page reads from this file instead of hardcoding those
values. To swap the logo: drop new art in `public/`, point those two
constants at it, and update the `<link rel="icon">`/`apple-touch-icon`
tags in `index.html` to match. To stop WHOOP data from ever touching the
score (track-only), set `WHOOP_RECOVERY_WEIGHT` to `0`.

## What's built

- **Readiness** (`/check-in`) — the hub's centerpiece. Body weight, sleep,
  strain (yesterday's training load), arm soreness, lower-body soreness,
  energy, mood, nutrition, and hydration, all graded on sliders, roll up
  into a 0-100 score shown on a WHOOP-style circular gauge with a Full
  Intensity / Modify Intensity / Recovery Day band
  (`src/components/ReadinessGauge.jsx`, `src/lib/readiness.js`, weights in
  `facilityConfig.js`). An optional WHOOP section (Recovery, Strain, Sleep
  Performance, HRV, Resting HR) blends WHOOP's own Recovery % into the
  score at a configurable weight (`WHOOP_RECOVERY_WEIGHT`) when an athlete
  logs it — the rest of the WHOOP fields are tracked for trends only. A
  band-colored bar chart (green/amber/red per day, like WHOOP's weekly
  view) shows the last 14 days, plus a rolling 7-day average. Body weight
  is tracked alongside it but isn't part of the score. The same gauge and
  colored trend bars appear on the athlete's Dashboard and the coach's
  Readiness tab on each athlete's profile, so the visual language is
  consistent everywhere the score shows up.
- **Sign up / log in** (`/login`) — pick Athlete or Coach at signup; a
  coach lands on their roster, an athlete lands on today's check-in if
  they haven't done it yet, otherwise straight to their programming for
  the day (`src/pages/Landing.jsx`). An athlete who signs up before a
  coach claims them shows up in a "new athletes waiting for a coach" panel
  on the roster.
- **Exercise Builder** (`/coach/exercises`) — coaches build a reusable
  library of exercises, each with a type (strength, power/plyo, throwing,
  arm-care, mobility, conditioning, recovery — configurable), a
  coaching-cue description, and a demo video URL (auto-embedded inline for
  YouTube links).
- **Program Builder / Workout Builder** (`/coach/programs`) — a
  Trainerize-style builder: click an exercise from your library panel to
  drop it into a workout, edit sets/reps/target weight-or-velocity inline,
  reorder with up/down, duplicate or delete a workout/day, assign to one
  or more athletes.
- **My Program + result logging** (`/program`) — athletes see their
  assigned workouts and log real results per exercise: weight + reps for
  lifting, velocity for throwing drills. Each log shows the delta vs. the
  last time (across every workout that reused the same library exercise)
  plus a sparkline once there's a trend to show
  (`src/lib/exerciseTrends.js`, `src/components/ExerciseLogger.jsx`).
- **Command Tracker** (`/command`) — start a bullpen session, then log each
  pitch one at a time: pitch type, velocity, click-to-place intended target
  vs. actual result on a strike-zone grid, auto-computed miss distance
  (inches). Produces a full pitch list for that pen plus a live pitch-type
  breakdown. Coaches can start/log sessions too, from an athlete's profile.
- **Journal** (`/journal`) — freeform reflective notes, separate from the
  check-in's daily notes field, with a running history.
- **Coach roster + athlete profiles** (`/coach/roster`,
  `/coach/athletes/:id`) — roster shows today's readiness and recent
  command metrics per athlete. Each profile is split into category tabs —
  Overview, Readiness, Command Tracker, Programs.

## Design

Visual language is intentionally minimal and Apple-esque: a system font
stack, one accent color (`accent` in `tailwind.config.js`) reserved for
primary actions and links, near-black used only for navigation/structure
(never as a "primary button" color), soft `shadow-card`/`rounded-2xl`
white cards on a neutral `canvas` background, and a black frosted-glass top
nav. Sidebar nav is grouped and icon-led (`lucide-react`); coaches get a
dedicated coaching-only nav rather than the athlete's own check-in/program
links. Extend the palette in `tailwind.config.js`, not with one-off hex
values in components.

## Not yet wired

Devotionals, habits, and mental-game content are routed but still
placeholder screens — see the build order in `ATHLETE_HUB_PLAN.md`.
