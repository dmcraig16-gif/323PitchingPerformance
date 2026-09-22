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
exercises            id, workout_id, name, description, sets, reps, youtube_url, order_index
exercise_logs        id, exercise_id, athlete_id, date, sets_completed, reps_completed, weight, notes
journal_prompts      id, date or recurring_rule, text, category
journal_entries      id, athlete_id, prompt_id (nullable), date, content
devotionals          id, date, title, body, media_url
devotional_views     id, athlete_id, devotional_id, viewed_at
habit_templates      id, coach_id, name, description, cadence (daily/weekly), category (sleep/nutrition/sunlight/etc.)
habit_assignments    id, athlete_id, habit_template_id, target, active
habit_logs           id, habit_assignment_id, date, completed, value, notes
mental_game_content  id, coach_id, title, body, media_url, category, published_at
daily_checkins       id, athlete_id, date, sleep_hours, sleep_quality, soreness, mood,
                     energy, nutrition, prev_day_workload, notes, readiness_score
command_pitches      id, athlete_id, session_date, pitch_type, velocity,
                     intended_x, intended_y, actual_x, actual_y, miss_distance_in, notes
```

`programs.type` is `lifting` or `throwing`, so one athlete's program list can
carry both a strength program and a bullpen/throwing program at once.

`daily_checkins.readiness_score` is computed client-side
(`src/lib/readiness.js`) as a weighted 0-100 blend of sleep (hours +
quality), soreness, mood, energy, nutrition, and inverted previous-day
workload, then stored for fast history/trend queries.

`command_pitches` coordinates are feet from the center of the plate
(matching Trackman-style PlateLocSide/PlateLocHeight), so the same
strike-zone geometry as the pitch visualizer applies. Miss distance is the
Euclidean distance between intended and actual, in inches
(`src/lib/commandMetrics.js`), aggregated by pitch type and by session for
trend charts.

All athlete-owned tables use Supabase Row Level Security: athletes can only
read/write their own rows; coaches can read/write rows for athletes whose
`coach_id` matches them.

## 3. Screens (athlete view)

- **Onboarding form** (first login, blocks until submitted)
- **Dashboard** — today's readiness score, assigned programs, command
  training snapshot, today's journal prompt, today's devotional, habit
  checklist, streaks
- **Daily Check-In** — sleep/soreness/mood/energy/nutrition/prior-day-load
  inputs, live readiness score + band, 14-day trend
- **My Program** — list of lifting/throwing workouts → exercise detail
  (sets/reps/description/embedded YouTube), mark-complete per exercise
- **Command Training** — click-to-place intended target vs. actual pitch
  location on a strike-zone grid, pitch type + velocity, auto-computed
  miss distance, average-miss/velo trends by pitch type and by session
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
- **Program builder** — create a lifting or throwing program → add
  workouts → add exercises (name, sets, reps, description, YouTube link) →
  assign to one or more athletes individually
- **Content library** — mental game talks, devotionals, journal prompts,
  habit templates (CRUD)
- **Athlete detail** — readiness trend, miss-distance-by-pitch-type,
  velocity trend, recent check-ins, assigned programs (with inline
  assign), workout logs, journal (if shared), habit adherence

## 5. Tech stack

- React + Vite (consistent with your existing app), React Router
- Supabase JS client for auth (email/password or magic link), Postgres, RLS
- TanStack Query for data fetching/caching
- Tailwind for styling (fast to build a clean, consistent UI)
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
4. ✅ Daily check-in + readiness calculator, command training (intended vs.
   actual + miss distance), coach roster + athlete detail with trend charts
5. Journal prompts + entries
6. Devotionals (coach posts, athlete views)
7. Habit templates + assignments + daily check-off + streaks
8. Mental game content library
9. Polish: notifications/reminders, exercise_logs progress rollups, CSV
   import for velo/command data from Trackman/Rapsodo

## 7. Open decisions for later

- Auto-assignment of coach vs. manual (multiple coaches?)
- Whether journals are private or visible to coach
- Push/email reminders for daily journal & habits
- Mobile: responsive web first, native app later if needed
