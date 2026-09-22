// localStorage-backed persistence used when Supabase isn't configured, so
// the app is fully clickable in "preview mode" (npm run dev, no backend).
// Table shape mirrors supabase/schema.sql so swapping in real Supabase
// later is a matter of pointing db.js at the real client.

const PREFIX = 'athlete-hub:'

function key(table) {
  return `${PREFIX}${table}`
}

function uuid() {
  return crypto.randomUUID()
}

export function getAll(table) {
  const raw = localStorage.getItem(key(table))
  return raw ? JSON.parse(raw) : []
}

function setAll(table, rows) {
  localStorage.setItem(key(table), JSON.stringify(rows))
}

export function insert(table, row) {
  const rows = getAll(table)
  const withId = { id: uuid(), created_at: new Date().toISOString(), ...row }
  rows.push(withId)
  setAll(table, rows)
  return withId
}

export function update(table, id, patch) {
  const rows = getAll(table)
  const idx = rows.findIndex((r) => r.id === id)
  if (idx === -1) return null
  rows[idx] = { ...rows[idx], ...patch }
  setAll(table, rows)
  return rows[idx]
}

// Insert, or update in place if a row already matches `matchFn` (used for
// tables with a natural unique key, e.g. one check-in per athlete per day).
export function upsert(table, row, matchFn) {
  const rows = getAll(table)
  const idx = rows.findIndex(matchFn)
  if (idx === -1) return insert(table, row)
  rows[idx] = { ...rows[idx], ...row }
  setAll(table, rows)
  return rows[idx]
}

export function remove(table, id) {
  setAll(
    table,
    getAll(table).filter((r) => r.id !== id),
  )
}

const SEED_FLAG = `${PREFIX}seeded`

export function ensureSeedData() {
  if (localStorage.getItem(SEED_FLAG)) return
  localStorage.setItem(SEED_FLAG, 'true')

  const coach = insert('profiles', {
    role: 'coach',
    name: 'Coach Dana Reyes',
    email: 'dana@323pitching.com',
  })

  const jake = insert('profiles', {
    role: 'athlete',
    name: 'Jake Martinez',
    email: 'jake@example.com',
    coach_id: coach.id,
  })

  const maria = insert('profiles', {
    role: 'athlete',
    name: 'Maria Chen',
    email: 'maria@example.com',
    coach_id: coach.id,
  })

  const liftingProgram = insert('programs', {
    coach_id: coach.id,
    name: 'In-Season Strength — Phase 2',
    description: 'Two lower body days, one upper day, rotational power work.',
    type: 'lifting',
  })

  const throwingProgram = insert('programs', {
    coach_id: coach.id,
    name: 'Bullpen Build-Up — Week 3',
    description: 'Progressive intent bullpens with command focus.',
    type: 'throwing',
  })

  insert('program_assignments', { program_id: liftingProgram.id, athlete_id: jake.id })
  insert('program_assignments', { program_id: throwingProgram.id, athlete_id: jake.id })
  insert('program_assignments', { program_id: liftingProgram.id, athlete_id: maria.id })

  const liftDay1 = insert('workouts', {
    program_id: liftingProgram.id,
    name: 'Lower Body — Heavy',
    day_label: 'Monday',
    order_index: 0,
  })
  insert('exercises', {
    workout_id: liftDay1.id,
    name: 'Trap Bar Deadlift',
    description: 'Focus on floor speed. Reset each rep.',
    sets: 4,
    reps: 3,
    order_index: 0,
  })
  insert('exercises', {
    workout_id: liftDay1.id,
    name: 'Rear Foot Elevated Split Squat',
    description: 'Control the eccentric, drive through midfoot.',
    sets: 3,
    reps: 8,
    order_index: 1,
  })

  const throwDay1 = insert('workouts', {
    program_id: throwingProgram.id,
    name: 'Bullpen — Fastball Command',
    day_label: 'Tuesday',
    order_index: 0,
  })
  insert('exercises', {
    workout_id: throwDay1.id,
    name: '4-Seam to Glove Side Corners',
    description: '15 pitches, target both glove-side corners at 90% intent.',
    sets: 3,
    reps: 5,
    order_index: 0,
  })

  const today = new Date()
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const date = d.toISOString().slice(0, 10)
    insert('daily_checkins', {
      athlete_id: jake.id,
      date,
      sleep_hours: Math.round((6.5 + Math.random() * 2) * 4) / 4,
      sleep_quality: 3 + Math.round(Math.random() * 2),
      soreness: 2 + Math.round(Math.random() * 3),
      mood: 3 + Math.round(Math.random() * 2),
      energy: 3 + Math.round(Math.random() * 2),
      nutrition: 3 + Math.round(Math.random() * 2),
      prev_day_workload: 2 + Math.round(Math.random() * 3),
      readiness_score: 60 + Math.round(Math.random() * 35),
    })
  }

  const pitchTypes = ['Fastball', 'Slider', 'Changeup', 'Curveball']
  for (let i = 0; i < 24; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - Math.floor(i / 6))
    const pitchType = pitchTypes[i % pitchTypes.length]
    const intended = { x: (Math.random() - 0.5) * 1.2, y: 2 + Math.random() * 1.2 }
    const missMag = Math.random() * 12
    const angle = Math.random() * Math.PI * 2
    const actual = {
      x: intended.x + (Math.cos(angle) * missMag) / 12,
      y: intended.y + (Math.sin(angle) * missMag) / 12,
    }
    insert('command_pitches', {
      athlete_id: jake.id,
      session_date: d.toISOString().slice(0, 10),
      pitch_type: pitchType,
      velocity: pitchType === 'Fastball' ? 90 + Math.random() * 4 : 78 + Math.random() * 8,
      intended_x: intended.x,
      intended_y: intended.y,
      actual_x: actual.x,
      actual_y: actual.y,
      miss_distance_in: missMag,
    })
  }

  localStorage.setItem(`${PREFIX}currentProfileId`, coach.id)
}

export function getCurrentDemoProfileId() {
  return localStorage.getItem(`${PREFIX}currentProfileId`)
}

export function setCurrentDemoProfileId(id) {
  localStorage.setItem(`${PREFIX}currentProfileId`, id)
}
