// Command training math: intended target vs. actual pitch location.
//
// Coordinates are feet from the center of the plate at the front edge of
// home plate — x = horizontal (negative = glove side for a catcher facing
// the pitcher), y = height off the ground. This matches Trackman-style
// PlateLocSide/PlateLocHeight so the same strike-zone geometry used by the
// pitch visualizer applies here.

// Both zones below get a uniform 1" buffer on every side — a pitch only
// has to touch part of the zone to be a strike, and umpires/catchers
// generally work with that same margin, so a drawn/target zone that's
// exactly rulebook-tight reads as stricter than the game actually is.
const BUFFER_IN = 1

function withBuffer(zone) {
  const b = BUFFER_IN / 12
  return { left: zone.left - b, right: zone.right + b, bottom: zone.bottom - b, top: zone.top + b }
}

// MLB — Automated Ball-Strike System (in effect since 2026): the top of
// the zone is 53.5% of the batter's height, the bottom is 27%. This app
// doesn't track individual batter heights, so it's applied to the 2025
// MLB-average player height (6'1.58" / 73.6") to produce a single
// average-batter zone.
const MLB_AVG_HEIGHT_IN = 73.6
export const MLB_ZONE = withBuffer({
  left: -8.5 / 12,
  right: 8.5 / 12,
  bottom: (MLB_AVG_HEIGHT_IN * 0.27) / 12,
  top: (MLB_AVG_HEIGHT_IN * 0.535) / 12,
})

// High school (NFHS Rule 2-35-2): the top of the zone is the midpoint
// between the batter's shoulders and waistline, the bottom is the top of
// the knees, in their natural batting stance — an anatomically different
// (and generally taller) definition than MLB's pants-top-to-kneecap-
// hollow zone above. NFHS doesn't publish a %-of-height formula the way
// MLB's ABS does, so this uses the ~1.5'-3.5' reference zone long used
// across amateur baseball to approximate that definition for an
// average-size high schooler.
export const HS_ZONE = withBuffer({
  left: -8.5 / 12,
  right: 8.5 / 12,
  bottom: 1.5,
  top: 3.5,
})

export const ZONE_LEVELS = [
  { value: 'mlb', label: 'MLB', zone: MLB_ZONE },
  { value: 'hs', label: 'High School', zone: HS_ZONE },
]

export function missDistanceInches(intended, actual) {
  const dx = actual.x - intended.x
  const dy = actual.y - intended.y
  return Math.hypot(dx, dy) * 12
}

// Groups pitches by pitch_type and returns count / avg miss distance /
// avg velocity / best & worst miss for each, plus an overall summary.
export function summarizeByPitchType(pitches) {
  const groups = new Map()

  for (const p of pitches) {
    const key = p.pitch_type || 'Unknown'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(p)
  }

  const byType = [...groups.entries()]
    .map(([pitchType, rows]) => {
      const misses = rows.map((r) => r.miss_distance_in)
      const velos = rows.filter((r) => r.velocity != null).map((r) => r.velocity)
      return {
        pitchType,
        count: rows.length,
        avgMissIn: average(misses),
        bestMissIn: Math.min(...misses),
        worstMissIn: Math.max(...misses),
        avgVelocity: velos.length ? average(velos) : null,
      }
    })
    .sort((a, b) => b.count - a.count)

  const allMisses = pitches.map((p) => p.miss_distance_in)

  return {
    byType,
    overall: {
      count: pitches.length,
      avgMissIn: pitches.length ? average(allMisses) : null,
    },
  }
}

// Bucket pitches by session_date, in chronological order, for trend charts.
export function trendBySession(pitches) {
  const byDate = new Map()
  for (const p of pitches) {
    if (!byDate.has(p.session_date)) byDate.set(p.session_date, [])
    byDate.get(p.session_date).push(p)
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, rows]) => ({
      date,
      avgMissIn: average(rows.map((r) => r.miss_distance_in)),
      avgVelocity: average(rows.filter((r) => r.velocity != null).map((r) => r.velocity)) || null,
      count: rows.length,
    }))
}

function average(nums) {
  if (!nums.length) return null
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

export function round1(n) {
  return n == null ? null : Math.round(n * 10) / 10
}
