// Single place to retune 3:23 for your own facility's programming
// philosophy — branding, what a "program" can be, what pitch types show
// up in Command Tracker, the daily check-in's sliders, and how the
// readiness score is weighted. Nothing outside this file should hardcode
// these values, so a new facility (or a change in your own philosophy) is
// a config edit, not a UI rewrite.

export const FACILITY_NAME = '3:23'

// Program "categories" coaches can build programming under. Add another
// entry (e.g. arm care, mobility, recovery) and it shows up automatically
// in the Program Builder's type selector and every athlete-facing program
// list/badge.
export const PROGRAM_TYPES = [
  { value: 'lifting', label: 'Lifting', badgeClass: 'bg-blue-100 text-blue-700' },
  { value: 'throwing', label: 'Throwing', badgeClass: 'bg-orange-100 text-orange-700' },
]

export function programTypeMeta(value) {
  return PROGRAM_TYPES.find((t) => t.value === value) ?? { label: value, badgeClass: 'bg-neutral-100 text-neutral-700' }
}

// Pitch types offered in Command Tracker's pitch-type selector.
export const PITCH_TYPES = ['Fastball', 'Sinker', 'Cutter', 'Slider', 'Curveball', 'Changeup', 'Splitter']

// Exercise categories offered in the Exercise Builder. Add another entry
// and it shows up automatically in the exercise-type selector and every
// exercise badge across the Workout Builder and athlete program view.
export const EXERCISE_TYPES = [
  { value: 'strength', label: 'Strength', badgeClass: 'bg-blue-100 text-blue-700' },
  { value: 'power', label: 'Power / Plyometric', badgeClass: 'bg-violet-100 text-violet-700' },
  { value: 'throwing', label: 'Throwing', badgeClass: 'bg-orange-100 text-orange-700' },
  { value: 'arm-care', label: 'Arm Care', badgeClass: 'bg-teal-100 text-teal-700' },
  { value: 'mobility', label: 'Mobility', badgeClass: 'bg-emerald-100 text-emerald-700' },
  { value: 'conditioning', label: 'Conditioning', badgeClass: 'bg-rose-100 text-rose-700' },
  { value: 'recovery', label: 'Recovery', badgeClass: 'bg-neutral-100 text-neutral-700' },
]

export function exerciseTypeMeta(value) {
  return EXERCISE_TYPES.find((t) => t.value === value) ?? { label: value, badgeClass: 'bg-neutral-100 text-neutral-700' }
}

// Exercise type whose workout logging captures velocity instead of
// weight/reps (Command Tracker's per-pitch velo is separate — this is for
// logging a throwing drill's result inside a program, e.g. "long toss").
export const THROWING_EXERCISE_TYPE = 'throwing'

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

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

// Readiness scoring factors — how ready an athlete is to handle a
// high-intensity day. Sleep blends hours slept with the sleepQuality
// slider into one factor; every other factor reads straight from its
// slider. Weights are pulled from CHECKIN_SLIDERS above so there's one
// place to retune the formula.
export const READINESS_FACTORS = [
  {
    key: 'sleep',
    label: 'Sleep',
    weight: 0.2,
    invert: false,
    deriveScore: ({ sleepHours, sleepQuality }) => {
      const hoursScore = clamp((sleepHours / HOURS_FOR_FULL_SLEEP_SCORE) * 5, 0, 5)
      return (hoursScore + sleepQuality) / 2
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
