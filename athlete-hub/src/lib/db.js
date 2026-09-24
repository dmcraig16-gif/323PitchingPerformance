// Unified data client. Every function here works identically whether
// Supabase is configured (real backend) or not (localStorage preview mode)
// — pages import from here instead of talking to supabase/localStore
// directly, so the two modes stay interchangeable.

import { supabase, isSupabaseConfigured } from './supabaseClient'
import * as local from './localStore'

// ---------- profiles ----------

export async function getProfileByUserId(userId) {
  if (isSupabaseConfigured) {
    const { data } = await supabase.from('profiles').select('*').eq('user_id', userId).single()
    return data ?? null
  }
  return local.getAll('profiles').find((p) => p.user_id === userId) ?? null
}

export async function getProfileById(id) {
  if (isSupabaseConfigured) {
    const { data } = await supabase.from('profiles').select('*').eq('id', id).single()
    return data ?? null
  }
  return local.getAll('profiles').find((p) => p.id === id) ?? null
}

export async function listAthletesForCoach(coachId) {
  if (isSupabaseConfigured) {
    const { data } = await supabase.from('profiles').select('*').eq('coach_id', coachId)
    return data ?? []
  }
  return local.getAll('profiles').filter((p) => p.coach_id === coachId)
}

export function listDemoProfiles() {
  return local.getAll('profiles')
}

export async function createProfile(row) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('profiles').insert(row).select().single()
    if (error) throw error
    return data
  }
  return local.insert('profiles', row)
}

// Athletes who signed up without picking a coach yet — any coach can see
// and claim them onto their roster.
export async function listUnassignedAthletes() {
  if (isSupabaseConfigured) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'athlete')
      .is('coach_id', null)
    return data ?? []
  }
  return local.getAll('profiles').filter((p) => p.role === 'athlete' && !p.coach_id)
}

export async function claimAthlete(athleteId, coachId) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('profiles')
      .update({ coach_id: coachId })
      .eq('id', athleteId)
      .select()
      .single()
    if (error) throw error
    return data
  }
  return local.update('profiles', athleteId, { coach_id: coachId })
}

// ---------- daily check-ins ----------

export async function listCheckins(athleteId) {
  if (isSupabaseConfigured) {
    const { data } = await supabase
      .from('daily_checkins')
      .select('*')
      .eq('athlete_id', athleteId)
      .order('date', { ascending: true })
    return data ?? []
  }
  return local
    .getAll('daily_checkins')
    .filter((c) => c.athlete_id === athleteId)
    .sort((a, b) => a.date.localeCompare(b.date))
}

export async function getCheckinForDate(athleteId, date) {
  const rows = await listCheckins(athleteId)
  return rows.find((r) => r.date === date) ?? null
}

export async function upsertCheckin(row) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('daily_checkins')
      .upsert(row, { onConflict: 'athlete_id,date' })
      .select()
      .single()
    if (error) throw error
    return data
  }
  return local.upsert(
    'daily_checkins',
    row,
    (r) => r.athlete_id === row.athlete_id && r.date === row.date,
  )
}

// ---------- command training ----------
//
// A command session is one bullpen/flat-ground/pre-game pen. Pitches are
// logged one at a time against a session (by the athlete or by a coach
// charting live from the athlete's profile).

export async function listCommandSessions(athleteId) {
  if (isSupabaseConfigured) {
    const { data } = await supabase
      .from('command_sessions')
      .select('*')
      .eq('athlete_id', athleteId)
      .order('date', { ascending: false })
    return data ?? []
  }
  return local
    .getAll('command_sessions')
    .filter((s) => s.athlete_id === athleteId)
    .sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at))
}

export async function getCommandSession(id) {
  if (isSupabaseConfigured) {
    const { data } = await supabase.from('command_sessions').select('*').eq('id', id).single()
    return data ?? null
  }
  return local.getAll('command_sessions').find((s) => s.id === id) ?? null
}

export async function createCommandSession(row) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('command_sessions').insert(row).select().single()
    if (error) throw error
    return data
  }
  return local.insert('command_sessions', row)
}

export async function listPitchesForSession(sessionId) {
  if (isSupabaseConfigured) {
    const { data } = await supabase
      .from('command_pitches')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
    return data ?? []
  }
  return local
    .getAll('command_pitches')
    .filter((p) => p.session_id === sessionId)
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
}

