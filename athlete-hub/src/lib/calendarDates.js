// Native Date math for the athlete/coach calendar views — no date library
// needed, same approach db.js already uses for workoutDate()/shift math.
// Weeks are Monday-start throughout, matching the day_number convention
// (1 = Monday) used by template/assigned workouts.

export function toISODate(date) {
  const d = new Date(date)
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 10)
}

export function parseISODate(str) {
  return new Date(`${str}T00:00:00`)
}

export function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

export function startOfWeek(date) {
  const d = new Date(date)
  const day = d.getDay() // 0 = Sun ... 6 = Sat
  const diff = (day === 0 ? -6 : 1) - day
  d.setDate(d.getDate() + diff)
  return d
}

export function isSameDay(a, b) {
  return toISODate(a) === toISODate(b)
}

export function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function addMonths(date, n) {
  return new Date(date.getFullYear(), date.getMonth() + n, 1)
}

// A 6-week (42-day) Monday-start grid covering the given month, including
// the trailing/leading days of adjacent months needed to fill the grid.
export function monthGrid(date) {
  const gridStart = startOfWeek(startOfMonth(date))
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i))
}

export function formatMonthYear(date) {
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

export function formatDayOfWeek(date) {
  return date.toLocaleDateString(undefined, { weekday: 'short' })
}

export function formatFullDate(date) {
  return date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
}
