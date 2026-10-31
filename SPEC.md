# 323 Training App: Build Spec

Hand this file to Claude Code. Put it in the repo root as `SPEC.md`, then say:
"Read SPEC.md. Build Milestone 1 only. Stop and show me before moving on."

---

## 1. What we're building

A mobile-first web app that sits on top of an athlete's Google Sheet workbook. The Sheet stays the single source of truth. The app is a better window into it.

- The coach (David) writes all programming in Google Sheets. The app never edits programming.
- The athlete uses the app to see today's session, log sets, do a morning check-in, and see progress graphs.
- Every log the athlete enters is written straight back into the Sheet, in the exact cells the athlete would have typed in by hand.
- The coach gets a dashboard showing check-ins, hip flags, compliance, and trends.

If the app disappeared tomorrow, the Sheet would still be complete and usable. That's the rule.

First athlete: Andrew Craig. The design has to support more athletes later, each with their own workbook built from the same template.

---

## 2. Stack

- Next.js (App Router) with TypeScript
- Tailwind CSS
- `googleapis` (Google Sheets API v4), server-side only
- Recharts for graphs
- zod for validating parsed sheet data
- Deployed on Vercel
- PWA manifest so the athlete can add it to their phone's home screen

There's no separate database. The Google Sheet is the database.

---

## 3. Google Sheets access setup

1. Create a Google Cloud project and enable the Google Sheets API.
2. Create a service account and download its JSON key.
3. Share each athlete workbook with the service account email as **Editor**.
4. Store credentials in env vars:
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `GOOGLE_PRIVATE_KEY` (handle escaped `\n`)
5. All Sheets calls happen in server code: route handlers or server actions. The key never reaches the browser.

**Use a test copy during development.** Duplicate the live workbook as "Andrew Craig TEST" and point dev at it. Never develop against the live sheet.

Performance:
- Use `spreadsheets.values.batchGet` to read all needed ranges in one call.
- Cache reads for 60 seconds. Revalidate right after any write.
- Use `valueRenderOption: UNFORMATTED_VALUE` for numbers and dates, and `FORMATTED_VALUE` where display text matters.
- Write with `spreadsheets.values.update` and `valueInputOption: USER_ENTERED`. This writes values only and never touches formatting.

---

## 4. The hub model: template, roster, athlete workbooks

This is the core idea. Every athlete gets their own Google Sheet workbook copied from one master template. The coach creates and edits programming directly in those sheets. The app reads them and the dashboards update from them. The app is a lens. The sheets are the engine.

### 4.1 Three kinds of sheets
1. **Master Template**: one workbook with the exact structure in section 5, holding blank or sample programming. Env: `TEMPLATE_SPREADSHEET_ID`.
2. **Roster sheet**: one workbook, one tab `Athletes`, acting as the app's registry. Env: `ROSTER_SPREADSHEET_ID`.
3. **Athlete workbooks**: one per athlete, copied from the template.

### 4.2 Roster tab `Athletes` (header row 1)

| Col | Field |
|---|---|
| A | athleteId (slug, like `andrew-craig`) |
| B | name |
| C | spreadsheetId |
| D | programStart (date, Monday of Week 1) |
| E | timezone (like `America/Boise`) |
| F | status (`active`, `paused`, `alumni`) |
| G | pinHash (bcrypt hash, never plain text) |
| H | parentEmail (optional, for future parent view) |
| I | createdAt |

The app loads the roster on every coach request and caches it for 60 seconds. Adding an athlete means adding a row, done by the app or by hand.

### 4.3 Settings tab in each athlete workbook

Add a tab named `Settings` to the Master Template:

| Cell | Field |
|---|---|
| B2 | Athlete name |
| B3 | Program start (date) |
| B4 | Timezone |
| B5 | Position / team |

Every date in the workbook derives from `Settings!B3`:
- `Daily Log!A6` = `=Settings!B3`, then `=A6+1` down
- `Season Map!B` date ranges = formulas from `Settings!B3 + (week-1)*7`

