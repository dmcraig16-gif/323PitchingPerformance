// Command training math: intended target vs. actual pitch location.
//
// Coordinates are feet from the center of the plate at the front edge of
// home plate — x = horizontal (negative = glove side for a catcher facing
// the pitcher), y = height off the ground. This matches Trackman-style
// PlateLocSide/PlateLocHeight so the same strike-zone geometry used by the
// pitch visualizer applies here.

export const ZONE = { left: -0.7083, right: 0.7083, bottom: 1.5, top: 3.5 }

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
