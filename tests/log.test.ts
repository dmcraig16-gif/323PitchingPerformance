import { describe, expect, it } from 'vitest'
import { parseLog, formatLog } from '../lib/parse/log'

describe('parseLog', () => {
  it('parses comma-separated load sets', () => {
    expect(parseLog('35x8, 35x8, 40x8')).toEqual([
      { load: 35, bodyweight: false, reps: 8, seconds: null, distanceYd: null },
      { load: 35, bodyweight: false, reps: 8, seconds: null, distanceYd: null },
      { load: 40, bodyweight: false, reps: 8, seconds: null, distanceYd: null },
    ])
  })

  it('parses bodyweight sets', () => {
    expect(parseLog('BWx8, BWx8')).toEqual([
      { load: null, bodyweight: true, reps: 8, seconds: null, distanceYd: null },
      { load: null, bodyweight: true, reps: 8, seconds: null, distanceYd: null },
    ])
  })

  it('parses timed holds', () => {
    expect(parseLog('30s, 30s, 35s')).toEqual([
      { load: null, bodyweight: false, reps: null, seconds: 30, distanceYd: null },
      { load: null, bodyweight: false, reps: null, seconds: 30, distanceYd: null },
      { load: null, bodyweight: false, reps: null, seconds: 35, distanceYd: null },
    ])
  })

  it('parses carries as load x distance', () => {
    expect(parseLog('50x30yd, 50x30yd')).toEqual([
      { load: 50, bodyweight: false, reps: null, seconds: null, distanceYd: 30 },
      { load: 50, bodyweight: false, reps: null, seconds: null, distanceYd: 30 },
    ])
  })

  it('returns an empty array for an empty cell', () => {
    expect(parseLog('')).toEqual([])
    expect(parseLog(null)).toEqual([])
  })

  it('never throws on malformed hand-typed input', () => {
    expect(() => parseLog('felt good today, skipped last set')).not.toThrow()
    expect(parseLog('asdf;lkj')).toEqual([])
  })
})

describe('formatLog', () => {
  it('formats load sets the way an athlete would type them', () => {
    expect(
      formatLog([
        { load: 35, bodyweight: false, reps: 8, seconds: null, distanceYd: null },
        { load: 35, bodyweight: false, reps: 8, seconds: null, distanceYd: null },
      ]),
    ).toBe('35x8, 35x8')
  })

  it('formats bodyweight sets', () => {
    expect(formatLog([{ load: null, bodyweight: true, reps: 8, seconds: null, distanceYd: null }])).toBe('BWx8')
  })

  it('formats timed holds', () => {
    expect(formatLog([{ load: null, bodyweight: false, reps: null, seconds: 30, distanceYd: null }])).toBe('30s')
  })

  it('formats carries', () => {
    expect(formatLog([{ load: 50, bodyweight: false, reps: null, seconds: null, distanceYd: 30 }])).toBe('50x30yd')
  })

  it('round-trips through parseLog', () => {
    const original = '35x8, 40x6, 45x5'
    expect(formatLog(parseLog(original))).toBe(original)
  })
})