// All-time pitches for an athlete, across every session — used for
// dashboard snapshots and profile-wide trend charts.
export async function listCommandPitches(athleteId) {
  if (isSupabaseConfigured) {
    const { data } = await supabase
      .from('command_pitches')
      .select('*')
      .eq('athlete_id', athleteId)
      .order('session_date', { ascending: true })
    return data ?? []
  }
  return local
    .getAll('command_pitches')
    .filter((p) => p.athlete_id === athleteId)
    .sort((a, b) => a.session_date.localeCompare(b.session_date))
}

export async function insertCommandPitch(row) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('command_pitches').insert(row).select().single()
    if (error) throw error
    return data
  }
  return local.insert('command_pitches', row)
}

// ---------- programs (templates) ----------
//
// A program is a pure template: no dates anywhere. It's built out of 12
// weeks (created automatically alongside the program), workouts inside a
// week (day_number 1-7 — multiple workouts can share a day_number, which
// is how a "day" holds more than one workout), and items inside a
// workout. See generateAssignedWorkouts() below for how assigning a
// program turns this into an athlete's actual dated schedule.

export async function listProgramsForCoach(coachId) {
  if (isSupabaseConfigured) {
    const { data } = await supabase.from('programs').select('*').eq('coach_id', coachId)
    return data ?? []
  }
  return local.getAll('programs').filter((p) => p.coach_id === coachId)
}

export async function createProgram(row) {
  let program
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('programs').insert(row).select().single()
    if (error) throw error
    program = data
  } else {
    program = local.insert('programs', row)
  }

  const weekRows = Array.from({ length: 12 }, (_, i) => ({ program_id: program.id, week_number: i + 1 }))
  if (isSupabaseConfigured) {
    const { error } = await supabase.from('program_weeks').insert(weekRows)
    if (error) throw error
  } else {
    weekRows.forEach((w) => local.insert('program_weeks', w))
  }

  return program
}

export async function listProgramWeeks(programId) {
  if (isSupabaseConfigured) {
    const { data } = await supabase
      .from('program_weeks')
      .select('*')
      .eq('program_id', programId)
      .order('week_number')
    return data ?? []
  }
  return local
    .getAll('program_weeks')
    .filter((w) => w.program_id === programId)
    .sort((a, b) => a.week_number - b.week_number)
}

export async function listTemplateWorkouts(weekId) {
  if (isSupabaseConfigured) {
    const { data } = await supabase
      .from('template_workouts')
      .select('*')
      .eq('week_id', weekId)
      .order('day_number')
      .order('order_index')
    return data ?? []
  }
  return local
    .getAll('template_workouts')
    .filter((w) => w.week_id === weekId)
    .sort((a, b) => a.day_number - b.day_number || a.order_index - b.order_index)
}

export async function createTemplateWorkout(row) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('template_workouts').insert(row).select().single()
    if (error) throw error
    return data
  }
  return local.insert('template_workouts', row)
}

export async function updateTemplateWorkout(id, patch) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('template_workouts').update(patch).eq('id', id).select().single()
    if (error) throw error
    return data
  }
  return local.update('template_workouts', id, patch)
}

export async function deleteTemplateWorkout(id) {
  if (isSupabaseConfigured) {
    const { error } = await supabase.from('template_workouts').delete().eq('id', id)
    if (error) throw error
    return
  }
  local.remove('template_workouts', id)
}

export async function listTemplateItems(workoutId) {
  if (isSupabaseConfigured) {
    const { data } = await supabase
      .from('template_items')
      .select('*')
      .eq('workout_id', workoutId)
      .order('order_index')
    return data ?? []
  }
  return local
    .getAll('template_items')
    .filter((it) => it.workout_id === workoutId)
    .sort((a, b) => a.order_index - b.order_index)
}

export async function createTemplateItem(row) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('template_items').insert(row).select().single()
    if (error) throw error
    return data
  }
  return local.insert('template_items', row)
}

export async function updateTemplateItem(id, patch) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('template_items').update(patch).eq('id', id).select().single()
    if (error) throw error
    return data
  }
  return local.update('template_items', id, patch)
}

export async function deleteTemplateItem(id) {
  if (isSupabaseConfigured) {
    const { error } = await supabase.from('template_items').delete().eq('id', id)
    if (error) throw error
    return
  }
  local.remove('template_items', id)
}

// ---------- assignments (where dates enter) ----------

