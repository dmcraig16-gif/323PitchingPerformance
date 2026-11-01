import { describe, expect, it } from 'vitest'
import { currentWeek, dailyLogRow, dayNumberForWeekday, todayInTimezone } from '../lib/week'

describe('currentWeek', () => {
  const programStart = new Date(2026, 10, 2) // Mon Nov 2, 2026

  it('is week 1 on programStart itself', () => {
    expect(currentWeek(programStart, new Date(2026, 10, 2))).toBe(1)
  })

  it('is still week 1 through the end of the first 7 days', () => {
    expect(currentWeek(programStart, new Date(2026, 10, 8))).toBe(1)
  })

  it('rolls to week 2 on day 8', () => {
    expect(currentWeek(programStart, new Date(2026, 10, 9))).toBe(2)
  })

  it('clamps at week 30 for dates far in the future', () => {
    expect(currentWeek(programStart, new Date(2028, 0, 1))).toBe(30)
  })

  it('clamps at week 1 for a date before programStart', () => {
    expect(currentWeek(programStart, new Date(2026, 9, 1))).toBe(1)
  })
})

describe('dailyLogRow', () => {
  const programStart = new Date(2026, 10, 2)

  it('maps programStart to row 6 (header is row 5)', () => {
    expect(dailyLogRow(programStart, new Date(2026, 10, 2))).toBe(6)
  })

  it('maps the next day to row 7', () => {
    expect(dailyLogRow(programStart, new Date(2026, 10, 3))).toBe(7)
  })

  it('returns null before programStart', () => {
    expect(dailyLogRow(programStart, new Date(2026, 9, 1))).toBeNull()
  })
})

describe('dayNumberForWeekday', () => {
  it('maps Monday to Day 1', () => {
    expect(dayNumberForWeekday(new Date(2026, 10, 2))).toBe(1) // Mon
  })
  it('maps Tuesday to Day 2', () => {
    expect(dayNumberForWeekday(new Date(2026, 10, 3))).toBe(2) // Tue
  })
  it('maps Thursday to Day 3', () => {
    expect(dayNumberForWeekday(new Date(2026, 10, 5))).toBe(3) // Thu
  })
  it('maps Friday to Day 4', () => {
    expect(dayNumberForWeekday(new Date(2026, 10, 6))).toBe(4) // Fri
  })
  it('maps Wednesday, Saturday, Sunday to null', () => {
    expect(dayNumberForWeekday(new Date(2026, 10, 4))).toBeNull() // Wed
    expect(dayNumberForWeekday(new Date(2026, 10, 7))).toBeNull() // Sat
    expect(dayNumberForWeekday(new Date(2026, 10, 8))).toBeNull() // Sun
  })
})

describe('todayInTimezone', () => {
  it('resolves the correct calendar date for a given instant and zone', () => {
    // Noon UTC on Nov 2 is still Nov 2 morning in America/Boise (UTC-6/-7)
    const instant = new Date('2026-11-02T12:00:00Z')
    const result = todayInTimezone('America/Boise', instant)
    expect(result.getFullYear()).toBe(2026)
    expect(result.getMonth()).toBe(10)
    expect(result.getDate()).toBe(2)
  })

  it('rolls to the next day in a timezone ahead of UTC', () => {
    // 11pm UTC on Nov 2 is already Nov 3 in a UTC+10 zone
    const instant = new Date('2026-11-02T23:00:00Z')
    const result = todayInTimezone('Australia/Sydney', instant)
    expect(result.getDate()).toBe(3)
  })
})
