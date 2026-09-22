# 3:23 — Architecture & Build Plan

A standalone web app for coaches to deliver programming (lifting +
throwing) Trainerize-style from a reusable exercise library, run daily
mental/physical check-ins with a readiness score, track command (intended
vs. actual target), velocity, and logged workout results over time, and
deliver mental-game content and habit/journal tools to athletes. Built on
React + Supabase (Postgres, Auth, Storage, Row Level Security).

## 1. Roles

- **Coach** — signs up choosing the Coach role; builds an exercise library
  and programs/workouts from it; claims newly-signed-up athletes onto
  their roster (or an athlete picks a coach some other way); assigns
  programs; views each athlete's check-ins, command sessions, and logged
  results.
- **Athlete** — signs up choosing the Athlete role, lands on today's
  check-in; once assigned a coach and programming, views their program,
  logs results per exercise (weight/reps or velocity), tracks command,
  journals.

## 2. Core data model (Postgres tables)

```
profiles            id, user_id, role (coach|athlete), name, email, coach_id (nullable, fk->profiles)
programs             id, coach_id, name, description
program_assignments  id, program_id, athlete_id, start_date, status
workouts             id, program_id, name, order_index, day_label
exercise_library     id, coach_id, name, type, description, video_url
exercises            id, workout_id, library_exercise_id (fk->exercise_library), name, type,
                     description, sets, reps, target_value, target_unit, youtube_url, order_index
exercise_logs        id, exercise_id, athlete_id, date, sets_completed, reps_completed,
                     weight, velocity, notes
journal_prompts      id, date or recurring_rule, text, category
journal_entries      id, athlete_id, prompt_id (nullable), date, content
devotionals          id, date, title, body, media_url
devotional_views     id, athlete_id, devotional_id, viewed_at
habit_templates      id, coach_id, name, description, cadence (daily/weekly), category (sleep/nutrition/sunlight/etc.)
habit_assignments    id, athlete_id, habit_template_id, target, active
habit_logs           id, habit_assignment_id, date, completed, value, notes
mental_game_content  id, coach_id, title, body, media_url, category, published_at
daily_checkins       id, athlete_id, date, weight_lb, sleep_hours, sleep_quality, strain,
                     arm_soreness, lower_soreness, mood, energy, nutrition, hydration,
                     whoop_recovery, whoop_strain, whoop_sleep_performance, whoop_hrv,
                     whoop_resting_hr, notes, readiness_score
command_sessions     id, athlete_id, logged_by (fk->profiles), date, label, notes
command_pitches      id, session_id (fk->command_sessions), athlete_id, session_date,
                     pitch_type, velocity, intended_x, intended_y, actual_x, actual_y,
                     miss_distance_in, notes
```