export async function listAssignedPrograms(athleteId) {
  const assignments = await listAssignmentsForAthlete(athleteId)
  const programs = await Promise.all(
    assignments.map(async (a) => {
      if (isSupabaseConfigured) {
        const { data } = await supabase.from('programs').select('*').eq('id', a.program_id).single()
        return data
      }
      return local.getAll('programs').find((p) => p.id === a.program_id)
    }),
  )
  return programs.filter(Boolean)
}

export async function listAssignmentsForAthlete(athleteId) {
  if (isSupabaseConfigured) {
    const { data } = await supabase.from('program_assignments').select('*').eq('athlete_id', athleteId)
    return data ?? []
  }
  return local.getAll('program_assignments').filter((a) => a.athlete_id === athleteId)
}

export async function listAssignmentsForProgram(programId) {
  if (isSupabaseConfigured) {
    const { data } = await supabase
      .from('program_assignments')
      .select('*')
      .eq('program_id', programId)
    return data ?? []
  }
  return local.getAll('program_assignments').filter((a) => a.program_id === programId)
}

// Assigns a program to an athlete starting on startDate, then snapshots
// the template's current shape into dated, athlete-owned rows
// (assigned_workouts/assigned_items) — see generateAssignedWorkouts.
export async function assignProgram(programId, athleteId, startDate) {
  const row = { program_id: programId, athlete_id: athleteId, start_date: startDate || today() }
  const assignment = isSupabaseConfigured
    ? await (async () => {
        const { data, error } = await supabase.from('program_assignments').insert(row).select().single()
        if (error) throw error
        return data
      })()
    : local.insert('program_assignments', row)

  await generateAssignedWorkouts(assignment)
  return assignment
}

// date = start_date + (week_number - 1) * 7 + (day_number - 1) days —
// day_number 1 lands on start_date's weekday, day_number 2 the day after,
// week 2 day 1 exactly 7 days after start_date, and so on.
function workoutDate(startDate, weekNumber, dayNumber) {
  const d = new Date(`${startDate}T00:00:00`)
  d.setDate(d.getDate() + (weekNumber - 1) * 7 + (dayNumber - 1))
  return d.toISOString().slice(0, 10)
}

// Every field a template item/workout carries that should be copied
// verbatim into its assigned counterpart — the full nullable-by-type
// prescription shape shared by item_library/template_items/assigned_items.
export const ITEM_FIELDS = [
  'name', 'cues', 'youtube_url',
  'ball_weight_oz', 'num_throws', 'intent_pct', 'distance_target',
  'target_sets', 'rest_seconds', 'tempo',
  'sets', 'reps', 'duration_seconds', 'side',
]

async function generateAssignedWorkouts(assignment) {
  const weeks = await listProgramWeeks(assignment.program_id)
  for (const week of weeks) {
    const templateWorkouts = await listTemplateWorkouts(week.id)
    for (const tw of templateWorkouts) {
      const assignedWorkout = await createAssignedWorkout({
        assignment_id: assignment.id,
        athlete_id: assignment.athlete_id,
        template_workout_id: tw.id,
        week_number: week.week_number,
        day_number: tw.day_number,
        date: workoutDate(assignment.start_date, week.week_number, tw.day_number),
        type: tw.type,
        title: tw.title,
        notes: tw.notes,
        order_index: tw.order_index,
        status: 'pending',
      })
      const templateItems = await listTemplateItems(tw.id)
      for (const ti of templateItems) {
        const itemRow = { assigned_workout_id: assignedWorkout.id, template_item_id: ti.id, library_item_id: ti.library_item_id, order_index: ti.order_index }
        for (const field of ITEM_FIELDS) itemRow[field] = ti[field]
        await createAssignedItem(itemRow)
      }
    }
  }
}

// ---------- assigned_workouts / assigned_items (the dated schedule) ----------

export async function listAssignedWorkouts(athleteId) {
  if (isSupabaseConfigured) {
    const { data } = await supabase
      .from('assigned_workouts')
      .select('*')
      .eq('athlete_id', athleteId)
      .order('date')
    return data ?? []
  }
  return local
    .getAll('assigned_workouts')
    .filter((w) => w.athlete_id === athleteId)
    .sort((a, b) => a.date.localeCompare(b.date) || a.order_index - b.order_index)
}

export async function getAssignedWorkout(id) {
  if (isSupabaseConfigured) {
    const { data } = await supabase.from('assigned_workouts').select('*').eq('id', id).single()
    return data ?? null
  }
  return local.getAll('assigned_workouts').find((w) => w.id === id) ?? null
}

