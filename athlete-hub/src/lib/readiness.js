// Daily readiness calculator.
//
// Inputs are what an athlete can report in ~30 seconds each morning:
//   sleepHours        numeric, hours slept
//   sleepQuality      1-5 (1 = terrible, 5 = great)
//   soreness          1-5 (1 = very sore, 5 = no soreness)
//   mood              1-5 (1 = poor, 5 = great)
//   energy            1-5 (1 = drained, 5 = fully energized)
//   nutrition         1-5 (1 = poor fueling/hydration, 5 = dialed in)
//   prevDayWorkload   1-5 RPE-style rating of the PREVIOUS day's training
//                     load (1 = easy/rest day, 5 = max effort day)
//
// Output is a 0-100 score plus a traffic-light band coaches can scan at a
// glance, and a per-factor breakdown so athletes can see what's dragging
// the score down.

export const READINESS_WEIGHTS = {
  sleep: 0.25,
  soreness: 0.2,
  mood: 0.15,
  energy: 0.2,
  nutrition: 0.1,
  workloadRecovery: 0.1,
}

const HOURS_FOR_FULL_SLEEP_SCORE = 8

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

// Blend reported sleep hours with subjective sleep quality into one 1-5 score.
function sleepScoreOf({ sleepHours, sleepQuality }) {
  const hoursScore = clamp((sleepHours / HOURS_FOR_FULL_SLEEP_SCORE) * 5, 0, 5)
  return (hoursScore + sleepQuality) / 2
}

export function computeReadiness(input) {
  const sleep = sleepScoreOf(input)
  const soreness = input.soreness
  const mood = input.mood
  const energy = input.energy
  const nutrition = input.nutrition
  // Heavy previous-day workload should lower today's readiness, so invert
  // the 1-5 RPE rating into a 1-5 "recovery" score.
  const workloadRecovery = 6 - input.prevDayWorkload

  const factors = { sleep, soreness, mood, energy, nutrition, workloadRecovery }

  const weightedSum = Object.entries(READINESS_WEIGHTS).reduce(
    (sum, [key, weight]) => sum + factors[key] * weight,
    0,
  )

  // Each factor is on a 1-5 scale, so the weighted sum is also 1-5.
  // Scale to 0-100: 1 -> 0, 5 -> 100.
  const score = Math.round(clamp(((weightedSum - 1) / 4) * 100, 0, 100))

  return {
    score,
    band: bandFor(score),
    factors,
  }
}

export function bandFor(score) {
  if (score >= 80) return { label: 'Ready', tone: 'green' }
  if (score >= 60) return { label: 'Caution', tone: 'yellow' }
  return { label: 'Modify', tone: 'red' }
}

export const BAND_STYLES = {
  green: { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  yellow: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  red: { bg: 'bg-rose-100', text: 'text-rose-700', dot: 'bg-rose-500' },
}

export const FACTOR_LABELS = {
  sleep: 'Sleep',
  soreness: 'Soreness',
  mood: 'Mood',
  energy: 'Energy',
  nutrition: 'Nutrition',
  workloadRecovery: 'Workload recovery',
}