There is no `onboarding_forms` table — role (athlete/coach) is chosen once,
at signup, and travels in Supabase auth metadata (`signUp`'s `options.data`)
so the `profiles` row can be created under RLS on first real sign-in, even
when email confirmation delays when a session actually exists (see
`AuthContext.jsx`). An unassigned athlete (`coach_id is null`) is visible
to every coach via a dedicated RLS policy, so any coach can claim them onto
their roster from `/coach/roster`.

`programs.type` is `lifting` or `throwing` by default — the list of valid
types lives in `src/lib/facilityConfig.js` (`PROGRAM_TYPES`), so adding a
category (arm care, mobility, recovery, etc.) is a config change, not a
schema migration. Same pattern for `exercise_library.type` /
`exercises.type` (`EXERCISE_TYPES`).

`exercise_library` is the Exercise Builder's reusable catalog — name, type,
a coaching-cue description, and a demo video URL, defined once per coach.
`exercises` (an exercise as used inside one specific workout) copies
name/type/description/video from the library entry at add-time and keeps
`library_exercise_id` for traceability; sets/reps/description/target can be
overridden per workout without touching the library. Copying rather than
referencing live means a program is a snapshot — editing a library
exercise later doesn't retroactively change workouts already built from
it. `target_value`/`target_unit` is the prescribed load (lb) or velocity
(mph) for that exercise in that workout.

`exercise_logs` is what an athlete actually did — weight + reps_completed
for a lifting exercise, velocity for a throwing one.
`src/lib/exerciseTrends.js` turns a list of these into a latest value, a
delta vs. the previous entry, and a sparkline series; My Program groups
logs by `exercises.library_exercise_id` (falling back to the exercise row
itself) so the trend spans every workout that reused the same movement,
not just one program instance.

`daily_checkins.readiness_score` is computed client-side
(`src/lib/readiness.js`) from the weighted slider factors defined in
`facilityConfig.js` (`CHECKIN_SLIDERS` → `READINESS_FACTORS`) — sleep
(hours + quality), strain, arm soreness, lower-body soreness, energy,
mood, nutrition, and hydration. If the athlete also logs WHOOP data,
`whoop_recovery` (0-100, the same scale WHOOP uses for its own readiness
metric) blends into the final score at `WHOOP_RECOVERY_WEIGHT` — the
other four WHOOP fields (strain, sleep performance, HRV, resting HR) are
stored for trend display only and never touch the score. `computeReadiness`
returns both the blended `score` and the pre-blend `sliderScore` so the UI
can show its work. The result is stored for fast history/trend
queries. Retuning the formula for a facility's own philosophy means
editing that one array; weights must sum to 1.

A `command_session` is one bullpen/flat-ground/pre-game pen. `logged_by`
records whether the athlete or a coach (charting live from the athlete's
profile) ran the entry. `command_pitches` coordinates are feet from the
center of the plate (matching Trackman-style PlateLocSide/PlateLocHeight),
so the same strike-zone geometry as the pitch visualizer applies. Miss
distance is the Euclidean distance between intended and actual, in inches
(`src/lib/commandMetrics.js`), aggregated by pitch type within a session
(the pen's breakdown) and across all of an athlete's sessions (profile-wide
trend charts).

All athlete-owned tables use Supabase Row Level Security: athletes can only
read/write their own rows; coaches can read/write rows for athletes whose
`coach_id` matches them.

## 3. Screens (athlete view)

- **Sign up / log in** — pick Athlete or Coach at signup; lands on today's
  check-in if not done yet, otherwise the dashboard (`Landing.jsx`)
- **Dashboard** — today's readiness score, assigned programs, command
  tracker snapshot, today's journal prompt, today's devotional, habit
  checklist, streaks
- **Readiness** — the hub's centerpiece. Body weight, sleep hours, and
  sliders for sleep quality, strain (yesterday's load), arm soreness,
  lower-body soreness, energy, mood, nutrition, hydration; an optional
  WHOOP section (Recovery, Strain, Sleep Performance, HRV, Resting HR —
  Recovery blends into the score); live score on a circular gauge with
  band (Full Intensity / Modify Intensity / Recovery Day), 7-day average,
  and a 14-day band-colored trend chart
- **My Program** — list of lifting/throwing workouts → exercise detail
  (type badge, sets/reps/target, description, embedded YouTube demo) →
  log a result per exercise (weight+reps or velocity depending on type),
  see the delta vs. last time and a sparkline once there's a trend
- **Command Tracker** — start a bullpen session, then log each pitch one at
  a time: pitch type, velocity, click-to-place intended target vs. actual
  result on a strike-zone grid, auto-computed miss distance. Produces a
  pitch-by-pitch list for that pen plus a live pitch-type breakdown (avg
  miss distance / avg velocity), and profile-wide trends across sessions
- **Journal** — freeform reflective notes + running history, separate from
  the check-in's own per-day notes field
- **Devotionals** — daily devotional archive
- **Habits** — customizable routine view (morning/evening rhythm: sleep
  window, light exposure, meals) with daily check-off
- **Mental Game** — library of talks/articles from coach

## 4. Screens (coach view)

- **Athlete roster** — a "new athletes waiting for a coach" panel (claim
  an unassigned athlete onto your roster with one click), then the roster
  itself: today's readiness score and recent command metrics per athlete
- **Exercise Builder** — a reusable library of exercises (name, type,
  coaching-cue description, demo video — auto-embedded inline for YouTube
  links), filterable by type, editable/deletable in place
- **Program builder (Workout Builder)** — Trainerize-style: create a
  lifting or throwing program → add a day/workout → click an exercise from
  a library side-panel to drop it in → edit sets/reps/target weight-or-
  velocity inline → reorder with up/down → duplicate or delete a
  workout/day → assign to one or more athletes individually
- **Content library** — mental game talks, devotionals, journal prompts,
  habit templates (CRUD)
- **Athlete detail** — each athlete's profile is split into category tabs
  (Overview, Readiness, Command Tracker, Programs) rather than one long
  scrolling page, so it's easy to add more categories (mobility screens,
  strength testing, etc.) later without cluttering existing ones. Command
  Tracker tab lets a coach start/log a bullpen session live from the
  profile, same UI an athlete uses on their own; Programs tab assigns
  inline; Readiness tab mirrors the athlete's own gauge/trend/WHOOP view
  plus a recent-check-ins table

## 5. Tech stack

- React + Vite (consistent with your existing app), React Router
- Supabase JS client for auth (email/password or magic link), Postgres, RLS
- TanStack Query for data fetching/caching
- Tailwind for styling. Visual language is Apple-inspired and deliberately
  restrained: system font stack, one accent blue reserved for primary
  actions/links (`accent` in `tailwind.config.js`), near-black used only
  for structural nav (never as a button color), soft-shadow rounded-2xl
  white cards on a neutral canvas background, icon-led grouped sidebar nav
- Recharts for readiness/command/velocity trend charts; hand-rolled SVG for
  the strike-zone target picker (feet-based coordinates, shared convention
  with the root pitch visualizer app)
- YouTube embeds via `<iframe>` from stored video IDs/links
- Deployed on Vercel/Netlify (static frontend) + Supabase (hosted backend)

## 6. Build order (incremental, each step shippable)

1. ✅ Repo scaffold + Supabase project + auth (sign up/login) + `profiles` table
2. ✅ Sign up with role selection (athlete/coach), auto-created profile row,
   coach-claims-unassigned-athlete flow
3. ✅ Program builder (coach, lifting + throwing types) + program/workout/
   exercise viewing and mark-done (athlete)
4. ✅ Daily check-in (incl. body weight) + readiness calculator, command
   tracking (bullpen sessions, intended vs. actual + miss distance), coach
   roster + athlete detail with trend charts
5. ✅ Exercise Builder (reusable exercise library with type + video) and a
   Workout Builder that composes workouts from it; Apple-inspired visual
   redesign across the app
6. ✅ Slider-based check-in with strain/arm-soreness/lower-soreness/
   hydration factors; result logging (weight/reps or velocity) with
   trend deltas + sparklines; functional journal; Trainerize-style
   click-to-add/reorder/duplicate Workout Builder; smart post-login
   redirect; coach-only nav
7. ✅ Readiness elevated to the hub's centerpiece: optional WHOOP section
   (Recovery blends into the score, Strain/Sleep Performance/HRV/Resting
   HR tracked for trends), circular gauge (`ReadinessGauge.jsx`), 7-day
   average, band-colored 14/21-day trend bars — consistent across
   Dashboard, the Readiness page, and the coach's Readiness tab
8. Devotionals (coach posts, athlete views)
9. Habit templates + assignments + daily check-off + streaks
10. Mental game content library
11. Polish: notifications/reminders, coach-visible journal entries, CSV
    import for velo/command data from Trackman/Rapsodo, real WHOOP OAuth
    sync (today's WHOOP fields are manual entry only)

## 7. Facility customization

Modeled loosely on Trevor Bauer's 4APP approach — many small, trackable
categories (check-ins, calculators, session logs) hung off an athlete's
profile — but built so the specific categories and their math are a config
edit for this facility rather than baked into the UI:

- `src/lib/facilityConfig.js` centralizes facility name (`FACILITY_NAME`,
  currently "3:23"), logo assets (`LOGO_CIRCLE`/`LOGO_SQUARE`),
  program/exercise categories (`PROGRAM_TYPES`, `EXERCISE_TYPES`),
  Command Tracker's pitch-type list (`PITCH_TYPES`), the daily check-in's
  sliders (`CHECKIN_SLIDERS`) and optional WHOOP fields (`WHOOP_FIELDS`,
  `WHOOP_RECOVERY_WEIGHT`), and the readiness score's weighted factors
  (`READINESS_FACTORS`, derived from `CHECKIN_SLIDERS`'s weights).
- Every check-in and calculator lives as its own category on the athlete
  profile (coach view: Overview / Readiness / Command Tracker / Programs
  tabs) so a new one (e.g. a mobility screen, a strength-testing
  calculator) can be added as an additional tab + table without touching
  existing categories.
- Current customization is structural (a developer edits the config file);
  a coach-editable in-app settings screen for the same knobs is a
  reasonable next step if that's needed.

## 8. Open decisions for later

- Coach assignment is manual-claim today (any coach can pick up any
  unassigned athlete); a multi-coach facility might want an invite code or
  admin approval step instead
- Whether journal entries are private or visible to the coach (currently
  athlete-only; not surfaced anywhere in the coach view)
- Push/email reminders for daily check-in & habits
- Mobile: responsive web first, native app later if needed
- Reordering exercises is up/down buttons, not drag-and-drop; fine at
  typical workout lengths but worth revisiting if workouts get long
- WHOOP is manual entry only (no OAuth sync) — the app has no backend
  server to hold WHOOP API credentials/tokens, so real auto-sync would
  need a small serverless function (e.g. a Supabase Edge Function) to
  handle the OAuth flow and webhook