async function createAssignedWorkout(row) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('assigned_workouts').insert(row).select().single()
    if (error) throw error
    return data
  }
  return local.insert('assigned_workouts', row)
}

export async function updateAssignedWorkout(id, patch) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('assigned_workouts').update(patch).eq('id', id).select().single()
    if (error) throw error
    return data
  }
  return local.update('assigned_workouts', id, patch)
}

// The injury scenario: shift one workout (and, by default, every workout
// scheduled on or after it) by deltaDays without touching the template or
// any other athlete. Returns the updated workouts.
export async function shiftAssignedWorkouts(athleteId, fromDate, deltaDays, { onlyThisOne = false } = {}) {
  const workouts = await listAssignedWorkouts(athleteId)
  const toShift = onlyThisOne
    ? workouts.filter((w) => w.date === fromDate)
    : workouts.filter((w) => w.date >= fromDate)
  const updated = []
  for (const w of toShift) {
    const d = new Date(`${w.date}T00:00:00`)
    d.setDate(d.getDate() + deltaDays)
    updated.push(await updateAssignedWorkout(w.id, { date: d.toISOString().slice(0, 10) }))
  }
  return updated
}

export async function listAssignedItems(assignedWorkoutId) {
  if (isSupabaseConfigured) {
    const { data } = await supabase
      .from('assigned_items')
      .select('*')
      .eq('assigned_workout_id', assignedWorkoutId)
      .order('order_index')
    return data ?? []
  }
  return local
    .getAll('assigned_items')
    .filter((it) => it.assigned_workout_id === assignedWorkoutId)
    .sort((a, b) => a.order_index - b.order_index)
}

async function createAssignedItem(row) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('assigned_items').insert(row).select().single()
    if (error) throw error
    return data
  }
  return local.insert('assigned_items', row)
}

// Lets a coach adjust one athlete's assigned item (e.g. bump next week's
// load) without touching the template or any other athlete.
export async function updateAssignedItem(id, patch) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('assigned_items').update(patch).eq('id', id).select().single()
    if (error) throw error
    return data
  }
  return local.update('assigned_items', id, patch)
}

// ---------- item library ----------

export async function listItemLibrary(coachId) {
  if (isSupabaseConfigured) {
    const { data } = await supabase
      .from('item_library')
      .select('*')
      .eq('coach_id', coachId)
      .order('name')
    return data ?? []
  }
  return local
    .getAll('item_library')
    .filter((it) => it.coach_id === coachId)
    .sort((a, b) => a.name.localeCompare(b.name))
}

export async function createLibraryItem(row) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('item_library').insert(row).select().single()
    if (error) throw error
    return data
  }
  return local.insert('item_library', row)
}

export async function updateLibraryItem(id, patch) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('item_library')
      .update(patch)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  }
  return local.update('item_library', id, patch)
}

export async function deleteLibraryItem(id) {
  if (isSupabaseConfigured) {
    const { error } = await supabase.from('item_library').delete().eq('id', id)
    if (error) throw error
    return
  }
  local.remove('item_library', id)
}

// ---------- item logs (one row per logged set) ----------
//
// Throwing logs once per item (set_index null); Lifting and Mobility/
// Movement Prep log once per prescribed set (set_index 0, 1, 2…). `row`
// should carry assigned_item_id/assigned_workout_id/athlete_id/date plus
// whichever type fields apply. assigned_item_id points at an
// assigned_items row (the dated, athlete-owned copy) — never the
// template. assigned_workout_id drives the parent workout's status
// recompute and isn't stored on the log row itself.
//
// One logical "set" can have more than one field saved independently as
// the athlete blurs each input (reps, then weight, ...), so this upserts
// by (assigned_item_id, set_index, date) rather than always inserting —
// otherwise each field-level save would fragment into its own row and
// clobber visibility into the others logged for that same set today.
export async function logItemSet({ assigned_workout_id, assigned_item_id, set_index = null, ...row }) {
  const date = row.date ?? today()
  const full = { assigned_item_id, set_index, date, ...row }
  const saved = isSupabaseConfigured
    ? await (async () => {
        let query = supabase.from('item_logs').select('id').eq('assigned_item_id', assigned_item_id).eq('date', date)
        query = set_index === null ? query.is('set_index', null) : query.eq('set_index', set_index)
        const { data: existing } = await query.maybeSingle()
        const { data, error } = existing
          ? await supabase.from('item_logs').update(full).eq('id', existing.id).select().single()
          : await supabase.from('item_logs').insert(full).select().single()
        if (error) throw error
        return data
      })()
    : local.upsert(
        'item_logs',
        full,
        (r) => r.assigned_item_id === assigned_item_id && r.set_index === set_index && r.date === date,
      )

  if (assigned_workout_id) await recomputeWorkoutStatus(assigned_workout_id)
  return saved
}

