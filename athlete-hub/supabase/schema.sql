-- Athlete Hub schema
-- Run this in the Supabase SQL editor on a fresh project.

create table profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  role text not null check (role in ('coach', 'athlete')),
  name text not null,
  email text not null,
  coach_id uuid references profiles(id),
  -- Throwing hand — used to translate a Command Tracker miss's raw x/y
  -- into pitching-specific arm-side/glove-side language. Nullable; code
  -- treats an unset value as 'R'.
  throws text check (throws in ('R', 'L')),
  created_at timestamptz not null default now()
);

create table programs (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Programming: template vs. assignment
--
-- A program is a reusable template — no dates anywhere in it. It's built
-- out of weeks (numbered 1-12), workouts inside a week (day_number 1-7 —
-- multiple workouts can share a day_number, which is how a "day" holds
-- more than one workout without needing its own table), and items inside
-- a workout (a throwing drill, lifting exercise, or mobility/movement-prep
-- move, shaped by the workout's type). Editing a template never touches
-- an athlete who's already running it, because assigning a program
-- *copies* its current shape into athlete-owned, dated rows
-- (assigned_workouts/assigned_items) — see below. That copy is what an
-- athlete actually sees, logs against, and what a coach reschedules if
-- someone gets hurt in week three.
-- ---------------------------------------------------------------------

create table program_assignments (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references programs(id) on delete cascade,
  athlete_id uuid not null references profiles(id) on delete cascade,
  start_date date not null default current_date,
  status text not null default 'active' check (status in ('active', 'completed', 'paused')),
  created_at timestamptz not null default now()
);

create table program_weeks (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references programs(id) on delete cascade,
  week_number int not null check (week_number between 1 and 12),
  name text,
  unique (program_id, week_number)
);

-- One of four types — the type drives which prescription columns on
-- template_items/assigned_items are meaningful and which logging UI the
-- athlete gets (see item_library below). order_index orders workouts
-- within a shared day_number.
create table template_workouts (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references program_weeks(id) on delete cascade,
  day_number int not null check (day_number between 1 and 7),
  type text not null check (type in ('throwing', 'lifting', 'mobility', 'movement_prep')),
  title text not null,
  notes text,
  order_index int not null default 0
);

-- Reusable item library — the "Item Library". Coaches define an item once
-- (type, cues, demo video, and its type-specific prescription defaults)
-- and reuse it across any number of workouts instead of retyping it every
-- time. This is the catalog; a "template item" below is one prescribed
-- use of a library entry inside one workout.
--
-- Columns below the shared set are nullable and used per-type only:
--   throwing:            ball_weight_oz, num_throws, intent_pct, distance_target
--   lifting:              target_sets, rest_seconds, tempo
--   mobility/movement_prep: sets, reps, duration_seconds, side
--
-- target_sets is a jsonb array of {reps, load}, one entry per set, since
-- a lifting prescription's reps/load can differ set to set (a pyramid, a
-- wave-loaded scheme) — the only field that doesn't fit a plain column.
create table item_library (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references profiles(id) on delete cascade,
  type text not null check (type in ('throwing', 'lifting', 'mobility', 'movement_prep')),
  name text not null,
  cues text,
  youtube_url text,
  ball_weight_oz numeric,
  num_throws int,
  intent_pct int,
  distance_target numeric,
  target_sets jsonb,
  rest_seconds int,
  tempo text,
  sets int,
  reps int,
  duration_seconds int,
  side text check (side in ('left', 'right', 'both')),
  created_at timestamptz not null default now()
);

-- An item inside a template workout — same nullable-by-type column shape
-- as item_library (minus coach_id/type; type is inherited from the
-- parent workout). Every field is copied from the library entry at
-- add-time (so a template is a snapshot, not silently altered by later
-- library edits); library_item_id keeps the link back for reuse/trend
-- grouping.
create table template_items (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references template_workouts(id) on delete cascade,
  library_item_id uuid references item_library(id) on delete set null,
  name text not null,
  cues text,
  youtube_url text,
  ball_weight_oz numeric,
  num_throws int,
  intent_pct int,
  distance_target numeric,
  target_sets jsonb,
  rest_seconds int,
  tempo text,
  sets int,
  reps int,
  duration_seconds int,
  side text check (side in ('left', 'right', 'both')),
  order_index int not null default 0
);

-- The assignment side: one row per dated workout an athlete actually has
-- on their calendar. Generated by copying template_workouts when a
-- program is assigned (start_date + (week_number-1)*7 + (day_number-1)
-- days); `date` is then independently editable per athlete — shifting one
-- athlete's week 3 after an injury never touches the template or anyone
-- else's schedule. template_workout_id is kept for traceability only.
--
-- `status` is denormalized — recomputed whenever a log is written against
-- one of this workout's items (distinct logged items vs. total items) —
-- so the calendar's month view can paint every day's dots from one flat
-- query instead of joining items/logs for every day on screen. "Missed"
-- is *not* stored: it's derived at render time as date < today and
-- status = 'pending', so it can never go stale the way a stored value
-- could once "today" moves on.
create table assigned_workouts (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references program_assignments(id) on delete cascade,
  athlete_id uuid not null references profiles(id) on delete cascade,
  template_workout_id uuid references template_workouts(id) on delete set null,
  week_number int not null,
  day_number int not null,
  date date not null,
  type text not null check (type in ('throwing', 'lifting', 'mobility', 'movement_prep')),
  title text not null,
  notes text,
  order_index int not null default 0,
  status text not null default 'pending' check (status in ('pending', 'partial', 'completed'))
);

-- The dated, athlete-owned copy of a template_item — what the athlete
-- actually sees and logs results against. template_item_id/
-- library_item_id are kept for traceability and trend grouping.
create table assigned_items (
  id uuid primary key default gen_random_uuid(),
  assigned_workout_id uuid not null references assigned_workouts(id) on delete cascade,
  template_item_id uuid references template_items(id) on delete set null,
  library_item_id uuid references item_library(id) on delete set null,
  name text not null,
  cues text,
  youtube_url text,
  ball_weight_oz numeric,
  num_throws int,
  intent_pct int,
  distance_target numeric,
  target_sets jsonb,
  rest_seconds int,
  tempo text,
  sets int,
  reps int,
  duration_seconds int,
  side text check (side in ('left', 'right', 'both')),
  order_index int not null default 0
);

-- One row per logged set. Throwing logs once per item (set_index null);
-- Lifting and Mobility/Movement Prep log once per prescribed set
-- (set_index 0, 1, 2…). Which columns matter follows the parent item's
-- type, same nullable-by-type convention as assigned_items itself.
create table item_logs (
  id uuid primary key default gen_random_uuid(),
  assigned_item_id uuid not null references assigned_items(id) on delete cascade,
  athlete_id uuid not null references profiles(id) on delete cascade,
  date date not null default current_date,
  set_index int,
  throws_completed int,
  velocity numeric,
  actual_reps int,
  actual_weight numeric,
  actual_duration_seconds numeric,
  completed boolean,
  note text,
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
  -- Optional WHOOP metrics (see facilityConfig.js WHOOP_FIELDS). All
  -- nullable — an athlete with no WHOOP just never fills these in.
  whoop_recovery numeric,
  whoop_strain numeric,
  whoop_sleep_performance numeric,
  whoop_hrv numeric,
  whoop_resting_hr numeric,
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
alter table program_weeks enable row level security;
alter table template_workouts enable row level security;
alter table item_library enable row level security;
alter table template_items enable row level security;
alter table assigned_workouts enable row level security;
alter table assigned_items enable row level security;
alter table item_logs enable row level security;
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

-- program_weeks / template_workouts / template_items: template content
-- follows program ownership. Athletes never read the template directly —
-- they only ever see the dated copy in assigned_workouts/assigned_items —
-- so there's no athlete-view policy on any of these three.
create policy "program_weeks_coach_owns" on program_weeks for all using (
  program_id in (select id from programs where coach_id = current_profile_id())
);

create policy "template_workouts_coach_owns" on template_workouts for all using (
  week_id in (
    select w.id from program_weeks w join programs p on p.id = w.program_id
    where p.coach_id = current_profile_id()
  )
);

-- item_library: coach-owned only — athletes never query it directly,
-- they see items through the assigned_workouts/assigned_items assigned to them
create policy "item_library_coach_owns" on item_library for all using (
  coach_id = current_profile_id()
);

create policy "template_items_coach_owns" on template_items for all using (
  workout_id in (
    select w.id from template_workouts w
    join program_weeks pw on pw.id = w.week_id
    join programs p on p.id = pw.program_id
    where p.coach_id = current_profile_id()
  )
);

-- assigned_workouts / assigned_items: the dated, athlete-owned copy.
-- Athletes read their own; coaches can read AND write (rescheduling a
-- workout, or building/adjusting one, from the athlete's profile) for
-- their assigned athletes. Generation (assigning a program) runs as the
-- coach, inserting rows with athlete_id set to the assignee, so it's
-- covered by the same "coach manages their athletes" policy.
create policy "assigned_workouts_athlete_own" on assigned_workouts for all using (
  athlete_id = current_profile_id()
);
create policy "assigned_workouts_coach_manage" on assigned_workouts for all using (
  athlete_id in (select id from profiles where coach_id = current_profile_id())
);

create policy "assigned_items_athlete_own" on assigned_items for all using (
  assigned_workout_id in (select id from assigned_workouts where athlete_id = current_profile_id())
);
create policy "assigned_items_coach_manage" on assigned_items for all using (
  assigned_workout_id in (
    select w.id from assigned_workouts w
    join profiles p on p.id = w.athlete_id
    where p.coach_id = current_profile_id()
  )
);

-- item_logs: athlete owns; coach can view logs of their athletes
create policy "item_logs_athlete_own" on item_logs for all using (
  athlete_id = current_profile_id()
);
create policy "item_logs_coach_view" on item_logs for select using (
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
