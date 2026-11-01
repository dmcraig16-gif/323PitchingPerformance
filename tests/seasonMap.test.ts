import { describe, expect, it } from 'vitest'
import { parseSeasonMap, seasonMapWeek } from '../lib/parse/seasonMap'

// Fixture shaped like Season Map!A6:H35 — 30 rows, columns A-H.
// Only the first few + a deload week are filled in; the rest are blank
// rows the way an unfinished season map would look mid-build.
function fixtureRows(): unknown[][] {
  const rows: unknown[][] = []
  rows.push([1, 'Nov 2 - Nov 8', '1. On-ramp', 'Home gym', '4', 'General prep', 190, 189.4])
  rows.push([2, 'Nov 9 - Nov 15', '1. On-ramp', 'Home gym', '4', 'General prep', 190, ''])
  rows.push([3, 'Nov 16 - Nov 22', '1. On-ramp', 'Home gym', '3-4', 'General prep', 191, ''])
  rows.push([4, 'Nov 23 - Nov 29', 'Deload', 'Home gym', '0-2', 'Recovery', 191, ''])
  for (let i = 5; i <= 30; i++) rows.push([])
  return rows
}

describe('parseSeasonMap', () => {
  const weeks = parseSeasonMap(fixtureRows())

  it('skips blank rows', () => {
    expect(weeks).toHaveLength(4)
  })

  it('parses a normal week', () => {
    expect(weeks[0]).toMatchObject({
      week: 1,
      dates: 'Nov 2 - Nov 8',
      block: '1. On-ramp',
      sessionsPlanned: 4,
      targetBW: 190,
      avgBW: 189.4,
    })
  })

  it('parses the first number out of a range like "3-4"', () => {
    expect(weeks[2].sessionsPlanned).toBe(3)
    expect(weeks[2].sessionsPlannedRaw).toBe('3-4')
  })

  it('treats a blank avgBW formula cell as null, not zero', () => {
    expect(weeks[1].avgBW).toBeNull()
  })

  it('parses a deload week like any other', () => {
    expect(weeks[3]).toMatchObject({ week: 4, block: 'Deload', sessionsPlanned: 0 })
  })
})

describe('seasonMapWeek', () => {
  const weeks = parseSeasonMap(fixtureRows())

  it('finds a week by number', () => {
    expect(seasonMapWeek(weeks, 2)?.dates).toBe('Nov 9 - Nov 15')
  })

  it('returns null for a week with no row', () => {
    expect(seasonMapWeek(weeks, 29)).toBeNull()
  })
})
