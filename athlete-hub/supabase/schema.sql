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

create table onboarding_forms (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references auth.users(id) on delete cascade,
  answers jsonb not null,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create table programs (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  description text,
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

create table exercises (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references workouts(id) on delete cascade,
  name text not null,
  description text,
  sets int,
  reps int,
  youtube_url text,
  order_index int not null default 0
);

create table exercise_logs (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references exercises(id) on delete cascade,
  athlete_id uuid not null references profiles(id) on delete cascade,
  date date not null default current_date,
  sets_completed int,
  reps_completed int,
  weight numeric,
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
alter table onboarding_forms enable row level security;
alter table programs enable row level security;
alter table program_assignments enable row level security;
alter table workouts enable row level security;
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

-- onboarding_forms: athlete owns their own; coach can view forms of their assigned athletes
create policy "onboarding_athlete_own" on onboarding_forms for all using (
  athlete_id = auth.uid()
);
create policy "onboarding_coach_view" on onboarding_forms for select using (
  is_coach() and athlete_id in (
    select user_id from profiles where coach_id = current_profile_id()
  )
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