That way one cell sets up a new athlete's whole calendar. When the app and the sheet disagree, the sheet wins.

### 4.4 "Add athlete" flow (coach only)
1. The coach enters name, program start (must be a Monday), timezone, position, and PIN.
2. The server copies the Master Template with the **Drive API** (`files.copy`) into the shared 323 Drive folder (`ATHLETES_FOLDER_ID`). Name: `{Name} | {Season} Program`.
3. It writes the Settings tab values into the new workbook.
4. It appends a row to the Roster with the bcrypt-hashed PIN.
5. It shows an "Open in Sheets to build program" button.

The service account needs Editor access to the template, the roster, and the athletes folder. A shared drive the service account belongs to is the cleanest setup. Scopes: `https://www.googleapis.com/auth/spreadsheets` and `https://www.googleapis.com/auth/drive.file` (or `drive` if copying into a shared drive requires it).

### 4.5 Editing workflow
- The coach builds and edits blocks in Google Sheets: adds a new `Block N ...` tab following the format, changes plan cells, adds exercises.
- The app picks up changes on the next read (60-second cache). The coach dashboard has a "Refresh" button that busts the cache.
- The app never edits programming. One place to program, no sync conflicts.

### 4.6 Andrew's existing workbook
Andrew's live workbook (`17WQclMIQrHAnB-OIgP-lJ3cMKOt0ucY4VJ_9t6gU0yA`) was built before the Settings tab existed. For M1, hardcode his programStart as `2026-11-02`. Before M7, add a Settings tab to his workbook and switch his date formulas to it so he matches the template.

### 4.7 Auth (keep it simple)
- Athletes log in with a 4 to 6 digit PIN that sets an httpOnly signed cookie.
- The coach logs in with a separate coach password from env (`COACH_PASSWORD`).
- An athlete can only ever load their own spreadsheetId. Enforce this on the server, not in the UI. Future athletes are minors, so this is non-negotiable.

---

## 5. The workbook: exact structure

All row and column references are 1-indexed, as you'd see them in Sheets. Rows 1 to 3 on every tab are a black title band. Ignore them.

### 5.1 `Season Map`
- Header: row 5. Data: rows 6 to 35 (Weeks 1 to 30).

| Col | Field | Notes |
|---|---|---|
| A | week | number 1 to 30 |
| B | dates | text, like "Nov 2 - Nov 8" |
| C | block | "1. On-ramp", "2. Hypertrophy I", or "Deload" |
| D | where | text |
| E | sessionsPlanned | text: "4", "3", "3-4", "0-2". Parse the first number |
| F | focus | text |
| G | targetBW | number |
| H | avgBW | formula. **Read only.** |

**Current week** = `floor((today - programStart) / 7) + 1`. Clamp to 1 to 30. Use the athlete's timezone (America/Boise for now; make it a config field).

### 5.2 Block tabs (`Block 1 On-ramp`, and later `Block 2 ...` through `Block 6 ...`)

Any tab whose name starts with `Block ` and is **not** `Blocks 2-6 Plan` is a programming tab. Each has the same structure:

- A **day bar** row: column A text starts with `DAY`, like `DAY 1  |  MONDAY  |  LOWER A: ACCEPT AND BUILD`. Split on `|` to get day number, weekday, and title.
- The next row is the **header row**: column A = `Slot`.
- Below it are **exercise rows**, until the first row where column B is empty.

Columns:

| Col | Field |
|---|---|
| A | slot: `Prep`, `A1`, `A2`, `B1`, `B2`, `C1`, `C2`, `D1`, `D2`, `D3` |
| B | exercise name |
| C | coaching cue |
| D onward | alternating **Plan** and **Log** columns, one pair per week |
| last | `Notes / hip feel` |

**Do not hardcode week columns.** Read the header row. Each label looks like `Wk 1 Plan\nNov 2` or `Wk 2 Log`. Parse the week number with `/Wk\s*(\d+)\s*(Plan|Log)/i`. Week numbers are **global** (Block 2 starts at Wk 5), so map global week to column directly.

