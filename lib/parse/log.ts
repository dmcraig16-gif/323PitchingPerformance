// Reading and writing the Log column's text. The athlete may also type
// into the Sheet by hand, so parseLog has to be forgiving: it pulls out
// whatever load/reps/seconds/distance pairs it can find and ignores
// anything else, never throwing on malformed input.

export interface LoggedSet {
  load: number | null // null for a bodyweight set
  bodyweight: boolean
  reps: number | null
  seconds: number | null
  distanceYd: number | null
}

const LOAD_SET_RE = /(BW|\d+(?:\.\d+)?)\s*x\s*(\d+)(\s*yd)?/gi
const SECONDS_RE = /(\d+)\s*s\b/gi

export function parseLog(text: string | null | undefined): LoggedSet[] {
  const raw = (text ?? '').toString().trim()
  if (!raw) return []

  const sets: LoggedSet[] = []

  for (const match of raw.matchAll(LOAD_SET_RE)) {
    const [, loadToken, numToken, ydToken] = match
    const bodyweight = /^BW$/i.test(loadToken)
    const num = Number(numToken)
    sets.push({
      load: bodyweight ? null : Number(loadToken),
      bodyweight,
      reps: ydToken ? null : num,
      seconds: null,
      distanceYd: ydToken ? num : null,
    })
  }

  // Only fall back to bare "30s" parsing when nothing load-shaped matched
  // — otherwise "35x8" bleeds into matching "8" as part of some other
  // seconds token and double-counts the same set.
  if (sets.length === 0) {
    for (const match of raw.matchAll(SECONDS_RE)) {
      sets.push({ load: null, bodyweight: false, reps: null, seconds: Number(match[1]), distanceYd: null })
    }
  }

  return sets
}

// What the app writes back to a Log cell, one token per set joined by
// ", " — matches the exact format an athlete would type by hand.
export function formatLog(sets: LoggedSet[]): string {
  return sets
    .map((s) => {
      if (s.distanceYd != null) return `${s.bodyweight ? 'BW' : s.load}x${s.distanceYd}yd`
      if (s.seconds != null) return `${s.seconds}s`
      if (s.bodyweight) return `BWx${s.reps}`
      return `${s.load}x${s.reps}`
    })
    .join(', ')
}
