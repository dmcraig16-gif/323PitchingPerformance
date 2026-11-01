// "Today" math — always computed in the athlete's own configured
// timezone, never the server's, since a server in UTC crossing midnight
// before the athlete's own midnight would silently show tomorrow's
// session.

const MS_PER_DAY = 24 * 60 * 60 * 1000

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

// Resolves "today" as a calendar date (midnight local) in the given IANA
// timezone, independent of where this code is actually running.
export function todayInTimezone(timezone: string, now: Date = new Date()): Date {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const y = Number(parts.find((p) => p.type === 'year')?.value)
  const m = Number(parts.find((p) => p.type === 'month')?.value)
  const d = Number(parts.find((p) => p.type === 'day')?.value)
  return new Date(y, m - 1, d)
}

function diffDays(from: Date, to: Date): number {
  return Math.floor((startOfDay(to).getTime() - startOfDay(from).getTime()) / MS_PER_DAY)
}

// Clamped to the 30-week season per Season Map's row range.
export function currentWeek(programStart: Date, today: Date): number {
  const week = Math.floor(diffDays(programStart, today) / 7) + 1
  return Math.min(30, Math.max(1, week))
}

// Daily Log's row for a given date — row 6 is programStart's own row,
// each row after is the next calendar day. Returns null for a date
// before programStart (no such row exists).
export function dailyLogRow(programStart: Date, date: Date, headerRow = 5): number | null {
  const offset = diffDays(programStart, date)
  if (offset < 0) return null
  return headerRow + 1 + offset
}

// Mon=Day1, Tue=Day2, Thu=Day3, Fri=Day4 — Wed/Sat/Sun have no lift day
// (they're a throwing/recovery card instead).
const WEEKDAY_TO_DAY_NUMBER: Record<number, number | null> = {
  0: null, // Sunday
  1: 1, // Monday
  2: 2, // Tuesday
  3: null, // Wednesday
  4: 3, // Thursday
  5: 4, // Friday
  6: null, // Saturday
}

export function dayNumberForWeekday(date: Date): number | null {
  return WEEKDAY_TO_DAY_NUMBER[date.getDay()] ?? null
}