To find this week's session: scan the block tabs for the header that contains `Wk {currentWeek} Plan`. That tab is the active block.

Block 1 today: day bars in rows 5, 21, 37, 53. Header rows 6, 22, 38, 54. Plan/Log pairs: D/E = Wk 1, F/G = Wk 2, H/I = Wk 3, J/K = Wk 4. L = Notes. Use this only as a test fixture. The parser has to discover it, not assume it.

**Plan cell values to handle:**
- `3x8 @6`: 3 sets, 8 reps, RPE 6
- `3x8 ea @6-7`: per side, RPE range
- `3x10 ea +load`: add load from last week
- `3x30s ea BW`, `3x20s`: timed holds, so log seconds, not load
- `3x30yd ea`: carry distance
- `2x6 ea`, `60s ea`, `x10`, `3 ea way`: prep and mobility, shown as a checklist
- `3x5 @8 BASELINE`: flag as a test set. Highlight it and copy the result to the Testing tab (see 5.4)
- `Travel`: the session isn't happening this week. Show the Travel Session tab instead
- empty: skip

Write a `parsePlan(text)` function that returns:
```ts
{ sets: number | null, reps: number | null, seconds: number | null,
  distanceYd: number | null, perSide: boolean, rpe: string | null,
  bodyweight: boolean, addLoad: boolean, baseline: boolean,
  travel: boolean, raw: string }
```
Always keep `raw` and always show it in the UI. If parsing fails, fall back to showing raw text with a free-text log box.

**Log cell format (what the app writes):**
- Load sets: `35x8, 35x8, 40x8` (load x reps, comma separated, one per set)
- Bodyweight sets: `BWx8, BWx8`
- Timed holds: `30s, 30s, 35s`
- Carries: `50x30yd, 50x30yd` (load x distance)
- Prep rows: `done`

The athlete may also type in the Sheet by hand, so the reader has to be forgiving. Parse with `/(BW|\d+(?:\.\d+)?)\s*x\s*(\d+)/gi` for load sets and `/(\d+)\s*s/gi` for holds. Ignore anything else, and never crash on bad input.

**Notes column (last column):** it's shared across weeks. When the athlete adds a note, **append** `Wk{n}: {text}` on a new line inside the cell. Never overwrite what's there.

### 5.3 `Daily Log`
- Header: row 5. Data: rows 6 to 215 (Nov 2, 2026 to May 30, 2027, one row per day).

| Col | Field | Write? |
|---|---|---|
| A | date | formula. **Never write** |
| B | day | formula. **Never write** |
| C | week | formula. **Never write** |
| D | bodyweight (lb) | write |
| E | sleep (hrs) | write |
| F | hip feel, 0 to 10 pain | write |
| G | energy, 1 to 5 | write |
| H | lift done | write (`Lower A`, `Upper A`, `Lower B`, `Upper B`, `Travel`, `Off`) |
| I | throwing | write (free text) |
| J | notes | write |

Find today's row as `6 + (today - programStart in days)`. Verify by reading column A before writing. If it doesn't match, search column A for the date and refuse to write on a miss.

### 5.4 `Testing`
- Header: row 5. Data: rows 6 to 18.
- Columns: A test, B how, C baseline, D Wk 14, E Wk 26, F Wk 30.
- Row 6 (bodyweight) C to F are formulas. **Read only.**
- When a `BASELINE` set is logged, write the best set to the matching test row in column C. Mapping: "High-Handle Trap Bar Deadlift" goes to the "Trap bar DL" row, and "30° Incline DB Press" goes to the "Incline DB press" row. Match on a keyword map in code, not exact strings.
- Give the coach a simple form to enter the other test results (hip IR/ER, jumps, Copenhagen, pull-ups).

