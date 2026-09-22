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
// weeks (created automatically alongside the program), sessions inside a
// week (ordered by day_number), and drills inside a session. See
// generateAthleteSessions() below for how assigning a program turns this
// into an athlete's actual dated schedule.

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

export async function listTemplateSessions(weekId) {
  if (isSupabaseConfigured) {
    const { data } = await supabase
      .from('template_sessions')
      .select('*')
      .eq('week_id', weekId)
      .order('day_number')
    return data ?? []
  }
  return local
    .getAll('template_sessions')
    .filter((s) => s.week_id === weekId)
    .sort((a, b) => a.day_number - b.day_number)
}

export async function createTemplateSession(row) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('template_sessions').insert(row).select().single()
    if (error) throw error
    return data
  }
  return local.insert('template_sessions', row)
}

export async function deleteTemplateSession(id) {
  if (isSupabaseConfigured) {
    const { error } = await supabase.from('template_sessions').delete().eq('id', id)
    if (error) throw error
    return
  }
  local.remove('template_sessions', id)
}

export async function listTemplateDrills(sessionId) {
  if (isSupabaseConfigured) {
    const { data } = await supabase
      .from('template_drills')
      .select('*')
      .eq('session_id', sessionId)
      .order('order_index')
    return data ?? []
  }
  return local
    .getAll('template_drills')
    .filter((d) => d.session_id === sessionId)
    .sort((a, b) => a.order_index - b.order_index)
}

export async function createTemplateDrill(row) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('template_drills').insert(row).select().single()
    if (error) throw error
    return data
  }
  return local.insert('template_drills', row)
}

export async function updateTemplateDrill(id, patch) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('template_drills').update(patch).eq('id', id).select().single()
    if (error) throw error
    return data
  }
  return local.update('template_drills', id, patch)
}

export async function deleteTemplateDrill(id) {
  if (isSupabaseConfigured) {
    const { error } = await supabase.from('template_drills').delete().eq('id', id)
    if (error) throw error
    return
  }
  local.remove('template_drills', id)
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
// (athlete_sessions/athlete_drills) — see generateAthleteSessions.
export async function assignProgram(programId, athleteId, startDate) {
  const row = { program_id: programId, athlete_id: athleteId, start_date: startDate || today() }
  const assignment = isSupabaseConfigured
    ? await (async () => {
        const { data, error } = await supabase.from('program_assignments').insert(row).select().single()
        if (error) throw error
        return data
      })()
    : local.insert('program_assignments', row)

  await generateAthleteSessions(assignment)
  return assignment
}

// date = start_date + (week_number - 1) * 7 + (day_number - 1) days —
// day_number 1 lands on start_date's weekday, day_number 2 the day after,
// week 2 day 1 exactly 7 days after start_date, and so on.
function sessionDate(startDate, weekNumber, dayNumber) {
  const d = new Date(`${startDate}T00:00:00`)
  d.setDate(d.getDate() + (weekNumber - 1) * 7 + (dayNumber - 1))
  return d.toISOString().slice(0, 10)
}

async function generateAthleteSessions(assignment) {
  const weeks = await listProgramWeeks(assignment.program_id)
  for (const week of weeks) {
    const templateSessions = await listTemplateSessions(week.id)
    for (const ts of templateSessions) {
      const athleteSession = await createAthleteSession({
        assignment_id: assignment.id,
        athlete_id: assignment.athlete_id,
        template_session_id: ts.id,
        week_number: week.week_number,
        day_number: ts.day_number,
        date: sessionDate(assignment.start_date, week.week_number, ts.day_number),
        name: ts.name,
        notes: ts.notes,
        order_index: ts.order_index,
      })
      const templateDrills = await listTemplateDrills(ts.id)
      for (const td of templateDrills) {
        await createAthleteDrill({
          athlete_session_id: athleteSession.id,
          template_drill_id: td.id,
          library_exercise_id: td.library_exercise_id,
          name: td.name,
          type: td.type,
          description: td.description,
          intent: td.intent,
          sets: td.sets,
          reps: td.reps,
          target_value: td.target_value,
          target_unit: td.target_unit,
          youtube_url: td.youtube_url,
          order_index: td.order_index,
        })
      }
    }
  }
}

// ---------- athlete_sessions / athlete_drills (the dated schedule) ----------

export async function listAthleteSessions(athleteId) {
  if (isSupabaseConfigured) {
    const { data } = await supabase
      .from('athlete_sessions')
      .select('*')
      .eq('athlete_id', athleteId)
      .order('date')
    return data ?? []
  }
  return local
    .getAll('athlete_sessions')
    .filter((s) => s.athlete_id === athleteId)
    .sort((a, b) => a.date.localeCompare(b.date) || a.order_index - b.order_index)
}

async function createAthleteSession(row) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('athlete_sessions').insert(row).select().single()
    if (error) throw error
    return data
  }
  return local.insert('athlete_sessions', row)
}

