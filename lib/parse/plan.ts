// Parses one Plan cell's text into structured fields the UI can build
// inputs from. `raw` is always kept and always shown — if a cell uses a
// format this doesn't recognize, the UI falls back to raw text plus a
// free-text log box rather than crashing or hiding the prescription.
export interface ParsedPlan {
  sets: number | null
  reps: number | null
  seconds: number | null
  distanceYd: number | null
  perSide: boolean
  rpe: string | null
  bodyweight: boolean
  addLoad: boolean
  baseline: boolean
  travel: boolean
  raw: string
}

const EMPTY_FIELDS = {
  sets: null,
  reps: null,
  seconds: null,
  distanceYd: null,
  perSide: false,
  rpe: null,
  bodyweight: false,
  addLoad: false,
  baseline: false,
  travel: false,
} as const

export function parsePlan(text: string | null | undefined): ParsedPlan {
  const raw = (text ?? '').toString().trim()
  if (!raw) return { ...EMPTY_FIELDS, raw }
  if (/^travel$/i.test(raw)) return { ...EMPTY_FIELDS, travel: true, raw }

  const perSide = /\bea\b/i.test(raw) || /each\s*way/i.test(raw)
  const baseline = /baseline/i.test(raw)
  const bodyweight = /\bBW\b/i.test(raw)
  const addLoad = /\+\s*load/i.test(raw)

  let rpe: string | null = null
  const rpeMatch = raw.match(/@\s*(\d+(?:-\d+)?)/)
  if (rpeMatch) rpe = rpeMatch[1]

  let sets: number | null = null
  let reps: number | null = null
  let seconds: number | null = null
  let distanceYd: number | null = null

  // "3x8", "3x30s", "3x30yd" — sets x (reps | seconds | distance)
  const setsMatch = raw.match(/(\d+)\s*x\s*(\d+)\s*(s|sec|yd)?/i)
  if (setsMatch) {
    sets = Number(setsMatch[1])
    const num = Number(setsMatch[2])
    const unit = setsMatch[3]?.toLowerCase()
    if (unit === 's' || unit === 'sec') seconds = num
    else if (unit === 'yd') distanceYd = num
    else reps = num
  } else {
    // "x10" — reps only, no explicit set count in this cell
    const repsOnlyMatch = raw.match(/^x\s*(\d+)/i)
    if (repsOnlyMatch) reps = Number(repsOnlyMatch[1])

    // "60s ea" — seconds only
    if (reps === null) {
      const secOnlyMatch = raw.match(/(\d+)\s*s\b/i)
      if (secOnlyMatch) seconds = Number(secOnlyMatch[1])
    }
  }

  // "3 ea way" — a bare leading number with no 'x', treat as reps
  if (sets === null && reps === null && seconds === null && distanceYd === null) {
    const bareNumMatch = raw.match(/^(\d+)\b/)
    if (bareNumMatch) reps = Number(bareNumMatch[1])
  }

  return { sets, reps, seconds, distanceYd, perSide, rpe, bodyweight, addLoad, baseline, travel: false, raw }
}
