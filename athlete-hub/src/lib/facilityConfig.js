// Single place to retune 3:23 for your own facility's programming
// philosophy — branding, what a "program" can be, what pitch types show
// up in Command Tracker, the daily check-in's sliders, and how the
// readiness score is weighted. Nothing outside this file should hardcode
// these values, so a new facility (or a change in your own philosophy) is
// a config edit, not a UI rewrite.

export const FACILITY_NAME = '3:23'

// Logo assets (in public/, generated from the source badge — see
// public/logo-square.png for the full-detail master). Use LOGO_CIRCLE on
// dark backgrounds (transparent outside the badge's circle) and
// LOGO_SQUARE on light ones.
export const LOGO_CIRCLE = '/logo-circle.png'
export const LOGO_SQUARE = '/logo-square.png'

// The four workout types — each drives a distinct prescription shape and
// logging UI (see item_library/template_items/assigned_items in the
// schema: throwing logs throws+velo, lifting logs per-set reps/weight,
// mobility/movement_prep log per-set completion). A program's days can
// freely mix all four; type lives on the workout, not the program.
export const WORKOUT_TYPES = [
  { value: 'throwing', label: 'Throwing Program', badgeClass: 'bg-orange-100 text-orange-700' },
  { value: 'lifting', label: 'Lifting', badgeClass: 'bg-blue-100 text-blue-700' },
  { value: 'mobility', label: 'Mobility', badgeClass: 'bg-emerald-100 text-emerald-700' },
  { value: 'movement_prep', label: 'Movement Prep', badgeClass: 'bg-violet-100 text-violet-700' },
]

export function workoutTypeMeta(value) {
  return WORKOUT_TYPES.find((t) => t.value === value) ?? { label: value, badgeClass: 'bg-neutral-100 text-neutral-700' }
}

// A workout's calendar/dot color follows its denormalized status, except
// "missed" — that's never stored (it would go stale the moment "today"
// moves on), so it's derived here at render time from the stored status
// plus how the date compares to today.
export function deriveWorkoutStatus(workout, todayISO) {
  if (workout.status === 'completed' || workout.status === 'partial') return workout.status
  return workout.date < todayISO ? 'missed' : 'pending'
}

export function workoutStatusMeta(status) {
  switch (status) {
    case 'completed':
      return { label: 'Completed', dotClass: 'bg-emerald-500', badgeClass: 'bg-emerald-100 text-emerald-700' }
    case 'partial':
      return { label: 'In progress', dotClass: 'bg-amber-500', badgeClass: 'bg-amber-100 text-amber-700' }
    case 'missed':
      return { label: 'Missed', dotClass: 'bg-rose-400', badgeClass: 'bg-rose-100 text-rose-700' }
    default:
      return { label: 'Upcoming', dotClass: 'bg-neutral-300', badgeClass: 'bg-neutral-100 text-neutral-500' }
  }
}

// Pitch types offered in Command Tracker's pitch-type selector.
export const PITCH_TYPES = ['Fastball', 'Sinker', 'Cutter', 'Slider', 'Curveball', 'Changeup', 'Splitter']

// Daily check-in sliders (1-5). `key` matches the field name in CheckIn's
// form state. `low`/`high` anchor the slider ends; `weight` is this
// factor's share of the final 0-100 readiness score (all weights across
// READINESS_FACTORS should sum to 1). `invert: true` means a HIGHER raw
// slider value means LOWER readiness (heavier strain, more sore).
export const CHECKIN_SLIDERS = [
  { key: 'sleepQuality', label: 'Sleep quality', low: 'Poor', high: 'Great', weight: null, invert: false },
  { key: 'strain', label: 'Strain (yesterday\'s training load)', low: 'Easy day', high: 'Max effort', weight: 0.15, invert: true },
  { key: 'armSoreness', label: 'Arm soreness', low: 'Very sore', high: 'Fresh', weight: 0.15, invert: false },
  { key: 'lowerSoreness', label: 'Lower body soreness', low: 'Very sore', high: 'Fresh', weight: 0.1, invert: false },
  { key: 'energy', label: 'Energy', low: 'Drained', high: 'Energized', weight: 0.15, invert: false },
  { key: 'mood', label: 'Mood', low: 'Poor', high: 'Great', weight: 0.1, invert: false },
  { key: 'nutrition', label: 'Nutrition', low: 'Poor fueling', high: 'Dialed in', weight: 0.075, invert: false },
  { key: 'hydration', label: 'Hydration', low: 'Dehydrated', high: 'Fully hydrated', weight: 0.075, invert: false },
]