// Every logged set for one assigned_items row, oldest first — used to
// trend a specific item over time and to prefill "already logged" state.
export async function listLogsForItem(assignedItemId) {
  if (isSupabaseConfigured) {
    const { data } = await supabase
      .from('item_logs')
      .select('*')
      .eq('assigned_item_id', assignedItemId)
      .order('date', { ascending: true })
    return data ?? []
  }
  return local
    .getAll('item_logs')
    .filter((l) => l.assigned_item_id === assignedItemId)
    .sort((a, b) => a.date.localeCompare(b.date))
}

// Every logged set across an athlete's whole history, oldest first — the
// Progress tab's source for body-weight/velocity/sleep and per-exercise
// trend graphs. item_logs carries athlete_id/date directly, so this
// doesn't need to join through assigned_items just to filter by athlete.
export async function listItemLogsForAthlete(athleteId) {
  if (isSupabaseConfigured) {
    const { data } = await supabase
      .from('item_logs')
      .select('*')
      .eq('athlete_id', athleteId)
      .order('date', { ascending: true })
    return data ?? []
  }
  return local
    .getAll('item_logs')
    .filter((l) => l.athlete_id === athleteId)
    .sort((a, b) => a.date.localeCompare(b.date))
}

// Every assigned_items row across an athlete's whole history — paired
// with listItemLogsForAthlete to know each log's exercise name/library
// item/type (assigned_items has no athlete_id of its own, only via its
// parent assigned_workouts, so this filters through that).
export async function listAssignedItemsForAthlete(athleteId) {
  const workouts = await listAssignedWorkouts(athleteId)
  const workoutIds = workouts.map((w) => w.id)
  if (workoutIds.length === 0) return []
  if (isSupabaseConfigured) {
    const { data } = await supabase.from('assigned_items').select('*').in('assigned_workout_id', workoutIds)
    return data ?? []
  }
  const idSet = new Set(workoutIds)
  return local.getAll('assigned_items').filter((it) => idSet.has(it.assigned_workout_id))
}

// Recomputes a workout's denormalized status from its items' logs — every
// item with at least one log vs. the total item count — so the calendar
// can paint completed/partial/pending dots from a flat query instead of
// joining items/logs for every day on screen.
async function recomputeWorkoutStatus(assignedWorkoutId) {
  const items = await listAssignedItems(assignedWorkoutId)
  if (items.length === 0) return
  const loggedFlags = await Promise.all(
    items.map((it) => listLogsForItem(it.id).then((logs) => logs.length > 0)),
  )
  const loggedCount = loggedFlags.filter(Boolean).length
  const status = loggedCount === 0 ? 'pending' : loggedCount === items.length ? 'completed' : 'partial'
  await updateAssignedWorkout(assignedWorkoutId, { status })
}

// ---------- journal (freeform notes) ----------

export async function listJournalEntries(athleteId) {
  if (isSupabaseConfigured) {
    const { data } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('athlete_id', athleteId)
      .order('date', { ascending: false })
    return data ?? []
  }
  return local
    .getAll('journal_entries')
    .filter((j) => j.athlete_id === athleteId)
    .sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at))
}

export async function createJournalEntry(row) {
  const full = { date: today(), ...row }
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('journal_entries').insert(full).select().single()
    if (error) throw error
    return data
  }
  return local.insert('journal_entries', full)
}

export async function updateJournalEntry(id, patch) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('journal_entries').update(patch).eq('id', id).select().single()
    if (error) throw error
    return data
  }
  return local.update('journal_entries', id, patch)
}

// The Dashboard's quick-capture widget edits one entry per day in place
// rather than appending a new row every time it's saved; the full
// Journal page still supports multiple reflections a day via
// createJournalEntry directly, unaffected. listJournalEntries already
// sorts newest-first, so the first match for `date` is the latest.
export async function getJournalEntryForDate(athleteId, date) {
  const entries = await listJournalEntries(athleteId)
  return entries.find((e) => e.date === date) ?? null
}

function today() {
  return new Date().toISOString().slice(0, 10)
}
