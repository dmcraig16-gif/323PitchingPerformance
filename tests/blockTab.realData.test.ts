import { describe, expect, it } from 'vitest'
import { parseBlockTab, blockTabCoversWeek, dayForDayNumber } from '../lib/parse/blockTab'
import { parsePlan } from '../lib/parse/plan'

// The actual content of 'Block 1 On-ramp'!A1:M90 from Andrew Craig's real
// workbook ("Andrew Craig | 2026-27 Offseason Lifting",
// 17WQclMIQrHAnB-OIgP-lJ3cMKOt0ucY4VJ_9t6gU0yA), fetched 2026-11-01 — not
// a guess at the format, the production data itself. Confirms two things
// the synthetic fixture couldn't: a "Demo" column the spec's table didn't
// mention sitting between Cue and the week columns, and that Google
// Sheets drops trailing empty cells (several rows below are shorter than
// the header row).
const REAL_BLOCK_1_GRID: unknown[][] = [
  ['323 PITCHING PERFORMANCE'],
  ['BLOCK 1  |  ON-RAMP: HIP TRUST'],
  ['Weeks 1-4. Own the positions before we load them. RPE 6 to 7. Slow tempo. Position over load.'],
  [],
  ['DAY 1  |  MONDAY  |  LOWER A: ACCEPT AND BUILD'],
  ['Slot', 'Exercise', 'Coaching cue / tempo', 'Demo', 'Wk 1 Plan\nNov 2', 'Wk 1 Log', 'Wk 2 Plan\nNov 9', 'Wk 2 Log', 'Wk 3 Plan\nNov 16', 'Wk 3 Log', 'Wk 4 Plan\nNov 23 DELOAD', 'Wk 4 Log', 'Notes / hip feel'],
  ['Prep', '90/90 Transitions', 'Tall spine, rotate from the hips.', '', '2x6 ea', '', '2x6 ea', '', '2x6 ea', '', '2x6 ea'],
  ['Prep', 'Hip CARs', "Slow, biggest circle you own. Don't let the pelvis move.", '', '3 ea way', '', '3 ea way', '', '3 ea way', '', '3 ea way'],
  ['Prep', 'Frog Rockers', 'Rock back to a comfortable depth.', '', 'x10', '', 'x10', '', 'x10', '', 'x10'],
  ['Prep', 'Elevated Pigeon', 'Front shin on bench. Breathe into the hip.', '', '60s ea', '', '60s ea', '', '60s ea', '', '60s ea'],
  ['Prep', 'Couch Stretch', 'Squeeze the glute on the back leg.', '', '60s ea', '', '60s ea', '', '60s ea', '', '60s ea'],
  ['A1', 'Lead-Leg Split Stance Yielding ISO', 'Left foot forward at stride depth. Front knee over mid-foot, hips square, back knee 2 in off the floor. Breathe. Then right.', '', '3x30s ea BW', '', '3x40s ea BW', '', '3x45s ea light goblet', '', '2x30s ea BW'],
  ['A2', 'Short-Lever Copenhagen Plank', 'Top knee on bench, bottom leg free. Ribs down, straight line.', '', '3x15s ea', '', '3x20s ea', '', '3x25s ea', '', '2x15s ea'],
  ['B1', 'Goblet Box Squat', '3 sec down, touch the box, stand tall. Box at parallel.', '', '3x8 @6', '', '3x8 @6-7', '', '3x8 @7', '', '2x8 @6'],
  ['B2', 'Half-Kneeling Cable Pallof Press', 'Inside knee down. Press out, hold 2 sec. Zero rotation.', '', '3x8 ea', '', '3x10 ea', '', '3x10 ea +load', '', '2x8 ea'],
  ['C1', 'DB Rear-Foot-Elevated Split Squat', 'Tempo 3-1-1. Slight forward torso, front heel heavy.', '', '3x8 ea @6', '', '3x8 ea @6-7', '', '3x10 ea @7', '', '2x8 ea @6'],
  ['C2', 'Seated Leg Curl (machine)', '3 sec lower, pause at the top.', '', '3x10', '', '3x12', '', '3x12 +load', '', '2x10'],
  ['D1', 'Straight-Knee SL Calf Raise', '2 up, 2 hold, 3 down. Full range off a step.', '', '2x12 ea', '', '3x12 ea', '', '3x15 ea', '', '2x12 ea'],
  ['D2', 'Dead Bug with Band Pullover', 'Low back pinned. Full exhale every rep.', '', '3x6 ea', '', '3x8 ea', '', '3x8 ea', '', '2x6 ea'],
  [],
  ['DAY 2  |  TUESDAY  |  UPPER A: PUSH AND PULL THROUGH ANGLES'],
  ['Slot', 'Exercise', 'Coaching cue / tempo', 'Demo', 'Wk 1 Plan\nNov 2', 'Wk 1 Log', 'Wk 2 Plan\nNov 9', 'Wk 2 Log', 'Wk 3 Plan\nNov 16', 'Wk 3 Log', 'Wk 4 Plan\nNov 23 DELOAD', 'Wk 4 Log', 'Notes / hip feel'],
  ['Prep', 'Standing Alternating Back Bridge', 'Reach long, open the front of the body.', '', '2x5', '', '2x5', '', '2x5', '', '2x5'],
  ['Prep', 'Wide Stance Spinal Rolls', 'Segment by segment, down and up.', '', '2x8', '', '2x8', '', '2x8', '', '2x8'],
  ['Prep', 'Bretzel', 'Breathe into the stretch.', '', '60s ea', '', '60s ea', '', '60s ea', '', '60s ea'],
  ['Prep', 'Hip Airplanes', 'Hold a wall if needed.', '', '2x5 ea', '', '2x5 ea', '', '2x5 ea', '', '2x5 ea'],
  ['Prep', 'KB Windmill', 'Light load. Eyes on the bell.', '', '2x5 ea', '', '2x5 ea', '', '2x5 ea', '', '2x5 ea'],
  ['A1', 'Deficit Push-Up Bottom ISO', 'DB handles. Chest 1 in off the floor, body rigid. Push the floor away without moving.', '', '3x20s', '', '3x25s', '', '3x30s', '', '2x20s'],
  ['A2', '90/90 ER Overcoming ISO', 'Throwing position, elbow at shoulder height. Push the back of the hand into a wall or band. Both arms.', '', '3x20s ea @50%', '', '3x25s ea @50%', '', '3x30s ea @60%', '', '2x20s ea @50%'],
  ['B1', 'Half-Kneeling Landmine Press', 'Opposite knee down. Ribs stacked. Reach through at the top.', '', '3x8 ea @6', '', '3x8 ea @6-7', '', '3x10 ea @7', '', '2x8 ea @6'],
  ['B2', 'Chest-Supported DB Row', 'Elbow to back pocket. 2 sec squeeze.', '', '3x10 @6', '', '3x10 @7', '', '3x12 @7', '', '2x10 @6'],
  ['C1', '30° Incline DB Press', '3 sec lower into a deep stretch. No bounce.', '', '3x10 @6', '', '3x10 @7', '', '3x8 @8 BASELINE', '', '2x10 @6'],
  ['C2', 'Half-Kneeling SA Cable Row, High to Low', 'Reach long, then row to the hip. Let the shoulder blade move.', '', '3x10 ea', '', '3x12 ea', '', '3x12 ea +load', '', '2x10 ea'],
  ['D1', 'Cable Face Pull', 'Rope to eyes, thumbs back, hold 1 sec.', '', '2x15', '', '3x15', '', '3x15', '', '2x12'],
  ['D2', 'KB Suitcase Carry', 'Tall. No lean. Walk slow.', '', '3x30yd ea', '', '3x30yd ea', '', '3x40yd ea', '', '2x30yd ea'],
  [],
  ['DAY 3  |  THURSDAY  |  LOWER B: HINGE, ROTATE, OWN THE FRONT HIP'],
  ['Slot', 'Exercise', 'Coaching cue / tempo', 'Demo', 'Wk 1 Plan\nNov 2', 'Wk 1 Log', 'Wk 2 Plan\nNov 9', 'Wk 2 Log', 'Wk 3 Plan\nNov 16', 'Wk 3 Log', 'Wk 4 Plan\nNov 23 DELOAD', 'Wk 4 Log', 'Notes / hip feel'],
  ['Prep', '90/90 Transitions', 'Tall spine, rotate from the hips.', '', '2x6 ea', '', '2x6 ea', '', '2x6 ea', '', 'Travel'],
  ['Prep', 'Hip CARs', "Slow, biggest circle you own. Don't let the pelvis move.", '', '3 ea way', '', '3 ea way', '', '3 ea way', '', 'Travel'],
  ['Prep', 'Frog Rockers', 'Rock back to a comfortable depth.', '', 'x10', '', 'x10', '', 'x10', '', 'Travel'],
  ['Prep', 'Elevated Pigeon', 'Front shin on bench. Breathe into the hip.', '', '60s ea', '', '60s ea', '', '60s ea', '', 'Travel'],
  ['Prep', 'Couch Stretch', 'Squeeze the glute on the back leg.', '', '60s ea', '', '60s ea', '', '60s ea', '', 'Travel'],
  ['A1', 'Lateral Bound to Stick', 'Push off the right, land and stick on the left in your block position. Hold 2 sec. Then the other way.', '', '2x3 ea', '', '3x3 ea', '', '3x3 ea farther', '', 'Travel'],
  ['A2', 'Lead-Leg Hip Airplane ISO', 'Stand on the left leg, hinge, rotate the pelvis open and closed. Hold 5 sec at each end. Dowel or wall for balance.', '', '2x4 ea', '', '3x4 ea', '', '3x5 ea', '', 'Travel'],
  ['B1', 'High-Handle Trap Bar Deadlift', 'Push the floor away. Hips and chest rise together. 2 sec lower.', '', '3x6 @6', '', '3x6 @6-7', '', '3x5 @8 BASELINE', '', 'Travel'],
  ['B2', 'Half-Kneeling Cable Chop, High to Low', 'Rotate through the ribs. Hips stay quiet.', '', '3x8 ea', '', '3x8 ea', '', '3x10 ea', '', 'Travel'],
  ['C1', 'Goblet Cossack Squat', '3 sec down, 2 sec pause in the bottom. Bent-leg heel stays down.', '', '3x6 ea', '', '3x6 ea light KB', '', '3x8 ea', '', 'Travel'],
  ['C2', 'Landmine Lead-Leg Hip Rotation', "Split stance, left foot forward, bar end at the chest. Rotate the pelvis over the front femur like you're finishing a pitch. Front knee stays over mid-foot. Both stances.", '', '3x6 ea', '', '3x8 ea', '', '3x8 ea +load', '', 'Travel'],
  ['D1', 'Kickstand KB RDL', '3 sec lower. Hips square. Long spine.', '', '3x8 ea', '', '3x10 ea', '', '3x10 ea +load', '', 'Travel'],
  ['D2', 'Seated Banded Hip Flexor Raise', 'Sit tall. Knee above hip, 5 sec hold at the top, slow lower.', '', '3x6 ea', '', '3x8 ea', '', '3x8 ea heavier band', '', 'Travel'],
  [],
  ['DAY 4  |  FRIDAY  |  UPPER B: VERTICAL, OVERHEAD, ROTATION'],
  ['Slot', 'Exercise', 'Coaching cue / tempo', 'Demo', 'Wk 1 Plan\nNov 2', 'Wk 1 Log', 'Wk 2 Plan\nNov 9', 'Wk 2 Log', 'Wk 3 Plan\nNov 16', 'Wk 3 Log', 'Wk 4 Plan\nNov 23 DELOAD', 'Wk 4 Log', 'Notes / hip feel'],
  ['Prep', 'Standing Alternating Back Bridge', 'Reach long, open the front of the body.', '', '2x5', '', '2x5', '', '2x5', '', 'Travel'],
  ['Prep', 'Wide Stance Spinal Rolls', 'Segment by segment, down and up.', '', '2x8', '', '2x8', '', '2x8', '', 'Travel'],
  ['Prep', 'Bretzel', 'Breathe into the stretch.', '', '60s ea', '', '60s ea', '', '60s ea', '', 'Travel'],
  ['Prep', 'Hip Airplanes', 'Hold a wall if needed.', '', '2x5 ea', '', '2x5 ea', '', '2x5 ea', '', 'Travel'],
  ['Prep', 'KB Windmill', 'Light load. Eyes on the bell.', '', '2x5 ea', '', '2x5 ea', '', '2x5 ea', '', 'Travel'],
  ['A1', 'Dead Hang', 'Relax into the stretch. Pull the shoulders down slightly for the last 10 sec.', '', '3x30s', '', '3x35s', '', '3x40s', '', 'Travel'],
  ['A2', 'Incline Prone Y ISO', 'Chest on a 30° bench, light plates, thumbs up. Hold.', '', '3x20s', '', '3x25s', '', '3x30s', '', 'Travel'],
  ['B1', 'Neutral-Grip Lat Pulldown', 'Elbows to ribs. 3 sec up.', '', '3x10 @6', '', '3x10 @7', '', '3x12 @7', '', 'Travel'],
  ['B2', 'Half-Kneeling Bottoms-Up KB Press', 'Grip hard, wrist stacked. Press without leaning.', '', '3x6 ea', '', '3x6 ea', '', '3x8 ea', '', 'Travel'],
  ['C1', 'DB Pullover', '3 sec lower into a deep stretch. Ribs down.', '', '3x10', '', '3x10', '', '3x12', '', 'Travel'],
  ['C2', 'SA Cable Fly, Low to High', 'Step out. Sweep up across the body. Squeeze.', '', '3x12 ea', '', '3x12 ea', '', '3x15 ea', '', 'Travel'],
  ['D1', 'Half-Kneeling Cable Lift, Low to High', 'Rotate and lift through the trunk. Finish tall.', '', '3x8 ea', '', '3x8 ea', '', '3x10 ea', '', 'Travel'],
  ['D2', 'DB Hammer Curl', 'Controlled. No swing.', '', '2x12', '', '3x12', '', '3x12', '', 'Travel'],
  ['D3', 'Rope Triceps Pushdown', 'Elbows pinned. Spread the rope.', '', '2x12', '', '3x12', '', '3x15', '', 'Travel'],
  [],
  ['Week 4 is Thanksgiving. Lift Mon and Tue only at the listed doses. Thu and Fri: Travel Session tab is optional.'],
]

