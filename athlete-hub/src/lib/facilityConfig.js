// Single place to retune 323 Performance Hub for your own facility's
// programming philosophy — branding, what a "program" can be, what pitch
// types show up in Command Tracker, and how the daily readiness score is
// weighted. Nothing outside this file should hardcode these values, so a
// new facility (or a change in your own philosophy) is a config edit, not
// a UI rewrite.

export const FACILITY_NAME = '323 Performance Hub'

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

// Daily check-in input fields (the 1-5 buttons an athlete taps through).
// `key` must match the field name used in CheckIn.jsx's form state.
export const CHECKIN_INPUT_FIELDS = [
  { key: 'sleepQuality', label: 'Sleep quality', hint: '1 = poor, 5 = great' },
  { key: 'soreness', label: 'Soreness', hint: '1 = very sore, 5 = none' },
  { key: 'mood', label: 'Mood', hint: '1 = poor, 5 = great' },
  { key: 'energy', label: 'Energy', hint: '1 = drained, 5 = energized' },
  { key: 'nutrition', label: 'Nutrition / hydration', hint: '1 = poor, 5 = dialed in' },
  { key: 'prevDayWorkload', label: "Yesterday's training load", hint: '1 = easy day, 5 = max effort' },
]

export const HOURS_FOR_FULL_SLEEP_SCORE = 8

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

// Readiness scoring factors. Each `weight` is that factor's share of the
// final 0-100 score (should sum to 1 across all entries). `invert: true`
// means a HIGHER raw input means LOWER readiness (e.g. a max-effort prior
// day should drag today's score down, not up). `deriveScore` computes the
// factor's 1-5 value from the check-in form's raw input — most factors are
// a direct 1-5 read, but sleep blends hours slept with subjective quality.
export const READINESS_FACTORS = [
  {
    key: 'sleep',
    label: 'Sleep',
    weight: 0.25,
    invert: false,
    deriveScore: ({ sleepHours, sleepQuality }) => {
      const hoursScore = clamp((sleepHours / HOURS_FOR_FULL_SLEEP_SCORE) * 5, 0, 5)
      return (hoursScore + sleepQuality) / 2
    },
  },
  { key: 'soreness', label: 'Soreness', weight: 0.2, invert: false, deriveScore: (i) => i.soreness },
  { key: 'mood', label: 'Mood', weight: 0.15, invert: false, deriveScore: (i) => i.mood },
  { key: 'energy', label: 'Energy', weight: 0.2, invert: false, deriveScore: (i) => i.energy },
  { key: 'nutrition', label: 'Nutrition', weight: 0.1, invert: false, deriveScore: (i) => i.nutrition },
  {
    key: 'workloadRecovery',
    label: 'Workload recovery',
    weight: 0.1,
    invert: true,
    deriveScore: (i) => i.prevDayWorkload,
  },
]
