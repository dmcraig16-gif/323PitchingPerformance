import { ANDREW } from '@/lib/athlete'
import { batchGetValues, listSheetTitles } from '@/lib/sheets'
import { parseSeasonMap, seasonMapWeek } from '@/lib/parse/seasonMap'
import { parseBlockTab, blockTabCoversWeek, dayForDayNumber } from '@/lib/parse/blockTab'
import { parsePlan } from '@/lib/parse/plan'
import { currentWeek, todayInTimezone, dayNumberForWeekday } from '@/lib/week'

// M1's acceptance page: dumps the parsed Season Map, current week,
// active block, and today's session as JSON — nothing here is UI the
// athlete ever sees, it's the foundation the Today screen (M2) builds on.

const SEASON_MAP_RANGE = "'Season Map'!A6:H35"
// A generous overfetch — a block tab's real extent isn't known ahead of
// discovery, and a single range read is cheap next to a second API call
// to look up its exact dimensions first.
const BLOCK_TAB_RANGE = 'A1:Z300'

async function loadDebugData() {
  if (!ANDREW.spreadsheetId) {
    return { error: 'Missing ANDREW_SPREADSHEET_ID env var — see .env.example.' }
  }

  const today = todayInTimezone(ANDREW.timezone)
  const week = currentWeek(ANDREW.programStart, today)
  const dayNumber = dayNumberForWeekday(today)

  let titles: string[]
  try {
    titles = await listSheetTitles(ANDREW.spreadsheetId)
  } catch (err) {
    return { error: `Couldn't list tabs: ${(err as Error).message}` }
  }

  const blockTabTitles = titles.filter((t) => t.startsWith('Block ') && t !== 'Blocks 2-6 Plan')

  let seasonMapRows: unknown[][] = []
  try {
    const seasonMapData = await batchGetValues(ANDREW.spreadsheetId, [SEASON_MAP_RANGE], { unformatted: true })
    seasonMapRows = seasonMapData[SEASON_MAP_RANGE] ?? []
  } catch (err) {
    return { error: `Couldn't read Season Map: ${(err as Error).message}` }
  }
  const seasonMap = parseSeasonMap(seasonMapRows)
  const thisWeekRow = seasonMapWeek(seasonMap, week)

  let activeBlockTitle: string | null = null
  let activeBlock = null
  for (const title of blockTabTitles) {
    let grid: unknown[][]
    try {
      const range = `'${title}'!${BLOCK_TAB_RANGE}`
      const data = await batchGetValues(ANDREW.spreadsheetId, [range])
      grid = data[range] ?? []
    } catch (err) {
      return { error: `Couldn't read tab "${title}": ${(err as Error).message}` }
    }
    const parsed = parseBlockTab(grid)
    if (blockTabCoversWeek(parsed, week)) {
      activeBlockTitle = title
      activeBlock = parsed
      break
    }
  }

  let todaySession = null
  if (activeBlock && dayNumber != null) {
    const day = dayForDayNumber(activeBlock, dayNumber)
    if (day) {
      todaySession = {
        dayNumber: day.dayNumber,
        weekday: day.weekday,
        title: day.title,
        exercises: day.exercises.map((ex) => ({
          slot: ex.slot,
          name: ex.name,
          cue: ex.cue,
          demo: ex.demo,
          plan: parsePlan(ex.plansByWeek[week]),
          log: ex.logsByWeek[week] ?? '',
          notes: ex.notes,
        })),
      }
    }
  }

  return {
    today: today.toISOString().slice(0, 10),
    currentWeek: week,
    dayNumber,
    thisWeekRow,
    blockTabTitles,
    activeBlockTitle,
    todaySession,
  }
}

export default async function DebugPage() {
  const data = await loadDebugData()

  return (
    <main className="min-h-screen bg-brand-white p-6">
      <h1 className="font-heading text-3xl mb-1">323 Training App — Debug</h1>
      <p className="text-sm text-black/60 mb-6">
        Milestone 1: parsed Season Map, current week, active block, and today&apos;s session.
      </p>
      <pre className="bg-black text-white text-xs rounded-xl p-4 overflow-x-auto">
        {JSON.stringify(data, null, 2)}
      </pre>
    </main>
  )
}
