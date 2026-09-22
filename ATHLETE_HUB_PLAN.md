# Athlete Hub — Architecture & Build Plan

A standalone web app for coaches to deliver programming (lifting +
throwing), run daily mental/physical check-ins with a readiness score,
track command (intended vs. actual target) and velocity, and deliver
mental-game content and habit/journal tools to athletes. Built on
React + Supabase (Postgres, Auth, Storage, Row Level Security).

## 1. Roles

- **Admin/Coach** — creates programs, workouts, exercises, journal prompts,
  devotionals, habit templates; reviews onboarding forms; assigns athletes to
  themselves; views athlete logs/progress.
- **Athlete** — completes onboarding form, gets assigned a coach, views their
  assigned program, logs workouts/sets, journals daily, tracks habits.

## 2. Core data model (Postgres tables)

```
profiles            id, user_id, role (coach|athlete), name, email, coach_id (nullable, fk->profiles)
onboarding_forms     id, athlete_id, answers (jsonb), submitted_at, reviewed_at
programs             id, coach_id, name, description
program_assignments  id, program_id, athlete_id, start_date, status
workouts             id, program_id, name, order_index, day_label
exercise_library     id, coach_id, name, type, description, video_url
exercises            id, workout_id, library_exercise_id (fk->exercise_library), name, type,
                     description, sets, reps, youtube_url, order_index
exercise_logs        id, exercise_id, athlete_id, date, sets_completed, reps_completed, weight, notes
journal_prompts      id, date or recurring_rule, text, category
journal_entries      id, athlete_id, prompt_id (nullable), date, content
devotionals          id, date, title, body, media_url
devotional_views     id, athlete_id, devotional_id, viewed_at
habit_templates      id, coach_id, name, description, cadence (daily/weekly), category (sleep/nutrition/sunlight/etc.)
habit_assignments    id, athlete_id, habit_template_id, target, active
habit_logs           id, habit_assignment_id, date, completed, value, notes
mental_game_content  id, coach_id, title, body, media_url, category, published_at
daily_checkins       id, athlete_id, date, weight_lb, sleep_hours, sleep_quality, soreness,
                     mood, energy, nutrition, prev_day_workload, notes, readiness_score
command_sessions     id, athlete_id, logged_by (fk->profiles), date, label, notes
command_pitches      id, session_id (fk->command_sessions), athlete_id, session_date,
                     pitch_type, velocity, intended_x, intended_y, actual_x, actual_y,
                     miss_distance_in, notes
```

`programs.type` is `lifting` or `throwing` by default — the list of valid
types lives in `src/lib/facilityConfig.js` (`PROGRAM_TYPES`), so adding a
category (arm care, mobility, recovery, etc.) is a config change, not a
schema migration. Same pattern for `exercise_library.type` /
`exercises.type` (`EXERCISE_TYPES`).

`exercise_library` is the Exercise Builder's reusable catalog — name, type,
a coaching-cue description, and a demo video URL, defined once per coach.
`exercises` (an exercise as used inside one specific workout) copies
name/type/description/video from the library entry at add-time and keeps
`library_exercise_id` for traceability; sets/reps/description can be
overridden per workout without touching the library. Copying rather than
referencing live means a program is a snapshot — editing a library
exercise later doesn't retroactively change workouts already built from
it.

`daily_checkins.readiness_score` is computed client-side
(`src/lib/readiness.js`) from the weighted factors defined in
`facilityConfig.js` (`READINESS_FACTORS`) — sleep (hours + quality),
soreness, mood, energy, nutrition, and inverted previous-day workload —
then stored for fast history/trend queries. Retuning the formula for a
facility's own philosophy means editing that one array.

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

- **Onboarding form** (first login, blocks until submitted)
- **Dashboard** — today's readiness score, assigned programs, command
  training snapshot, today's journal prompt, today's devotional, habit
  checklist, streaks
- **Daily Check-In** — body weight, sleep/soreness/mood/energy/nutrition/
  prior-day-load inputs, live readiness score + band, 14-day trend
