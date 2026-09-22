-- Athlete Hub schema
-- Run this in the Supabase SQL editor on a fresh project.

create table profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  role text not null check (role in ('coach', 'athlete')),
  name text not null,
  email text not null,
  coach_id uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table programs (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  description text,
  type text not null default 'lifting' check (type in ('lifting', 'throwing')),
  created_at timestamptz not null default now()
);

create table program_assignments (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references programs(id) on delete cascade,
  athlete_id uuid not null references profiles(id) on delete cascade,
  start_date date not null default current_date,
  status text not null default 'active' check (status in ('active', 'completed', 'paused'))
);

create table workouts (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references programs(id) on delete cascade,
  name text not null,
  day_label text,
  order_index int not null default 0
);

-- Reusable exercise library — the "Exercise Builder". Coaches define an
-- exercise once (type, description, demo video) and reuse it across any
-- number of workouts, instead of retyping it every time.
create table exercise_library (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  type text not null,
  description text,
  video_url text,
  created_at timestamptz not null default now()
);

-- One exercise as used inside a specific workout. name/description/type/
-- youtube_url are copied from the library exercise at add-time (so a
-- program is a snapshot, not silently altered by later library edits);
-- library_exercise_id keeps the link back for traceability. sets/reps/
-- description here can be overridden per workout (e.g. lighter sets in a
-- deload week) without touching the library entry.
create table exercises (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references workouts(id) on delete cascade,
  library_exercise_id uuid references exercise_library(id) on delete set null,
  name text not null,
  type text,
  description text,
  sets int,
  reps int,
  -- Prescribed target for this workout instance — a weight (lb) for a
  -- lifting exercise or a velocity (mph) for a throwing drill. Athletes
  -- log their actual result against it in exercise_logs.
  target_value numeric,
  target_unit text,
  youtube_url text,
  order_index int not null default 0
);

-- One row per time an athlete logs a result for a prescribed exercise.
-- Lifting exercises log weight + reps_completed; throwing exercises log
-- velocity. Grouping logs by exercises.library_exercise_id (when set)
-- shows the trend for "this exercise" across every workout that reused it,
-- not just one program instance.
create table exercise_logs (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references exercises(id) on delete cascade,
  athlete_id uuid not null references profiles(id) on delete cascade,
  date date not null default current_date,
  sets_completed int,
  reps_completed int,
  weight numeric,
  velocity numeric,
  notes text,
  created_at timestamptz not null default now()
);

create table journal_prompts (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid references profiles(id),
  date date,
  recurring_rule text,
  text text not null,
  category text
);

create table journal_entries (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references profiles(id) on delete cascade,
  prompt_id uuid references journal_prompts(id),
  date date not null default current_date,
  content text not null,
  created_at timestamptz not null default now()
);

create table devotionals (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid references profiles(id),
  date date not null default current_date,
  title text not null,
  body text not null,
  media_url text
);

create table devotional_views (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references profiles(id) on delete cascade,
  devotional_id uuid not null references devotionals(id) on delete cascade,
  viewed_at timestamptz not null default now()
);

create table habit_templates (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  description text,
  cadence text not null default 'daily' check (cadence in ('daily', 'weekly')),
  category text
);

create table habit_assignments (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references profiles(id) on delete cascade,
  habit_template_id uuid not null references habit_templates(id) on delete cascade,
  target text,
  active boolean not null default true
);

create table habit_logs (
  id uuid primary key default gen_random_uuid(),
  habit_assignment_id uuid not null references habit_assignments(id) on delete cascade,
  date date not null default current_date,
  completed boolean not null default false,
  value text,
  notes text
);

-- Daily mental + physical check-in. readiness_score is computed client-side
-- (see src/lib/readiness.js) and stored so history/trends don't need to
-- recompute from raw inputs, but the raw inputs are kept for auditing.
create table daily_checkins (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references profiles(id) on delete cascade,
  date date not null default current_date,
  weight_lb numeric,
  sleep_hours numeric not null,
  sleep_quality int not null check (sleep_quality between 1 and 5),
  strain int not null check (strain between 1 and 5),
  arm_soreness int not null check (arm_soreness between 1 and 5),
  lower_soreness int not null check (lower_soreness between 1 and 5),
  mood int not null check (mood between 1 and 5),
  energy int not null check (energy between 1 and 5),
  nutrition int not null check (nutrition between 1 and 5),
  hydration int not null check (hydration between 1 and 5),
  notes text,
  readiness_score numeric not null,
  created_at timestamptz not null default now(),
  unique (athlete_id, date)
);