export async function updateAthleteSession(id, patch) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('athlete_sessions').update(patch).eq('id', id).select().single()
    if (error) throw error
    return data
  }
  return local.update('athlete_sessions', id, patch)
}

// The injury scenario: shift one session (and, by default, every session
// scheduled on or after it) by deltaDays without touching the template or
// any other athlete. Returns the updated sessions.
export async function shiftAthleteSessions(athleteId, fromDate, deltaDays, { onlyThisOne = false } = {}) {
  const sessions = await listAthleteSessions(athleteId)
  const toShift = onlyThisOne
    ? sessions.filter((s) => s.date === fromDate)
    : sessions.filter((s) => s.date >= fromDate)
  const updated = []
  for (const s of toShift) {
    const d = new Date(`${s.date}T00:00:00`)
    d.setDate(d.getDate() + deltaDays)
    updated.push(await updateAthleteSession(s.id, { date: d.toISOString().slice(0, 10) }))
  }
  return updated
}

export async function listAthleteDrills(athleteSessionId) {
  if (isSupabaseConfigured) {
    const { data } = await supabase
      .from('athlete_drills')
      .select('*')
      .eq('athlete_session_id', athleteSessionId)
      .order('order_index')
    return data ?? []
  }
  return local
    .getAll('athlete_drills')
    .filter((d) => d.athlete_session_id === athleteSessionId)
    .sort((a, b) => a.order_index - b.order_index)
}

async function createAthleteDrill(row) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('athlete_drills').insert(row).select().single()
    if (error) throw error
    return data
  }
  return local.insert('athlete_drills', row)
}

// ---------- exercise library (Exercise Builder) ----------

export async function listExerciseLibrary(coachId) {
  if (isSupabaseConfigured) {
    const { data } = await supabase
      .from('exercise_library')
      .select('*')
      .eq('coach_id', coachId)
      .order('name')
    return data ?? []
  }
  return local
    .getAll('exercise_library')
    .filter((e) => e.coach_id === coachId)
    .sort((a, b) => a.name.localeCompare(b.name))
}

export async function createLibraryExercise(row) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('exercise_library').insert(row).select().single()
    if (error) throw error
    return data
  }
  return local.insert('exercise_library', row)
}

export async function updateLibraryExercise(id, patch) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('exercise_library')
      .update(patch)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  }
  return local.update('exercise_library', id, patch)
}

export async function deleteLibraryExercise(id) {
  if (isSupabaseConfigured) {
    const { error } = await supabase.from('exercise_library').delete().eq('id', id)
    if (error) throw error
    return
  }
  local.remove('exercise_library', id)
}

// One row per time an athlete logs a result: weight+reps for a lifting
// drill, velocity for a throwing one. `row` should already carry
// drill_id/athlete_id/date plus whichever of weight/reps_completed/
// velocity/notes apply. drill_id points at an athlete_drills row (the
// dated, athlete-owned copy) — never at the template.
export async function logExerciseResult(row) {
  const full = { date: today(), ...row }
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('exercise_logs').insert(full).select().single()
    if (error) throw error
    return data
  }
  return local.insert('exercise_logs', full)
}

// Every logged result for one athlete_drills row, oldest first — used to
// trend a specific drill over time.
export async function listExerciseLogsForDrill(drillId) {
  if (isSupabaseConfigured) {
    const { data } = await supabase
      .from('exercise_logs')
      .select('*')
      .eq('drill_id', drillId)
      .order('date', { ascending: true })
    return data ?? []
  }
  return local
    .getAll('exercise_logs')
    .filter((l) => l.drill_id === drillId)
    .sort((a, b) => a.date.localeCompare(b.date))
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

function today() {
  return new Date().toISOString().slice(0, 10)
}
