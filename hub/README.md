# 323 Hub

A phone-first web app on top of the **323 Command Center** Google Sheet.
The sheet is the source of truth. The app reads it and writes back to it. There is no other database.

Stack: Google Apps Script web app (HTML Service, plain JS), pushed with `clasp`.
Deployed as **Execute as: me**, **Access: only myself**.

## Files

```
hub/
  src/                  everything clasp pushes
    appsscript.json     manifest: timezone, web app access, scopes, no exception logging
    Config.js           spreadsheet ID, tab names, header names used in logic, form settings
    Data.js             reads tabs into objects keyed by header, cache, Scorecard and Settings readers
    Write.js            safe writes: lock, formula check, append, timestamped notes
    Api.js              Home, add forms (getHome, setTaskDone, getFormSpec, addRecord)
    Todo.js             To-Do (getTodos, updateTask, moveTasks)
    Clients.js          Clients and profile (getClients, getClient, updateClient, addClientNote)
    Leads.js            Pipeline (getLeads, updateLead, addLeadNote)
    Money.js            Money, Content, Wins, Scorecard history, generic row editor
    Code.js             doGet, include_, owner check
    Index.html          page shell, bottom tabs, includes every screen
    Styles.html         CSS (brand colors, dark mode)
    App.html            core: routing, formatting, add forms, Home, More menu, day rollover
    Charts.html         small SVG bar and line charts with hover and a table view
    ViewTodo.html       To-Do screen
    ViewClients.html    Clients list and profile
    ViewLeads.html      Leads pipeline and lead profile
    ViewMoney.html      Money screen
    ViewMore.html       Content, Wins, Scorecard history, shared row editor
  dev/                  local only, never pushed
    mock.js             stand-ins for SpreadsheetApp, CacheService, LockService, Utilities, Session
    fixture.js          fake Command Center with made-up names
    test.js             server tests (31 checks)
    preview.js          builds a single HTML file that runs the app in a normal browser
```

## Screens

- **Home:** Scorecard numbers, this week, today's tasks with checkboxes, needs attention, quick add.
- **To-Do:** Today, Tomorrow, This week, Overdue. Tap the box to check off, tap the text to edit or move.
  "Move all to today" clears Overdue. The app rolls over to the new day on its own after midnight
  (Boise time) and refreshes when you come back to it.
- **Clients:** search and filters, DDC and Guinea Pig tags, Paid / Due / Overdue badges. Profile has quick
  actions, term progress, onboarding checklist, payments, wins, timestamped notes, and every field editable.
- **Leads:** columns by stage on desktop (drag or use the stage menu), stacked by stage on a phone.
  Stage changes and notes set Last touch to today. Moving to Won opens a prefilled Add client form;
  nothing is written until you tap Save.
- **Money:** cards for this month, 323 vs DDC, cash by month chart, payments and expenses with Log buttons.
- **More:** Content (list, calendar, stale pillar), Wins (consent shown on every win), Scorecard history.

## Data rules the code follows

- Columns are found by header name from row 1 at runtime. A table ends at the first blank header,
  so summary blocks to the right (Expenses, Money) are ignored.
- A column is "computed" if its header is a formula or row 2 holds an `ARRAYFORMULA`. Computed columns
  are never written. Any single cell holding a formula is also skipped.
- New rows go right after the last row with real content. Rows that only hold unchecked checkboxes
  count as empty, so they get filled in order.
- A row counts only if a key column has a value (see `KEY_HEADERS` in `Config.js`). Blank and
  half-filled rows are skipped in lists and counts.
- Every write takes a script lock, and add forms send a request ID so a double tap writes once.
- Reads are cached for 60 seconds. Any write clears the cache. The refresh button skips the cache.
- Scorecard and Settings values are found by their label text, not by cell address.
- Text that starts with `=`, `+`, `-` or `@` is stored as text, never as a formula.

## First-time setup (once, on your computer)

You need Node.js 18 or newer. The commands below are for clasp 2.4.2 (clasp 3 renamed them).

