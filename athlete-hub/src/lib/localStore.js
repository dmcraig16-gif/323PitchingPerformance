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
const SEED_VERSION = '8'
const SEED_FLAG = `${PREFIX}seeded`

export function ensureSeedData() {
  if (localStorage.getItem(SEED_FLAG) === SEED_VERSION) return
  for (const table of [
    'profiles',
    'programs',
    'program_weeks',
    'template_workouts',
    'template_items',
    'program_assignments',
    'assigned_workouts',
    'assigned_items',
    'item_library',
    'item_logs',
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
    throws: 'R',
  })

  const maria = insert('profiles', {
    role: 'athlete',
    name: 'Maria Chen',
    email: 'maria@example.com',
    coach_id: coach.id,
    throws: 'L',
  })

  // Signed up but not yet claimed by a coach — demonstrates the roster's
  // "new athletes waiting for a coach" panel.
  insert('profiles', {
    role: 'athlete',
    name: 'Sam Torres',
    email: 'sam@example.com',
  })

  const trapBarDeadlift = insert('item_library', {
    coach_id: coach.id,
    type: 'lifting',
    name: 'Trap Bar Deadlift',
    cues: 'Focus on floor speed. Reset each rep.',
    target_sets: [{ reps: 3, load: 275 }, { reps: 3, load: 295 }, { reps: 3, load: 315 }],
    rest_seconds: 180,
    tempo: '1-1-X',
  })
  const rfeSplitSquat = insert('item_library', {
    coach_id: coach.id,
    type: 'lifting',
    name: 'Rear Foot Elevated Split Squat',
    cues: 'Control the eccentric, drive through midfoot.',
    target_sets: [{ reps: 8, load: null }, { reps: 8, load: null }, { reps: 8, load: null }],
    rest_seconds: 90,
    tempo: '2-1-1',
  })
  const medBallRotational = insert('item_library', {
    coach_id: coach.id,
    type: 'lifting',
    name: 'Med Ball Rotational Throw',
    cues: 'Full extension, let the hips lead.',
    target_sets: [{ reps: 5, load: null }, { reps: 5, load: null }, { reps: 5, load: null }],
    rest_seconds: 60,
  })
  const fastballCorners = insert('item_library', {
    coach_id: coach.id,
    type: 'throwing',
    name: '4-Seam to Glove Side Corners',
    cues: 'Target both glove-side corners at 90% intent.',
    ball_weight_oz: 5,
    num_throws: 15,
    intent_pct: 90,
  })
  const longToss = insert('item_library', {
    coach_id: coach.id,
    type: 'throwing',
    name: 'Long Toss',
    cues: 'Build out on a crow-hop, work to max distance with good arc.',
    ball_weight_oz: 5,
    num_throws: 12,
    intent_pct: 80,
    distance_target: 180,
  })
  const foamRollTSpine = insert('item_library', {
    coach_id: coach.id,
    type: 'mobility',
    name: 'Foam Roll T-Spine',
    cues: 'Slow rolls, pause on tender spots.',
    sets: 1,
    duration_seconds: 120,
    side: 'both',
  })
  const hipSwitch = insert('item_library', {
    coach_id: coach.id,
    type: 'mobility',
    name: '90/90 Hip Switch',
    cues: 'Chest tall, control the transition — no momentum.',
    sets: 2,
    reps: 8,
    side: 'both',
  })
  const bandPullApart = insert('item_library', {
    coach_id: coach.id,
    type: 'movement_prep',
    name: 'Band Pull-Apart',
    cues: 'Slow and controlled through the full range.',
    sets: 3,
    reps: 20,
    side: 'both',
  })
  const legSwings = insert('item_library', {
    coach_id: coach.id,
    type: 'movement_prep',
    name: 'Leg Swings',
    cues: 'Front-to-back and side-to-side, build range gradually.',
    sets: 2,
    reps: 10,
    side: 'both',
  })

  // ---------- programs (templates) ----------
  //
  // A pure template, no dates — 12 numbered weeks created up front, same
  // as createProgram() in db.js. Days can mix all four workout types
  // freely (a program is no longer itself typed).
  const program = insert('programs', {
    coach_id: coach.id,
    name: 'In-Season Development — Phase 2',
    description: 'Lower body strength, bullpen command, and daily movement prep/mobility.',
  })
  const weeks = Array.from({ length: 12 }, (_, i) => insert('program_weeks', { program_id: program.id, week_number: i + 1 }))
  const [week1, week2, week3] = weeks

  const ITEM_FIELDS = [
    'name', 'cues', 'youtube_url',
    'ball_weight_oz', 'num_throws', 'intent_pct', 'distance_target',
    'target_sets', 'rest_seconds', 'tempo',
    'sets', 'reps', 'duration_seconds', 'side',
  ]

  // Seeds a template workout + its items from library entries, letting a
  // per-week call override fields (e.g. a heavier target_sets next week)
  // without touching the library entry itself — same copy-at-add-time
  // snapshot createTemplateItem()/generateAssignedWorkouts() use for real.
  function seedTemplateWorkout(week, dayNumber, type, title, orderIndex, libraryItems) {
    const workout = insert('template_workouts', { week_id: week.id, day_number: dayNumber, type, title, order_index: orderIndex })
    const items = libraryItems.map(([libraryItem, overrides], i) => {
      const row = { workout_id: workout.id, library_item_id: libraryItem.id, order_index: i }
      for (const f of ITEM_FIELDS) row[f] = overrides?.[f] !== undefined ? overrides[f] : libraryItem[f]
      return insert('template_items', row)
    })
    return { workout, items }
  }

  const week1MovementPrep = seedTemplateWorkout(week1, 1, 'movement_prep', 'Movement Prep', 0, [[bandPullApart], [legSwings]])
  const week1Lift = seedTemplateWorkout(week1, 1, 'lifting', 'Lower Body — Heavy', 1, [[trapBarDeadlift], [rfeSplitSquat], [medBallRotational]])
  const week1Bullpen = seedTemplateWorkout(week1, 2, 'throwing', 'Bullpen — Fastball Command', 0, [[fastballCorners], [longToss]])
  const week1Mobility = seedTemplateWorkout(week1, 3, 'mobility', 'Recovery Mobility', 0, [[foamRollTSpine], [hipSwitch]])

  const week2Lift = seedTemplateWorkout(week2, 1, 'lifting', 'Lower Body — Heavy', 0, [
    [trapBarDeadlift, { target_sets: [{ reps: 3, load: 285 }, { reps: 3, load: 305 }, { reps: 3, load: 325 }] }],
    [rfeSplitSquat],
    [medBallRotational],
  ])

  const week3MovementPrep = seedTemplateWorkout(week3, 1, 'movement_prep', 'Movement Prep', 0, [[bandPullApart], [legSwings]])
  const week3Lift = seedTemplateWorkout(week3, 1, 'lifting', 'Lower Body — Heavy', 1, [
    [trapBarDeadlift, { target_sets: [{ reps: 3, load: 295 }, { reps: 3, load: 315 }, { reps: 3, load: 335 }] }],
    [rfeSplitSquat],
    [medBallRotational],
  ])
  seedTemplateWorkout(week3, 2, 'throwing', 'Bullpen — Fastball Command', 0, [[fastballCorners], [longToss]])

  // ---------- assignments (where dates enter) ----------
  //
  // Start two weeks ago so weeks 1-2 land in the past (with logged
  // history below) and week 3 day 1 lands on "today" — the same date
  // math generateAssignedWorkouts() in db.js runs for a real assignment.
  const today = new Date()
  const startDate = new Date(today)
  startDate.setDate(startDate.getDate() - 14)
  const startDateStr = startDate.toISOString().slice(0, 10)

  function seedWorkoutDate(weekNumber, dayNumber) {
    const d = new Date(`${startDateStr}T00:00:00`)
    d.setDate(d.getDate() + (weekNumber - 1) * 7 + (dayNumber - 1))
    return d.toISOString().slice(0, 10)
  }

  const jakeAssignment = insert('program_assignments', { program_id: program.id, athlete_id: jake.id, start_date: startDateStr })
  const mariaAssignment = insert('program_assignments', { program_id: program.id, athlete_id: maria.id, start_date: startDateStr })

  // ---------- assigned_workouts / assigned_items (the dated schedule) ----------
  //
  // Snapshot each assignment's template into dated, athlete-owned rows —
  // mirrors generateAssignedWorkouts() in db.js.
  function seedAssignedWorkout(assignment, week, templateWorkout, templateItems, status = 'pending') {
    const assignedWorkout = insert('assigned_workouts', {
      assignment_id: assignment.id,
      athlete_id: assignment.athlete_id,
      template_workout_id: templateWorkout.id,
      week_number: week.week_number,
      day_number: templateWorkout.day_number,
      date: seedWorkoutDate(week.week_number, templateWorkout.day_number),
      type: templateWorkout.type,
      title: templateWorkout.title,
      notes: templateWorkout.notes ?? null,
      order_index: templateWorkout.order_index,
      status,
    })
    const assignedItems = templateItems.map((ti) => {
      const row = { assigned_workout_id: assignedWorkout.id, template_item_id: ti.id, library_item_id: ti.library_item_id, order_index: ti.order_index }
      for (const f of ITEM_FIELDS) row[f] = ti[f]
      return insert('assigned_items', row)
    })
    return { assignedWorkout, assignedItems }
  }

  const jakeW1MovementPrep = seedAssignedWorkout(jakeAssignment, week1, week1MovementPrep.workout, week1MovementPrep.items, 'completed')
  const jakeW1Lift = seedAssignedWorkout(jakeAssignment, week1, week1Lift.workout, week1Lift.items, 'completed')
  const jakeW1Bullpen = seedAssignedWorkout(jakeAssignment, week1, week1Bullpen.workout, week1Bullpen.items, 'partial')
  const jakeW1Mobility = seedAssignedWorkout(jakeAssignment, week1, week1Mobility.workout, week1Mobility.items, 'completed')
  const jakeW2Lift = seedAssignedWorkout(jakeAssignment, week2, week2Lift.workout, week2Lift.items, 'completed')
  seedAssignedWorkout(jakeAssignment, week3, week3MovementPrep.workout, week3MovementPrep.items)
  seedAssignedWorkout(jakeAssignment, week3, week3Lift.workout, week3Lift.items)

  seedAssignedWorkout(mariaAssignment, week1, week1MovementPrep.workout, week1MovementPrep.items)
  seedAssignedWorkout(mariaAssignment, week1, week1Lift.workout, week1Lift.items)
  seedAssignedWorkout(mariaAssignment, week3, week3MovementPrep.workout, week3MovementPrep.items)
  seedAssignedWorkout(mariaAssignment, week3, week3Lift.workout, week3Lift.items)

  // ---------- item_logs (one row per logged set) ----------
  //
  // Logged history for jake's completed/partial workouts above, so the
  // calendar's status dots and My Program's trend views have something
  // real to show. Today's (week 3) workouts are deliberately left
  // unlogged — that's what the athlete interacts with live in the demo.
  function seedSetLogs(assignedWorkout, assignedItem, sets) {
    sets.forEach((fields, i) => {
      insert('item_logs', {
        assigned_item_id: assignedItem.id,
        athlete_id: assignedWorkout.athlete_id,
        date: assignedWorkout.date,
        set_index: fields.set_index ?? i,
        ...fields,
      })
    })
  }

  // Movement prep (week 1): both items, all sets completed.
  seedSetLogs(jakeW1MovementPrep.assignedWorkout, jakeW1MovementPrep.assignedItems[0], [{ completed: true }, { completed: true }, { completed: true }])
  seedSetLogs(jakeW1MovementPrep.assignedWorkout, jakeW1MovementPrep.assignedItems[1], [{ completed: true }, { completed: true }])

  // Lifting (weeks 1 & 2): every prescribed set logged at/near target.
  function seedLiftLogs(assignedWorkout, assignedItem) {
    const targets = assignedItem.target_sets ?? []
    seedSetLogs(assignedWorkout, assignedItem, targets.map((t) => ({ actual_reps: t.reps, actual_weight: t.load })))
  }
  jakeW1Lift.assignedItems.forEach((it) => seedLiftLogs(jakeW1Lift.assignedWorkout, it))
  jakeW2Lift.assignedItems.forEach((it) => seedLiftLogs(jakeW2Lift.assignedWorkout, it))

  // Bullpen (week 1): only Fastball Corners logged — Long Toss left open,
  // so this workout demonstrates the "partial" status.
  seedSetLogs(jakeW1Bullpen.assignedWorkout, jakeW1Bullpen.assignedItems[0], [{ set_index: null, throws_completed: 15, velocity: 91.4 }])

  // Mobility (week 1): both items, all sets completed.
  seedSetLogs(jakeW1Mobility.assignedWorkout, jakeW1Mobility.assignedItems[0], [{ completed: true }])
  seedSetLogs(jakeW1Mobility.assignedWorkout, jakeW1Mobility.assignedItems[1], [{ completed: true }, { completed: true }])

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const date = d.toISOString().slice(0, 10)
    const readinessScore = 60 + Math.round(Math.random() * 35)
    // Roughly half the days have WHOOP data logged, to show both states.
    const hasWhoop = i % 2 === 0
    const whoopRecovery = hasWhoop ? Math.max(0, Math.min(100, readinessScore + Math.round(Math.random() * 10 - 5))) : null
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
      whoop_recovery: whoopRecovery,
      whoop_strain: hasWhoop ? Math.round((8 + Math.random() * 8) * 10) / 10 : null,
      whoop_sleep_performance: hasWhoop ? 70 + Math.round(Math.random() * 25) : null,
      whoop_hrv: hasWhoop ? 45 + Math.round(Math.random() * 30) : null,
      whoop_resting_hr: hasWhoop ? 44 + Math.round(Math.random() * 12) : null,
      readiness_score: readinessScore,
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

  // A dedicated bullpen each for Jake and Maria with a consistent
  // high/arm-side miss tendency, so Command Tracker's "most common miss
  // direction" has a real pattern to surface (not just the noise from the
  // random sessions above) — and, since Maria throws left-handed, her
  // raw x misses run the opposite way from Jake's but land in the same
  // "High & Arm-side" label, proving the mirroring is correct.
  function seedBiasedSession(athlete, armSideDxSign, daysAgo) {
    const d = new Date(today)
    d.setDate(d.getDate() - daysAgo)
    const session = insert('command_sessions', {
      athlete_id: athlete.id,
      logged_by: athlete.id,
      date: d.toISOString().slice(0, 10),
      label: 'Bullpen — Fastball Command',
    })
    const misses = [
      { dx: 0.35, dy: 0.3 },
      { dx: 0.4, dy: 0.15 },
      { dx: 0.3, dy: 0.35 },
      { dx: 0.25, dy: 0.2 },
      { dx: 0.15, dy: -0.05 },
      { dx: 0.38, dy: 0.28 },
    ]
    misses.forEach(({ dx, dy }, i) => {
      const intended = { x: 0, y: 2.5 }
      const actual = { x: intended.x + dx * armSideDxSign, y: intended.y + dy }
      const missDistanceIn = Math.hypot(actual.x - intended.x, actual.y - intended.y) * 12
      insert('command_pitches', {
        athlete_id: athlete.id,
        session_id: session.id,
        session_date: session.date,
        pitch_type: pitchTypes[i % pitchTypes.length],
        velocity: 88 + Math.random() * 4,
        intended_x: intended.x,
        intended_y: intended.y,
        actual_x: actual.x,
        actual_y: actual.y,
        miss_distance_in: missDistanceIn,
      })
    })
  }
  seedBiasedSession(jake, 1, 12)
  seedBiasedSession(maria, -1, 12)

  localStorage.setItem(`${PREFIX}currentProfileId`, coach.id)
}

export function getCurrentDemoProfileId() {
  return localStorage.getItem(`${PREFIX}currentProfileId`)
}

export function setCurrentDemoProfileId(id) {
  localStorage.setItem(`${PREFIX}currentProfileId`, id)
}
