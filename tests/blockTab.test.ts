import { describe, expect, it } from 'vitest'
import { parseBlockTab, blockTabCoversWeek, dayForDayNumber } from '../lib/parse/blockTab'

// A synthetic Block 1 fixture, shaped like SPEC.md §5.2's description of
// the real tab but placed at arbitrary row offsets (not rows 5/21/37/53)
// on purpose — the parser has to discover day bars and headers by
// scanning, not assume fixed positions.
function fixtureGrid(): unknown[][] {
  const header = (weeks: number[]) => {
    const row = ['Slot', 'Exercise', 'Cue']
    for (const w of weeks) row.push(`Wk ${w} Plan\nNov ${w}`, `Wk ${w} Log`)
    row.push('Notes / hip feel')
    return row
  }

  return [
    [], // blank title-band row
    [],
    ['DAY 1  |  MONDAY  |  LOWER A: ACCEPT AND BUILD'],
    header([1, 2, 3, 4]),
    ['Prep', '90/90 Hip Switch', 'Slow, controlled', '2x6 ea', '', '', '', '', '', '', '', ''],
    ['Prep', 'Band Pull-Apart', 'Squeeze at the back', '2x15', '', '', '', '', '', '', '', ''],
    ['Prep', "World's Greatest Stretch", 'Full range', '60s ea', '', '', '', '', '', '', '', ''],
    ['Prep', 'Glute Bridge', 'Drive through heels', '2x10', '', '', '', '', '', '', '', ''],
    ['Prep', 'Wall Slide', 'Keep ribs down', '2x8', '', '', '', '', '', '', '', ''],
    ['A1', 'High-Handle Trap Bar Deadlift', 'Floor speed', '3x5 @8 BASELINE', '', '', '', '', '', '', '', 'Wk1: felt tight in right hip'],
    ['A2', '30° Incline DB Press', 'Control the eccentric', '3x8 @6', '', '', '', '', '', '', '', ''],
    ['B1', 'Goblet Box Squat', 'Sit back', '3x10 ea +load', '', '', '', '', '', '', '', ''],
    ['B2', 'Half-Kneeling Pallof Press', 'Resist rotation', '3x8 ea', '', '', '', '', '', '', '', ''],
    ['C1', 'Single-Leg RDL', 'Hinge, not squat', '3x8 ea @6-7', '', '', '', '', '', '', '', ''],
    ['C2', 'Suitcase Carry', 'Stay tall', '3x30yd ea', '', '', '', '', '', '', '', ''],
    ['D1', 'Dead Bug', 'Low back flat', '2x10 ea', '', '', '', '', '', '', '', ''],
    ['D2', 'Copenhagen Plank', 'Hips square', '3x20s ea', '', '', '', '', '', '', '', ''],
    [], // blank col B terminates Day 1's exercise list
    [],
    ['DAY 2  |  TUESDAY  |  UPPER A: ACCEPT AND BUILD'],
    header([1, 2, 3, 4]),
    ['A1', 'Bench Press', 'Touch and go', 'Travel', '', '', '', '', '', '', '', ''],
    [],
  ]
}

describe('parseBlockTab', () => {
  const parsed = parseBlockTab(fixtureGrid())

  it('discovers both day bars regardless of row position', () => {
    expect(parsed.days).toHaveLength(2)
    expect(parsed.days[0]).toMatchObject({ dayNumber: 1, weekday: 'MONDAY', title: 'LOWER A: ACCEPT AND BUILD' })
    expect(parsed.days[1]).toMatchObject({ dayNumber: 2, weekday: 'TUESDAY', title: 'UPPER A: ACCEPT AND BUILD' })
  })

  it('finds exactly 13 exercise rows for Day 1 — 5 prep + 8 work slots', () => {
    const day1 = dayForDayNumber(parsed, 1)!
    expect(day1.exercises).toHaveLength(13)
    expect(day1.exercises.filter((e) => e.slot === 'Prep')).toHaveLength(5)
    expect(day1.exercises.filter((e) => e.slot !== 'Prep')).toHaveLength(8)
  })

  it('reads exercise rows in slot order (Prep first, then A1/A2/B1/B2/C1/C2/D1/D2)', () => {
    const day1 = dayForDayNumber(parsed, 1)!
    expect(day1.exercises.map((e) => e.slot)).toEqual([
      'Prep', 'Prep', 'Prep', 'Prep', 'Prep',
      'A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'D1', 'D2',
    ])
  })

  it("gets Week 1's plan text correct for a specific exercise", () => {
    const day1 = dayForDayNumber(parsed, 1)!
    const deadlift = day1.exercises.find((e) => e.name === 'High-Handle Trap Bar Deadlift')!
    expect(deadlift.plansByWeek[1]).toBe('3x5 @8 BASELINE')
  })

  it('parses week labels with a trailing date on a new line', () => {
    const day1 = dayForDayNumber(parsed, 1)!
    expect(day1.weekColumns).toContainEqual({ week: 1, type: 'Plan', colIndex: 3 })
    expect(day1.weekColumns).toContainEqual({ week: 4, type: 'Log', colIndex: 10 })
  })

  it('extracts the Notes column separately from Plan/Log', () => {
    const day1 = dayForDayNumber(parsed, 1)!
    const deadlift = day1.exercises.find((e) => e.name === 'High-Handle Trap Bar Deadlift')!
    expect(deadlift.notes).toBe('Wk1: felt tight in right hip')
  })

  it("parses Day 2's Travel plan", () => {
    const day2 = dayForDayNumber(parsed, 2)!
    expect(day2.exercises[0].plansByWeek[1]).toBe('Travel')
  })

  it('does not bleed Day 2 rows into Day 1', () => {
    const day1 = dayForDayNumber(parsed, 1)!
    expect(day1.exercises.find((e) => e.name === 'Bench Press')).toBeUndefined()
  })
})

describe('blockTabCoversWeek', () => {
  const parsed = parseBlockTab(fixtureGrid())

  it('is true for a week present in the header', () => {
    expect(blockTabCoversWeek(parsed, 1)).toBe(true)
    expect(blockTabCoversWeek(parsed, 4)).toBe(true)
  })

  it('is false for a week this tab does not cover', () => {
    expect(blockTabCoversWeek(parsed, 5)).toBe(false)
  })
})

describe('dayForDayNumber', () => {
  const parsed = parseBlockTab(fixtureGrid())

  it('returns null for a day that does not exist in this tab', () => {
    expect(dayForDayNumber(parsed, 3)).toBeNull()
  })
})