-- Command training: a bullpen (or flat ground / pre-game pen) session that
-- pitches are logged against one at a time, live. logged_by records whether
-- the athlete or their coach was charting the pen.
create table command_sessions (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references profiles(id) on delete cascade,
  logged_by uuid not null references profiles(id),
  date date not null default current_date,
  label text,
  notes text,
  created_at timestamptz not null default now()
);

-- One row per thrown pitch within a session, comparing intended target to
-- actual result. Coordinates are feet from the center of the plate
-- (x = horizontal, y = height), matching Trackman-style plate location so
-- the visualizer components can be reused. miss_distance_in is inches.
create table command_pitches (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references command_sessions(id) on delete cascade,
  athlete_id uuid not null references profiles(id) on delete cascade,
  session_date date not null default current_date,
  pitch_type text not null,
  velocity numeric,
  intended_x numeric not null,
  intended_y numeric not null,
  actual_x numeric not null,
  actual_y numeric not null,
  miss_distance_in numeric not null,
  notes text,
  created_at timestamptz not null default now()
);

create table mental_game_content (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  body text,
  media_url text,
  category text,
  published_at timestamptz not null default now()
);

-- Row Level Security

alter table profiles enable row level security;
alter table programs enable row level security;
alter table program_assignments enable row level security;
alter table workouts enable row level security;
alter table exercise_library enable row level security;
alter table exercises enable row level security;
alter table exercise_logs enable row level security;
alter table journal_prompts enable row level security;
alter table journal_entries enable row level security;
alter table devotionals enable row level security;
alter table devotional_views enable row level security;
alter table habit_templates enable row level security;
alter table habit_assignments enable row level security;
alter table habit_logs enable row level security;
alter table mental_game_content enable row level security;
alter table daily_checkins enable row level security;
alter table command_sessions enable row level security;
alter table command_pitches enable row level security;

-- Helper: is the current user a coach, and what's their profile id?
create or replace function current_profile_id() returns uuid as $$
  select id from profiles where user_id = auth.uid()
$$ language sql stable;

create or replace function is_coach() returns boolean as $$
  select role = 'coach' from profiles where user_id = auth.uid()
$$ language sql stable;

-- profiles: a user can read/update their own row; coaches can read athletes assigned to them
create policy "profiles_self" on profiles for select using (user_id = auth.uid());
create policy "profiles_self_update" on profiles for update using (user_id = auth.uid());
create policy "profiles_coach_view_athletes" on profiles for select using (
  is_coach() and coach_id = current_profile_id()
);
create policy "profiles_insert_self" on profiles for insert with check (user_id = auth.uid());

-- unassigned athletes (coach_id is null) are visible to any coach, and any
-- coach can claim one onto their own roster — lets a newly signed-up
-- athlete who hasn't picked a coach yet show up for a coach to add
create policy "profiles_view_unassigned_athletes" on profiles for select using (
  role = 'athlete' and coach_id is null
);
create policy "profiles_coach_claim_athlete" on profiles for update using (
  is_coach() and role = 'athlete' and coach_id is null
) with check (
  coach_id = current_profile_id()
);

-- programs: owned by coach
create policy "programs_coach_owns" on programs for all using (coach_id = current_profile_id());
create policy "programs_athlete_view" on programs for select using (
  id in (
    select program_id from program_assignments where athlete_id = current_profile_id()
  )
);

-- program_assignments: coach manages; athlete views their own
create policy "assignments_coach_owns" on program_assignments for all using (
  program_id in (select id from programs where coach_id = current_profile_id())
);
create policy "assignments_athlete_view" on program_assignments for select using (
  athlete_id = current_profile_id()
);

-- workouts / exercises: follow program ownership
create policy "workouts_coach_owns" on workouts for all using (
  program_id in (select id from programs where coach_id = current_profile_id())
);
create policy "workouts_athlete_view" on workouts for select using (
  program_id in (select program_id from program_assignments where athlete_id = current_profile_id())
);