describe('parseBlockTab against real production data (Block 1 On-ramp)', () => {
  const parsed = parseBlockTab(REAL_BLOCK_1_GRID)

  it('finds all four real days', () => {
    expect(parsed.days.map((d) => `${d.dayNumber} ${d.weekday}`)).toEqual([
      '1 MONDAY',
      '2 TUESDAY',
      '3 THURSDAY',
      '4 FRIDAY',
    ])
  })

  it('matches the M1 acceptance criterion exactly: Day 1 has 13 rows (5 Prep + 8 work)', () => {
    const day1 = dayForDayNumber(parsed, 1)!
    expect(day1.exercises).toHaveLength(13)
    expect(day1.exercises.filter((e) => e.slot === 'Prep')).toHaveLength(5)
    expect(day1.exercises.filter((e) => e.slot !== 'Prep')).toHaveLength(8)
  })

  it('handles a real "Demo" column between Cue and the week columns without it leaking into Plan/Log', () => {
    const day1 = dayForDayNumber(parsed, 1)!
    const squat = day1.exercises.find((e) => e.name === 'Goblet Box Squat')!
    expect(squat.plansByWeek[1]).toBe('3x8 @6') // not '' (the Demo column's value)
  })

  it('handles Google Sheets dropping trailing empty cells (Wk4 Log + Notes missing from short rows)', () => {
    const day1 = dayForDayNumber(parsed, 1)!
    const lastRow = day1.exercises[day1.exercises.length - 1]
    expect(lastRow.logsByWeek[4]).toBe('') // present in header, absent in the row array
    expect(lastRow.notes).toBe('')
  })

  it('parses every real Week 1 Plan cell for Day 1 correctly', () => {
    const day1 = dayForDayNumber(parsed, 1)!
    const byName = Object.fromEntries(day1.exercises.map((e) => [e.name, parsePlan(e.plansByWeek[1])]))

    expect(byName['90/90 Transitions']).toMatchObject({ sets: 2, reps: 6, perSide: true })
    expect(byName['Hip CARs']).toMatchObject({ sets: null, reps: 3, perSide: true }) // "3 ea way"
    expect(byName['Frog Rockers']).toMatchObject({ sets: null, reps: 10 }) // "x10"
    expect(byName['Elevated Pigeon']).toMatchObject({ sets: null, seconds: 60, perSide: true }) // "60s ea"
    expect(byName['Lead-Leg Split Stance Yielding ISO']).toMatchObject({
      sets: 3,
      seconds: 30,
      perSide: true,
      bodyweight: true,
    })
    expect(byName['Goblet Box Squat']).toMatchObject({ sets: 3, reps: 8, rpe: '6' })
    expect(byName['Half-Kneeling Cable Pallof Press']).toMatchObject({ sets: 3, reps: 8, perSide: true })
  })

  it("flags the real BASELINE sets named in SPEC.md's own Testing mapping example", () => {
    const day2 = dayForDayNumber(parsed, 2)!
    const inclinePress = day2.exercises.find((e) => e.name === '30° Incline DB Press')!
    expect(parsePlan(inclinePress.plansByWeek[3])).toMatchObject({ baseline: true, sets: 3, reps: 8, rpe: '8' })

    const day3 = dayForDayNumber(parsed, 3)!
    const deadlift = day3.exercises.find((e) => e.name === 'High-Handle Trap Bar Deadlift')!
    expect(parsePlan(deadlift.plansByWeek[3])).toMatchObject({ baseline: true, sets: 3, reps: 5, rpe: '8' })
  })

  it('flags real per-exercise Travel cells in Week 4 (Thanksgiving break) for Thu/Fri only', () => {
    const day3 = dayForDayNumber(parsed, 3)!
    expect(parsePlan(day3.exercises[0].plansByWeek[4])).toMatchObject({ travel: true })

    const day1 = dayForDayNumber(parsed, 1)!
    expect(parsePlan(day1.exercises[0].plansByWeek[4]).travel).toBe(false) // Monday still lifts Thanksgiving week
  })

  it('finds a real D3 row (Day 4 has 14 exercises, one more than the other days)', () => {
    const day4 = dayForDayNumber(parsed, 4)!
    expect(day4.exercises).toHaveLength(14)
    expect(day4.exercises.at(-1)).toMatchObject({ slot: 'D3', name: 'Rope Triceps Pushdown' })
  })

  it('covers weeks 1-4 and nothing else', () => {
    expect(blockTabCoversWeek(parsed, 1)).toBe(true)
    expect(blockTabCoversWeek(parsed, 4)).toBe(true)
    expect(blockTabCoversWeek(parsed, 5)).toBe(false)
  })
})
