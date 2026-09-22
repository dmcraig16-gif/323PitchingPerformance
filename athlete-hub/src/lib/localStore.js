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

// Bump this when the seed shape changes (new tables/fields) so a browser
// that already seeded an older demo dataset regenerates instead of running
// against stale data the new UI doesn't know how to read.
const SEED_VERSION = '4'
const SEED_FLAG = `${PREFIX}seeded`

export function ensureSeedData() {
  if (localStorage.getItem(SEED_FLAG) === SEED_VERSION) return
  for (const table of [
    'profiles',
    'programs',
    'program_assignments',
    'workouts',
    'exercise_library',
    'exercises',
    'exercise_logs',
    'daily_checkins',
    'command_sessions',
    'command_pitches',
    'journal_entries',
  ]) {
    localStorage.removeItem(key(table))
  }
  localStorage.setItem(SEED_FLAG, SEED_VERSION)

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

  // Signed up but not yet claimed by a coach — demonstrates the roster's
  // "new athletes waiting for a coach" panel.
  insert('profiles', {
    role: 'athlete',
    name: 'Sam Torres',
    email: 'sam@example.com',
  })

  const trapBarDeadlift = insert('exercise_library', {
    coach_id: coach.id,
    name: 'Trap Bar Deadlift',
    type: 'strength',
    description: 'Focus on floor speed. Reset each rep.',
  })
  const rfeSplitSquat = insert('exercise_library', {
    coach_id: coach.id,
    name: 'Rear Foot Elevated Split Squat',
    type: 'strength',
    description: 'Control the eccentric, drive through midfoot.',
  })
  const medBallRotational = insert('exercise_library', {
    coach_id: coach.id,
    name: 'Med Ball Rotational Throw',
    type: 'power',
    description: 'Full extension, let the hips lead.',
  })
  const bandPullApart = insert('exercise_library', {
    coach_id: coach.id,
    name: 'Band Pull-Apart',
    type: 'arm-care',
    description: '3x20, slow and controlled through the full range.',
  })
  const fastballCorners = insert('exercise_library', {
    coach_id: coach.id,
    name: '4-Seam to Glove Side Corners',
    type: 'throwing',
    description: '15 pitches, target both glove-side corners at 90% intent.',
  })
  insert('exercise_library', {
    coach_id: coach.id,
    name: 'Foam Roll T-Spine',
    type: 'mobility',
    description: '2 minutes each side before lifting.',
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
  const deadliftEx = insert('exercises', {
    workout_id: liftDay1.id,
    library_exercise_id: trapBarDeadlift.id,
    name: trapBarDeadlift.name,
    type: trapBarDeadlift.type,
    description: trapBarDeadlift.description,
    sets: 4,
    reps: 3,
    target_value: 315,
    target_unit: 'lb',
    order_index: 0,
  })
  insert('exercises', {
    workout_id: liftDay1.id,
    library_exercise_id: rfeSplitSquat.id,
    name: rfeSplitSquat.name,
    type: rfeSplitSquat.type,
    description: rfeSplitSquat.description,
    sets: 3,
    reps: 8,
    order_index: 1,
  })
  insert('exercises', {
    workout_id: liftDay1.id,
    library_exercise_id: medBallRotational.id,
    name: medBallRotational.name,
    type: medBallRotational.type,
    description: medBallRotational.description,
    sets: 3,
    reps: 5,
    order_index: 2,
  })
  insert('exercises', {
    workout_id: liftDay1.id,
    library_exercise_id: bandPullApart.id,
    name: bandPullApart.name,
    type: bandPullApart.type,
    description: bandPullApart.description,
    sets: 3,
    reps: 20,
    order_index: 3,
  })

  const throwDay1 = insert('workouts', {
    program_id: throwingProgram.id,
    name: 'Bullpen — Fastball Command',
    day_label: 'Tuesday',
    order_index: 0,
  })
  const fastballEx = insert('exercises', {
    workout_id: throwDay1.id,
    library_exercise_id: fastballCorners.id,
    name: fastballCorners.name,
    type: fastballCorners.type,
    description: fastballCorners.description,
    sets: 3,
    reps: 5,
    target_value: 92,
    target_unit: 'mph',
    order_index: 0,
  })

  // A few weeks of logged results so My Program's weight/velocity trends
  // have something to show right away.
  const today = new Date()
  const deadliftProgression = [275, 285, 285, 295, 305]
  deadliftProgression.forEach((weight, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - (deadliftProgression.length - i) * 4)
    insert('exercise_logs', {
      exercise_id: deadliftEx.id,
      athlete_id: jake.id,
      date: d.toISOString().slice(0, 10),
      weight,
      reps_completed: 3,
    })
  })
  const velocityProgression = [88.4, 89.1, 89.8, 90.2]
  velocityProgression.forEach((velocity, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - (velocityProgression.length - i) * 3)
    insert('exercise_logs', {
      exercise_id: fastballEx.id,
      athlete_id: jake.id,
      date: d.toISOString().slice(0, 10),
      velocity,
    })
  })

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const date = d.toISOString().slice(0, 10)
    insert('daily_checkins', {
      athlete_id: jake.id,
      date,
      weight_lb: Math.round((189 + Math.random() * 2 - i * 0.1) * 10) / 10,
      sleep_hours: Math.round((6.5 + Math.random() * 2) * 4) / 4,
      sleep_quality: 3 + Math.round(Math.random() * 2),
      strain: 2 + Math.round(Math.random() * 3),
      arm_soreness: 2 + Math.round(Math.random() * 3),
      lower_soreness: 2 + Math.round(Math.random() * 3),
      mood: 3 + Math.round(Math.random() * 2),
      energy: 3 + Math.round(Math.random() * 2),
      nutrition: 3 + Math.round(Math.random() * 2),
      hydration: 3 + Math.round(Math.random() * 2),
      readiness_score: 60 + Math.round(Math.random() * 35),
    })
  }

  const pitchTypes = ['Fastball', 'Slider', 'Changeup', 'Curveball']
  const sessionLabels = [
    'Bullpen — Fastball Command',
    'Bullpen — Offspeed Mix',
    'Flat Ground',
    'Pre-Game Pen',
  ]
  for (let s = 0; s < 4; s++) {
    const d = new Date(today)
    d.setDate(d.getDate() - s * 3)
    const session = insert('command_sessions', {
      athlete_id: jake.id,
      logged_by: jake.id,
      date: d.toISOString().slice(0, 10),
      label: sessionLabels[s],
    })
    for (let i = 0; i < 6; i++) {
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
        session_id: session.id,
        session_date: session.date,
        pitch_type: pitchType,
        velocity: pitchType === 'Fastball' ? 90 + Math.random() * 4 : 78 + Math.random() * 8,
        intended_x: intended.x,
        intended_y: intended.y,
        actual_x: actual.x,
        actual_y: actual.y,
        miss_distance_in: missMag,
      })
    }
  }

  localStorage.setItem(`${PREFIX}currentProfileId`, coach.id)
}

export function getCurrentDemoProfileId() {
  return localStorage.getItem(`${PREFIX}currentProfileId`)
}

export function setCurrentDemoProfileId(id) {
  localStorage.setItem(`${PREFIX}currentProfileId`, id)
}
