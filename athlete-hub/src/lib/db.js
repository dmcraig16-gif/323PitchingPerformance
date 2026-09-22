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

// ---------- programs / workouts / exercises ----------

export async function listProgramsForCoach(coachId) {
  if (isSupabaseConfigured) {
    const { data } = await supabase.from('programs').select('*').eq('coach_id', coachId)
    return data ?? []
  }
  return local.getAll('programs').filter((p) => p.coach_id === coachId)
}

export async function createProgram(row) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('programs').insert(row).select().single()
    if (error) throw error
    return data
  }
  return local.insert('programs', row)
}

export async function listAssignedPrograms(athleteId) {
  const assignments = isSupabaseConfigured
    ? (
        await supabase.from('program_assignments').select('*').eq('athlete_id', athleteId)
      ).data ?? []
    : local.getAll('program_assignments').filter((a) => a.athlete_id === athleteId)

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

export async function assignProgram(programId, athleteId) {
  const row = { program_id: programId, athlete_id: athleteId, start_date: today() }
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('program_assignments').insert(row).select().single()
    if (error) throw error
    return data
  }
  return local.insert('program_assignments', row)
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

export async function listWorkouts(programId) {
  if (isSupabaseConfigured) {
    const { data } = await supabase
      .from('workouts')
      .select('*')
      .eq('program_id', programId)
      .order('order_index')
    return data ?? []
  }
  return local
    .getAll('workouts')
    .filter((w) => w.program_id === programId)
    .sort((a, b) => a.order_index - b.order_index)
}

export async function createWorkout(row) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('workouts').insert(row).select().single()
    if (error) throw error
    return data
  }
  return local.insert('workouts', row)
}

export async function listExercises(workoutId) {
  if (isSupabaseConfigured) {
    const { data } = await supabase
      .from('exercises')
      .select('*')
      .eq('workout_id', workoutId)
      .order('order_index')
    return data ?? []
  }
  return local
    .getAll('exercises')
    .filter((e) => e.workout_id === workoutId)
    .sort((a, b) => a.order_index - b.order_index)
}

export async function createExercise(row) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('exercises').insert(row).select().single()
    if (error) throw error
    return data
  }
  return local.insert('exercises', row)
}

export async function listExerciseLogsForDate(athleteId, date) {
  if (isSupabaseConfigured) {
    const { data } = await supabase
      .from('exercise_logs')
      .select('*')
      .eq('athlete_id', athleteId)
      .eq('date', date)
    return data ?? []
  }
  return local
    .getAll('exercise_logs')
    .filter((l) => l.athlete_id === athleteId && l.date === date)
}

export async function logExerciseComplete(exerciseId, athleteId) {
  const row = { exercise_id: exerciseId, athlete_id: athleteId, date: today() }
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('exercise_logs').insert(row).select().single()
    if (error) throw error
    return data
  }
  return local.insert('exercise_logs', row)
}

function today() {
  return new Date().toISOString().slice(0, 10)
}
