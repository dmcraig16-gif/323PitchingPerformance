// Parses the Season Map tab's data rows (A6:H35 — the header is row 5,
// so the caller passes only the data range) into typed weeks.
export interface SeasonMapWeek {
  week: number
  dates: string
  block: string
  where: string
  sessionsPlanned: number | null
  sessionsPlannedRaw: string
  focus: string
  targetBW: number | null
  avgBW: number | null
}

export function parseSeasonMap(rows: unknown[][]): SeasonMapWeek[] {
  const weeks: SeasonMapWeek[] = []

  for (const row of rows) {
    const weekCell = row[0]
    if (weekCell === undefined || weekCell === null || weekCell === '') continue
    const week = Number(weekCell)
    if (Number.isNaN(week)) continue

    const sessionsPlannedRaw = String(row[4] ?? '')
    const firstNum = sessionsPlannedRaw.match(/\d+/)

    weeks.push({
      week,
      dates: String(row[1] ?? ''),
      block: String(row[2] ?? ''),
      where: String(row[3] ?? ''),
      sessionsPlanned: firstNum ? Number(firstNum[0]) : null,
      sessionsPlannedRaw,
      focus: String(row[5] ?? ''),
      targetBW: numberOrNull(row[6]),
      avgBW: numberOrNull(row[7]),
    })
  }

  return weeks
}

export function seasonMapWeek(weeks: SeasonMapWeek[], week: number): SeasonMapWeek | null {
  return weeks.find((w) => w.week === week) ?? null
}

function numberOrNull(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null
  const n = Number(value)
  return Number.isNaN(n) ? null : n
}
