# Athlete Hub — Architecture & Build Plan

A standalone web app (new repo) for coaches to deliver programming, mental-game
content, and habit/journal tools to athletes. Built on React + Supabase
(Postgres, Auth, Storage, Row Level Security).

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
```

All athlete-owned tables use Supabase Row Level Security: athletes can only
read/write their own rows; coaches can read/write rows for athletes whose
`coach_id` matches them.

## 3. Screens (athlete view)

- **Onboarding form** (first login, blocks until submitted)
- **Dashboard** — today's workout, today's journal prompt, today's devotional,
  habit checklist, streaks
- **My Program** — list of workouts → exercise detail (sets/reps/description/
  embedded YouTube)
- **Log Workout** — quick-entry per exercise, marks complete
- **Journal** — calendar of past entries + today's prompt + freeform entry
- **Devotionals** — daily devotional archive
- **Habits** — customizable routine view (morning/evening rhythm: sleep
  window, light exposure, meals) with daily check-off
- **Mental Game** — library of talks/articles from coach
- **Profile/Progress** — workout history, habit streaks, journal history

## 4. Screens (coach view)

- **Athlete roster** — list, onboarding status, last activity
- **Review onboarding** → assign coach/program
- **Program builder** — create program → add workouts → add exercises
  (name, sets, reps, description, YouTube link)
- **Content library** — mental game talks, devotionals, journal prompts,
  habit templates (CRUD)
- **Athlete detail** — view one athlete's logs, journal (if shared), habit
  adherence

## 5. Tech stack

- React + Vite (consistent with your existing app), React Router
- Supabase JS client for auth (email/password or magic link), Postgres, RLS
- TanStack Query for data fetching/caching
- Tailwind for styling (fast to build a clean, consistent UI)
- YouTube embeds via `<iframe>` from stored video IDs/links
- Deployed on Vercel/Netlify (static frontend) + Supabase (hosted backend)

## 6. Build order (incremental, each step shippable)

1. Repo scaffold + Supabase project + auth (sign up/login) + `profiles` table
2. Onboarding form → coach assignment (manual assignment to start)
3. Program builder (coach) + program/workout/exercise viewing (athlete)
4. Exercise logging (athlete) + basic progress view
5. Journal prompts + entries
6. Devotionals (coach posts, athlete views)
7. Habit templates + assignments + daily check-off + streaks
8. Mental game content library
9. Polish: dashboard rollup, notifications/reminders, coach athlete-detail view

## 7. Open decisions for later

- Auto-assignment of coach vs. manual (multiple coaches?)
- Whether journals are private or visible to coach
- Push/email reminders for daily journal & habits
- Mobile: responsive web first, native app later if needed