### 5.5 `Travel Session`
- Header: row 5. Data: rows 6 to 14. Columns: A #, B exercise, C dose, D cue.
- Read only. Show it when the plan says `Travel` or the Season Map block is `Deload`.

### 5.6 `Exercise Library`
- Header: row 5. Data: row 6 to the first empty row in column A.
- Columns: A exercise, B day, C cue, D demo link.
- Join to block exercises by name (case-insensitive, trimmed). If a demo link exists, show a play button that opens it.

### 5.7 `Start Here` and `Blocks 2-6 Plan`
- Static reference. Render read-only. Pull the hip rule text from Start Here: the three rows under the `THE HIP RULE` bar.

### Write safety rules (enforce in one `sheetsWrite()` wrapper)
1. Allowed write targets only: block **Log** columns, block **Notes** column, Daily Log D to J, Testing C to F on rows 7 to 18.
2. Before any write, read the target cell's formula (`valueRenderOption: FORMULA`). If it starts with `=`, refuse.
3. Never write to header rows, day bars, Plan columns, or Season Map.
4. Log every write (athlete, tab, cell, old value, new value, timestamp) to the server console. Stretch goal: append to a hidden `App Log` tab.

---

## 6. Athlete screens (mobile first)

### 6.1 Today (home)
- The header shows week number, block name, and day title, with a faith line at the bottom: "For the Lord, not for man. Colossians 3:23"
- Map weekdays to days: Mon = Day 1, Tue = Day 2, Thu = Day 3, Fri = Day 4. Wed, Sat, and Sun show a "Throwing / recovery day" card plus check-in. Add a "Do a different day" picker so a missed Monday can be done Tuesday.
- If the morning check-in isn't done, show a "Morning check-in" card at the top.
- Group exercises by slot letter: Prep (checklist), A, B, C, D.
- Each exercise card shows the name, this week's plan (raw text, big), the cue (collapsible), the demo button, and **last week's log** for that exercise underneath as a reference.
- Logging inputs come from `parsePlan`:
  - Load sets: one row per set with load and reps steppers, prefilled from last week's load
  - Timed: seconds per set
  - Prep: one checkbox
- Save on blur per exercise, not per keystroke. Show a "Saved" tick.
- At the bottom, a session notes / hip feel box appends to the Notes column. Also add a "Mark session complete" button that writes the session name to Daily Log column H for today.

### 6.2 Morning check-in
- Bodyweight (number), sleep (number, 0.5 steps), hip feel (0 to 10 slider), energy (1 to 5 taps), throwing today (text), notes.
- Write to today's Daily Log row.
- **Hip rule:** if hip feel is above 3, show a red full-width card with the three hip-rule lines from Start Here and a "Text David" button (`sms:` link to coachPhone with a prefilled message: "Hip at {n}/10 today. {notes}"). Flag it for the coach dashboard.

### 6.3 Progress
- **Bodyweight:** daily points, weekly average line, and Target BW line from Season Map G. Add a note: "Goal 200 lb by September."
- **Hip feel:** last 30 days as a bar chart, with a red line at 3.
- **Sleep:** last 30 days.
- **Lifts:** pick an exercise and see the top set load per week across all block tabs. Show estimated 1RM with Epley (`load * (1 + reps/30)`) as a second line, labeled "estimate".
- **Consistency:** sessions logged vs planned per week (planned = Season Map E, logged = count of Daily Log H entries that week).

### 6.4 Season
- A 30-week vertical timeline from Season Map with the current week highlighted, deloads in black, and blocks color-banded.

### 6.5 Tests
- Testing tab values in a clean table, with change from baseline in green or red.

---

## 7. Coach screens (David)

### 7.1 Roster dashboard
One card per athlete:
- Last check-in date (red if not today by 11am athlete time)
- Hip feel: latest score, plus a 7-day sparkline. Red badge if any day in the last 7 is above 3
- This week: sessions logged / planned
- Bodyweight: current weekly average vs target, with the difference
- The 5 most recent notes (from Daily Log J and block Notes)

