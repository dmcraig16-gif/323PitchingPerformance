// Parses a `Block N ...` tab's full grid. Nothing here is hardcoded to a
// row number — day bars, header rows, week columns, and the exercise
// list are all discovered by scanning, since a new block can rearrange
// all of it. Pass the tab's whole used range (not just a guessed slice).

export interface WeekColumn {
  week: number // global week number (Block 2 starts at Wk 5, etc.)
  type: 'Plan' | 'Log'
  colIndex: number // 0-based index into each row's array
}

export interface ExerciseRow {
  slot: string
  name: string
  cue: string
  demo: string
  plansByWeek: Record<number, string>
  logsByWeek: Record<number, string>
  notes: string
  rowIndex: number // 0-based index into the grid passed in
}

export interface BlockDay {
  dayNumber: number
  weekday: string
  title: string
  headerRowIndex: number
  weekColumns: WeekColumn[]
  exercises: ExerciseRow[]
}

export interface ParsedBlockTab {
  days: BlockDay[]
}

const DAY_BAR_RE = /^DAY\b/i
const WEEK_COL_RE = /Wk\s*(\d+)\s*(Plan|Log)/i

export function parseBlockTab(grid: unknown[][]): ParsedBlockTab {
  const days: BlockDay[] = []

  for (let i = 0; i < grid.length; i++) {
    const colA = String(grid[i]?.[0] ?? '').trim()
    if (!DAY_BAR_RE.test(colA)) continue

    const parts = colA.split('|').map((p) => p.trim())
    const dayMatch = parts[0]?.match(/DAY\s*(\d+)/i)
    if (!dayMatch) continue
    const dayNumber = Number(dayMatch[1])
    const weekday = parts[1] ?? ''
    const title = parts[2] ?? ''

    const headerRowIndex = i + 1
    const headerRow = grid[headerRowIndex]
    if (!headerRow || String(headerRow[0] ?? '').trim().toLowerCase() !== 'slot') {
      // Malformed day bar (no header row right after it) — skip it
      // rather than guessing where its exercises might be.
      continue
    }

    const weekColumns: WeekColumn[] = []
    let notesCol = -1
    let demoCol = -1
    for (let c = 3; c < headerRow.length; c++) {
      const label = String(headerRow[c] ?? '')
      const wkMatch = label.match(WEEK_COL_RE)
      if (wkMatch) {
        const type = wkMatch[2].toLowerCase() === 'plan' ? 'Plan' : 'Log'
        weekColumns.push({ week: Number(wkMatch[1]), type, colIndex: c })
      } else if (/notes/i.test(label)) {
        notesCol = c
      } else if (/^demo$/i.test(label.trim())) {
        demoCol = c
      }
    }
    if (notesCol === -1 && headerRow.length > 3) notesCol = headerRow.length - 1

    const exercises: ExerciseRow[] = []
    let r = headerRowIndex + 1
    while (r < grid.length) {
      const row = grid[r]
      const name = String(row?.[1] ?? '').trim()
      if (!name) break

      const plansByWeek: Record<number, string> = {}
      const logsByWeek: Record<number, string> = {}
      for (const wc of weekColumns) {
        const val = String(row?.[wc.colIndex] ?? '').trim()
        if (wc.type === 'Plan') plansByWeek[wc.week] = val
        else logsByWeek[wc.week] = val
      }

      exercises.push({
        slot: String(row?.[0] ?? '').trim(),
        name,
        cue: String(row?.[2] ?? '').trim(),
        demo: demoCol >= 0 ? String(row?.[demoCol] ?? '').trim() : '',
        plansByWeek,
        logsByWeek,
        notes: notesCol >= 0 ? String(row?.[notesCol] ?? '').trim() : '',
        rowIndex: r,
      })
      r++
    }

    days.push({ dayNumber, weekday, title, headerRowIndex, weekColumns, exercises })
    i = r - 1 // resume scanning after this day's exercise block
  }

  return { days }
}

// True when this tab has a Plan column for the given global week —
// used to find which `Block N ...` tab is "active" for the current week.
export function blockTabCoversWeek(parsed: ParsedBlockTab, week: number): boolean {
  return parsed.days.some((d) => d.weekColumns.some((wc) => wc.week === week && wc.type === 'Plan'))
}

export function dayForDayNumber(parsed: ParsedBlockTab, dayNumber: number): BlockDay | null {
  return parsed.days.find((d) => d.dayNumber === dayNumber) ?? null
}
