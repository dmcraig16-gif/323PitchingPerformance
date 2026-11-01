import { describe, expect, it } from 'vitest'
import { parsePlan } from '../lib/parse/plan'

describe('parsePlan', () => {
  it('parses sets x reps with RPE', () => {
    expect(parsePlan('3x8 @6')).toMatchObject({ sets: 3, reps: 8, rpe: '6', perSide: false })
  })

  it('parses per-side sets with an RPE range', () => {
    expect(parsePlan('3x8 ea @6-7')).toMatchObject({ sets: 3, reps: 8, rpe: '6-7', perSide: true })
  })

  it('flags add-load progression', () => {
    expect(parsePlan('3x10 ea +load')).toMatchObject({ sets: 3, reps: 10, perSide: true, addLoad: true })
  })

  it('parses timed holds in seconds, not load, and flags bodyweight', () => {
    expect(parsePlan('3x30s ea BW')).toMatchObject({
      sets: 3,
      seconds: 30,
      reps: null,
      perSide: true,
      bodyweight: true,
    })
  })

  it('parses a bare timed set with no per-side marker', () => {
    expect(parsePlan('3x20s')).toMatchObject({ sets: 3, seconds: 20, reps: null, perSide: false })
  })

  it('parses carry distance in yards', () => {
    expect(parsePlan('3x30yd ea')).toMatchObject({ sets: 3, distanceYd: 30, reps: null, perSide: true })
  })

  it('parses prep/mobility sets x reps', () => {
    expect(parsePlan('2x6 ea')).toMatchObject({ sets: 2, reps: 6, perSide: true })
  })

  it('parses a bare seconds prescription with no set count', () => {
    expect(parsePlan('60s ea')).toMatchObject({ sets: null, seconds: 60, perSide: true })
  })

  it('parses reps-only shorthand', () => {
    expect(parsePlan('x10')).toMatchObject({ sets: null, reps: 10 })
  })

  it('falls back to a bare leading number as reps', () => {
    expect(parsePlan('3 ea way')).toMatchObject({ sets: null, reps: 3, perSide: true })
  })

  it('flags a baseline test set', () => {
    expect(parsePlan('3x5 @8 BASELINE')).toMatchObject({ sets: 3, reps: 5, rpe: '8', baseline: true })
  })

  it('flags a travel week', () => {
    expect(parsePlan('Travel')).toMatchObject({ travel: true, sets: null, reps: null })
  })

  it('returns all-null fields for an empty cell', () => {
    const result = parsePlan('')
    expect(result.sets).toBeNull()
    expect(result.reps).toBeNull()
    expect(result.travel).toBe(false)
    expect(result.raw).toBe('')
  })

  it('handles null/undefined input without throwing', () => {
    expect(() => parsePlan(null)).not.toThrow()
    expect(() => parsePlan(undefined)).not.toThrow()
  })

  it('always keeps the raw text verbatim', () => {
    expect(parsePlan('  3x8 @6  ').raw).toBe('3x8 @6')
  })
})