- **My Program** — list of lifting/throwing workouts → exercise detail
  (sets/reps/description/embedded YouTube), mark-complete per exercise
- **Command Tracker** — start a bullpen session, then log each pitch one at
  a time: pitch type, velocity, click-to-place intended target vs. actual
  result on a strike-zone grid, auto-computed miss distance. Produces a
  pitch-by-pitch list for that pen plus a live pitch-type breakdown (avg
  miss distance / avg velocity), and profile-wide trends across sessions
- **Journal** — calendar of past entries + today's prompt + freeform entry
- **Devotionals** — daily devotional archive
- **Habits** — customizable routine view (morning/evening rhythm: sleep
  window, light exposure, meals) with daily check-off
- **Mental Game** — library of talks/articles from coach
- **Profile/Progress** — workout history, habit streaks, journal history

## 4. Screens (coach view)

- **Athlete roster** — list with today's readiness score and recent command
  metrics at a glance, onboarding status, last activity
- **Review onboarding** → assign coach/program
- **Exercise Builder** — a reusable library of exercises (name, type,
  coaching-cue description, demo video — auto-embedded inline for YouTube
  links), filterable by type, editable/deletable in place
- **Program builder (Workout Builder)** — create a lifting or throwing
  program → add workouts → add exercises by picking from the Exercise
  Builder's library and setting sets/reps for that specific workout
  (rather than retyping a new exercise each time) → assign to one or more
  athletes individually
- **Content library** — mental game talks, devotionals, journal prompts,
  habit templates (CRUD)
- **Athlete detail** — each athlete's profile is split into category tabs
  (Overview, Check-Ins, Command Tracker, Programs) rather than one long
  scrolling page, so it's easy to add more categories (mobility screens,
  strength testing, etc.) later without cluttering existing ones. Command
  Tracker tab lets a coach start/log a bullpen session live from the
  profile, same UI an athlete uses on their own; Programs tab assigns
  inline; Check-Ins tab shows readiness trend + recent check-in detail

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
2. ✅ Onboarding form → coach assignment (manual assignment to start)
3. ✅ Program builder (coach, lifting + throwing types) + program/workout/
   exercise viewing and mark-done (athlete)
4. ✅ Daily check-in (incl. body weight) + readiness calculator, command
   tracking (bullpen sessions, intended vs. actual + miss distance), coach
   roster + athlete detail with trend charts
5. ✅ Exercise Builder (reusable exercise library with type + video) and a
   Workout Builder that composes workouts from it; Apple-inspired visual
   redesign across the app
6. Journal prompts + entries
7. Devotionals (coach posts, athlete views)
8. Habit templates + assignments + daily check-off + streaks
9. Mental game content library
10. Polish: notifications/reminders, exercise_logs progress rollups, CSV
    import for velo/command data from Trackman/Rapsodo

## 7. Facility customization

Modeled loosely on Trevor Bauer's 4APP approach — many small, trackable
categories (check-ins, calculators, session logs) hung off an athlete's
profile — but built so the specific categories and their math are a config
edit for this facility rather than baked into the UI:

- `src/lib/facilityConfig.js` centralizes facility name, program
  categories (`PROGRAM_TYPES`), Command Tracker's pitch-type list
  (`PITCH_TYPES`), daily check-in fields (`CHECKIN_INPUT_FIELDS`), and the
  readiness score's weighted factors (`READINESS_FACTORS`).
- Every check-in and calculator lives as its own category on the athlete
  profile (coach view: Overview / Check-Ins / Command Tracker / Programs
  tabs) so a new one (e.g. a mobility screen, a strength-testing
  calculator) can be added as an additional tab + table without touching
  existing categories.
- Current customization is structural (a developer edits the config file);
  a coach-editable in-app settings screen for the same knobs is a
  reasonable next step if that's needed.

## 8. Open decisions for later

- Auto-assignment of coach vs. manual (multiple coaches?)
- Whether journals are private or visible to coach
- Push/email reminders for daily journal & habits
- Mobile: responsive web first, native app later if needed