-- exercise_library: coach-owned only — athletes never query it directly,
-- they see exercises through the workouts/programs assigned to them
create policy "exercise_library_coach_owns" on exercise_library for all using (
  coach_id = current_profile_id()
);

create policy "exercises_coach_owns" on exercises for all using (
  workout_id in (
    select w.id from workouts w join programs p on p.id = w.program_id
    where p.coach_id = current_profile_id()
  )
);
create policy "exercises_athlete_view" on exercises for select using (
  workout_id in (
    select w.id from workouts w
    join program_assignments pa on pa.program_id = w.program_id
    where pa.athlete_id = current_profile_id()
  )
);

-- exercise_logs: athlete owns; coach can view logs of their athletes
create policy "exercise_logs_athlete_own" on exercise_logs for all using (
  athlete_id = current_profile_id()
);
create policy "exercise_logs_coach_view" on exercise_logs for select using (
  athlete_id in (select id from profiles where coach_id = current_profile_id())
);

-- journal_prompts/devotionals/habit_templates/mental_game_content: coach manages, athletes read all from their coach
create policy "journal_prompts_coach_owns" on journal_prompts for all using (
  coach_id = current_profile_id()
);
create policy "journal_prompts_athlete_view" on journal_prompts for select using (
  coach_id = (select coach_id from profiles where id = current_profile_id())
);

create policy "journal_entries_athlete_own" on journal_entries for all using (
  athlete_id = current_profile_id()
);
create policy "journal_entries_coach_view" on journal_entries for select using (
  athlete_id in (select id from profiles where coach_id = current_profile_id())
);

create policy "devotionals_coach_owns" on devotionals for all using (
  coach_id = current_profile_id()
);
create policy "devotionals_athlete_view" on devotionals for select using (
  coach_id = (select coach_id from profiles where id = current_profile_id())
);

create policy "devotional_views_athlete_own" on devotional_views for all using (
  athlete_id = current_profile_id()
);

create policy "habit_templates_coach_owns" on habit_templates for all using (
  coach_id = current_profile_id()
);
create policy "habit_templates_athlete_view" on habit_templates for select using (
  coach_id = (select coach_id from profiles where id = current_profile_id())
);

create policy "habit_assignments_athlete_own" on habit_assignments for select using (
  athlete_id = current_profile_id()
);
create policy "habit_assignments_coach_manage" on habit_assignments for all using (
  habit_template_id in (select id from habit_templates where coach_id = current_profile_id())
);

create policy "habit_logs_athlete_own" on habit_logs for all using (
  habit_assignment_id in (select id from habit_assignments where athlete_id = current_profile_id())
);
create policy "habit_logs_coach_view" on habit_logs for select using (
  habit_assignment_id in (
    select ha.id from habit_assignments ha
    join habit_templates ht on ht.id = ha.habit_template_id
    where ht.coach_id = current_profile_id()
  )
);

create policy "mental_game_coach_owns" on mental_game_content for all using (
  coach_id = current_profile_id()
);
create policy "mental_game_athlete_view" on mental_game_content for select using (
  coach_id = (select coach_id from profiles where id = current_profile_id())
);

-- daily_checkins: athlete owns; coach can view check-ins of their athletes
create policy "checkins_athlete_own" on daily_checkins for all using (
  athlete_id = current_profile_id()
);
create policy "checkins_coach_view" on daily_checkins for select using (
  athlete_id in (select id from profiles where coach_id = current_profile_id())
);

-- command_sessions: athlete owns their own sessions; coach can view AND
-- create/log sessions for their assigned athletes (charting live from the
-- athlete's profile during a bullpen)
create policy "command_sessions_athlete_own" on command_sessions for all using (
  athlete_id = current_profile_id()
);
create policy "command_sessions_coach_manage" on command_sessions for all using (
  athlete_id in (select id from profiles where coach_id = current_profile_id())
);

-- command_pitches: same pattern — athlete owns; coach can also log/view
-- pitches for their assigned athletes
create policy "command_pitches_athlete_own" on command_pitches for all using (
  athlete_id = current_profile_id()
);
create policy "command_pitches_coach_manage" on command_pitches for all using (
  athlete_id in (select id from profiles where coach_id = current_profile_id())
);
