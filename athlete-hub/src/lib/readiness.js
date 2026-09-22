// Daily readiness calculator — how ready an athlete is to handle a
// high-intensity training day today. The actual factors/weights are
// defined in facilityConfig.js (READINESS_FACTORS, sourced from
// CHECKIN_SLIDERS) so a facility can retune its own formula in one place —
// this file just applies whatever's configured there to a check-in's raw
// slider input and produces a 0-100 score + band.
//
// input shape (from the Daily Check-In form's sliders, each 1-5):
//   sleepHours     numeric, hours slept
//   sleepQuality, strain, armSoreness, lowerSoreness, energy, mood,
//   nutrition, hydration

import { READINESS_FACTORS } from './facilityConfig'

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

export function computeReadiness(input) {
  const factors = {}
  let weightedSum = 0

  for (const f of READINESS_FACTORS) {
    const raw = f.deriveScore(input)
    // Each factor is scored 1-5; invert flips heavy-load-lowers-readiness
    // style factors so higher always means "more ready" from here on.
    const score = f.invert ? 6 - raw : raw
    factors[f.key] = score
    weightedSum += score * f.weight
  }

  // weightedSum is a 1-5 scale (weights sum to 1). Map 1 -> 0, 5 -> 100.
  const score = Math.round(clamp(((weightedSum - 1) / 4) * 100, 0, 100))

  return {
    score,
    band: bandFor(score),
    factors,
  }
}

export function bandFor(score) {
  if (score >= 80) return { label: 'Full Intensity', tone: 'green' }
  if (score >= 60) return { label: 'Modify Intensity', tone: 'yellow' }
  return { label: 'Recovery Day', tone: 'red' }
}

export const BAND_STYLES = {
  green: { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  yellow: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  red: { bg: 'bg-rose-100', text: 'text-rose-700', dot: 'bg-rose-500' },
}

export const FACTOR_LABELS = Object.fromEntries(READINESS_FACTORS.map((f) => [f.key, f.label]))
