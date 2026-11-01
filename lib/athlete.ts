// M1 hardcodes the one athlete this app currently serves, per SPEC.md
// §4.6 — Andrew's workbook predates the Settings tab, so his
// programStart is hardcoded here until M7 adds Settings-tab-driven
// dates and the Roster-sheet-backed multi-athlete system.
export const ANDREW = {
  name: 'Andrew Craig',
  spreadsheetId: process.env.ANDREW_SPREADSHEET_ID ?? '',
  programStart: new Date(2026, 10, 2), // Nov 2, 2026
  timezone: 'America/Boise',
}