```bash
npm install -g @google/clasp@2.4.2
```

```bash
clasp login
```

Log in as **323mperformance@gmail.com**. Then turn on the Apps Script API for that account at
https://script.google.com/home/usersettings.

From the `hub` folder, create the Apps Script project:

```bash
cd hub && clasp create --type standalone --title "323 Hub" --rootDir src
```

That writes `hub/.clasp.json` with your script ID. It is ignored by git.
`clasp create` also overwrites `src/appsscript.json` with a default one. Put ours back:

```bash
git checkout src/appsscript.json
```

## Deploy a test version

```bash
clasp push -f
```

```bash
clasp open
```

In the editor: **Deploy > Test deployments > Web app**. Copy the URL that ends in `/dev`.
The first time, run any function (for example `getSheetUrl`) from the editor and accept the
permission prompt. The `/dev` URL always runs the latest pushed code.

## Deploy the real version (the one on your home screen)

First time, in the editor: **Deploy > New deployment > Web app**.
Execute as **Me**, Who has access **Only myself**. Copy the URL that ends in `/exec`.

To redeploy later without changing the URL:

```bash
clasp push -f
```

```bash
clasp deployments
```

```bash
clasp deploy -i DEPLOYMENT_ID -d "short note"
```

Use the deployment ID from `clasp deployments` (not the `@HEAD` one).

**Add to home screen.** iPhone: open the `/exec` URL in Safari, Share, Add to Home Screen.
Android: open it in Chrome, menu, Add to Home screen.

## Test locally (no Google account needed)

```bash
node hub/dev/test.js
```

```bash
node hub/dev/preview.js /tmp/hub-preview.html
```

Open the preview file in a browser. It runs the real front end and server code against fake data.

## Add a new screen

1. Server: add a public function in `Api.js` (no trailing underscore). Start it with `assertOwner_();`.
   Read with `readTab_(CONFIG.TABS.X)`. Write with `updateRow_` or `appendRow_` from `Write.js`.
2. If the screen adds rows, add the tab to `CONFIG.ADD_FORMS` and its key column to `KEY_HEADERS`.
   The form builds itself from the live headers.
3. Front end: in `App.html`, add a function and register it in `views`. Call the server with
   `api('yourFunction', args)`. Escape sheet text with `esc()`. Format dates with `fmtDate()`.
4. If it needs a bottom tab, add a button to `#tabbar` in `Index.html`. Otherwise add it to `renderMore()`.
5. Add a test in `dev/test.js`, run it, then `clasp push -f`.

## Privacy

- Only the owner account can open the app. Every server function also checks the signed-in email.
- Nothing personal is logged. `exceptionLogging` is `NONE` and the code has no `console.log` of sheet data.
- No analytics or trackers. The only external requests are Google Fonts.
- The source in this folder holds no athlete data. Test data in `dev/` is made up.

## Mac app (Claude artifact)

`mac/` builds a second version of the Hub that runs as a Claude artifact and installs as a Mac app from
the Claude desktop app. It uses the same `src/` code. A bridge (`mac/bridge.js`) stands in for
SpreadsheetApp: it reads each tab through your Google Sheets connector (`get_spreadsheet`), runs the
same server functions locally, and writes changed cells back with `update_values`, one call per row,
sending null for every cell it leaves alone so formulas are never touched. Before every write it re-reads
the tabs involved, and writes run one at a time.

- Build: `node hub/mac/build.js` writes `hub/mac/323-hub.html`. Publish that file as the artifact.
- Test with fake data: `node hub/mac/build.js --dev /tmp/mac-dev.html` and open it in a browser.
- The app refreshes from the sheet every minute while it is open (not while you are typing or have a form open).
- Menu shortcuts: Cmd+1 to Cmd+5 switch screens, Cmd+R refreshes, Cmd+Shift+T/L/P/E/W add a task, lead,
  payment, expense or win. The Dock badge shows how many items are overdue.