### 7.2 Athlete detail
- All athlete progress charts.
- A "This week" grid: each day's planned exercises with logged values side by side, so the coach can review in two minutes.
- Test entry form (writes to Testing).
- An "Open in Sheets" button that deep-links to the workbook.

The coach doesn't edit programming here. Programming happens in Sheets.

---

## 8. Brand and design

- Colors: black `#000000`, blue `#0289EB`, red `#FF0707` (alerts and hip flags only), white `#FFFFFF`. Light blue tint `#E6F3FD` for input fields.
- Type: Bebas Neue or Anton for headings, Inter for body.
- Feel: clean, dark header, white cards, big tap targets (minimum 44px), and inputs usable with sweaty thumbs between sets.
- Copy voice: direct, coach-like, short sentences. No hype. No em dashes.
- Every screen works one-handed at 375px wide first.

---

## 9. Project structure

```
/app
  /(athlete)/today, /checkin, /progress, /season, /tests
  /(coach)/coach, /coach/[athleteId]
  /api/... (route handlers if needed)
/lib
  sheets.ts        // auth client, batchGet, sheetsWrite() with safety rules
  parse/
    seasonMap.ts
    blockTab.ts    // finds day bars, headers, week columns, exercise rows
    plan.ts        // parsePlan()
    log.ts         // parseLog(), formatLog()
    dailyLog.ts
    testing.ts
  week.ts          // currentWeek(), todayRow(), weekday -> day mapping
  roster.ts        // load roster, add athlete, verify PIN
  template.ts      // copy template via Drive API, write Settings
/tests             // vitest unit tests for every parser
```

---

## 10. Milestones (build in order, stop after each)

**M1: Read-only foundation**
- Service account connection, batchGet, and all parsers with unit tests, using fixture data copied from the real sheet.
- A debug page that dumps the parsed Season Map, current week, active block, and today's session as JSON.
- Acceptance: on Mon Nov 2, 2026, it shows Week 1, Block 1, Day 1 Lower A, with all 13 rows (5 prep + 8 exercises) and correct Wk 1 plan text.

**M2: Athlete Today screen plus logging**
- The Today screen, set logging, write-back to Log columns, notes append, and session complete.
- Acceptance: logging 3 sets of Goblet Box Squat in the app shows `35x8, 35x8, 35x8` in cell E14 of the TEST sheet, formatting unchanged.

**M3: Morning check-in plus hip rule**
- Acceptance: a check-in writes to the correct Daily Log row. A hip score of 4 shows the red card and the SMS link.

**M4: Progress plus Season plus Tests screens**

**M5: Coach dashboard plus athlete detail**

**M6: Auth, PWA, deploy to Vercel, point at the live sheet**

**M7: Template and roster hub**
- Roster sheet as registry, the "Add athlete" flow copying the Master Template, the Settings tab driving dates, and the coach roster loading from the Roster sheet instead of code.
- Acceptance: adding "Test Athlete" with start Mon Jan 4, 2027 creates a new workbook in the athletes folder whose Daily Log starts Jan 4 and whose Season Map dates line up. They show up on the coach dashboard and can log in with their PIN.

---

## 11. Edge cases to handle

- A future block tab exists but isn't filled in yet: show "Coach is building this block" instead of crashing.
- Week has no session for today: show the throwing/recovery card.
- The athlete edits the Sheet by hand at the same time: re-read the cell before writing a log, and if it changed since load, ask before overwriting.
- Plan says `Travel`: show the Travel Session tab.
- Deload weeks: show a deload banner.
- Sheets API failure or rate limit: show a clear error and keep unsaved inputs in local state. Never silently drop a log.
- Dates and timezones: all "today" logic uses the athlete's configured timezone, not the server's.

---

## 12. Out of scope (for now)

- Editing programs in the app
- Throwing program logging (separate tab later)
- Video upload
- Payments, Trainerize sync, parent accounts
- Multiple coaches (keep the roster structure open to a `coachId` column later)
