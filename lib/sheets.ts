import { google } from 'googleapis'

// Server-only Google Sheets client. The service account key never reaches
// the browser — every caller of this module must run in a route handler,
// server action, or server component.

let authClient: InstanceType<typeof google.auth.JWT> | null = null

function getAuth() {
  if (authClient) return authClient

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const rawKey = process.env.GOOGLE_PRIVATE_KEY
  if (!email || !rawKey) {
    throw new Error(
      'Missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_PRIVATE_KEY env vars — see .env.example.',
    )
  }

  authClient = new google.auth.JWT({
    email,
    key: rawKey.replace(/\\n/g, '\n'),
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive.file',
    ],
  })
  return authClient
}

function sheetsClient() {
  return google.sheets({ version: 'v4', auth: getAuth() })
}

type ValueGrid = unknown[][]

type CacheEntry = { data: Record<string, ValueGrid>; expiresAt: number }

const CACHE_TTL_MS = 60_000
const readCache = new Map<string, CacheEntry>()

function cacheKey(spreadsheetId: string, unformatted: boolean, ranges: string[]) {
  return `${spreadsheetId}:${unformatted ? 'U' : 'F'}:${ranges.join('|')}`
}

// Reads multiple ranges from one spreadsheet in a single API call, cached
// for 60 seconds per (spreadsheet, ranges, render-option) combination.
// Numbers/dates should be read UNFORMATTED_VALUE; display text that
// depends on cell formatting (like "Nov 2 - Nov 8") should be read
// FORMATTED_VALUE — pass `unformatted` per the field you're reading.
export async function batchGetValues(
  spreadsheetId: string,
  ranges: string[],
  { unformatted = false }: { unformatted?: boolean } = {},
): Promise<Record<string, ValueGrid>> {
  const key = cacheKey(spreadsheetId, unformatted, ranges)
  const cached = readCache.get(key)
  if (cached && cached.expiresAt > Date.now()) return cached.data

  const sheets = sheetsClient()
  const res = await sheets.spreadsheets.values.batchGet({
    spreadsheetId,
    ranges,
    valueRenderOption: unformatted ? 'UNFORMATTED_VALUE' : 'FORMATTED_VALUE',
  })

  const data: Record<string, ValueGrid> = {}
  for (const vr of res.data.valueRanges ?? []) {
    if (vr.range) data[vr.range] = vr.values ?? []
  }

  readCache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS })
  return data
}

// Lists every tab name in the spreadsheet — used to discover which tabs
// are programming tabs (`Block N ...`) without hardcoding tab names.
export async function listSheetTitles(spreadsheetId: string): Promise<string[]> {
  const sheets = sheetsClient()
  const res = await sheets.spreadsheets.get({ spreadsheetId, fields: 'sheets.properties.title' })
  return (res.data.sheets ?? []).map((s) => s.properties?.title).filter((t): t is string => !!t)
}

// Clears every cached read for a spreadsheet — call right after a write
// so the next read reflects it instead of serving a stale cache entry.
export function invalidateCache(spreadsheetId: string) {
  for (const key of readCache.keys()) {
    if (key.startsWith(`${spreadsheetId}:`)) readCache.delete(key)
  }
}