export const HOURS_FOR_FULL_SLEEP_SCORE = 8

// Optional WHOOP metrics an athlete can log alongside the sliders. `key`
// matches the check-in form's state; the db column is the same key
// snake_cased (see CheckIn.jsx). Purely optional — an athlete with no
// WHOOP just never opens this section.
export const WHOOP_FIELDS = [
  { key: 'whoopRecovery', label: 'Recovery', unit: '%', min: 0, max: 100, step: 1, placeholder: '78' },
  { key: 'whoopStrain', label: 'Strain', unit: '', min: 0, max: 21, step: 0.1, placeholder: '12.4' },
  { key: 'whoopSleepPerformance', label: 'Sleep Performance', unit: '%', min: 0, max: 100, step: 1, placeholder: '91' },
  { key: 'whoopHrv', label: 'HRV', unit: 'ms', min: 0, max: 300, step: 1, placeholder: '62' },
  { key: 'whoopRestingHr', label: 'Resting HR', unit: 'bpm', min: 0, max: 220, step: 1, placeholder: '48' },
]

// WHOOP's Recovery % is the one WHOOP metric on the same 0-100 "how ready
// am I" scale as our own self-reported sleep. When an athlete logs it, it
// blends into the Sleep & Recovery factor (below) at this weight — the
// self-reported sleep hours/quality keep the rest of that factor's share,
// they're never fully replaced. Set to 0 to track WHOOP data without it
// ever touching the score.
export const WHOOP_RECOVERY_WEIGHT = 0.35

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

// Readiness scoring factors — how ready an athlete is to handle a
// high-intensity day. Sleep & Recovery blends hours slept and the
// sleepQuality slider into a self-reported score, then — if WHOOP
// Recovery is logged — blends that in too at WHOOP_RECOVERY_WEIGHT, all
// within this one factor's normal 0.2 share of the total score (rather
// than WHOOP Recovery diluting every other factor, including things it
// has no bearing on like nutrition or mood). Every other factor reads
// straight from its slider. Weights are pulled from CHECKIN_SLIDERS above
// so there's one place to retune the formula.
export const READINESS_FACTORS = [
  {
    key: 'sleep',
    label: 'Sleep & Recovery',
    weight: 0.2,
    invert: false,
    deriveScore: ({ sleepHours, sleepQuality, whoopRecovery }) => {
      const hoursScore = clamp((sleepHours / HOURS_FOR_FULL_SLEEP_SCORE) * 5, 0, 5)
      const selfReportedScore = (hoursScore + sleepQuality) / 2
      const hasWhoop = whoopRecovery !== '' && whoopRecovery !== null && whoopRecovery !== undefined
      if (!hasWhoop) return selfReportedScore
      const recoveryScore = clamp((Number(whoopRecovery) / 100) * 5, 0, 5)
      return selfReportedScore * (1 - WHOOP_RECOVERY_WEIGHT) + recoveryScore * WHOOP_RECOVERY_WEIGHT
    },
  },
  ...CHECKIN_SLIDERS.filter((f) => f.key !== 'sleepQuality').map((f) => ({
    key: f.key,
    label: f.label.replace(/\s*\(.*\)$/, ''),
    weight: f.weight,
    invert: f.invert,
    deriveScore: (i) => i[f.key],
  })),
]
