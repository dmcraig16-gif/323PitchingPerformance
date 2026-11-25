/**
 * Social tab: weekly Instagram check-in for both accounts.
 * Layout: a "Snapshot" block (label in column A, one column per account), then a "Weekly log"
 * with two header rows: account names over groups of columns, then the column names.
 * Column names repeat per account, so a column is known by "account|header" (e.g. "@dc.throws|Followers").
 * Gained, Growth % and the Both accounts columns are formulas and are never written.
 */

function socialLayout_(grid) {
  var snap = findCell_(grid, 'Snapshot', { exact: true });
  var log = findCell_(grid, 'Weekly log', { exact: true });
  var out = { accounts: [], snapshot: [], columns: [], headerRow: -1, rows: [] };

  if (snap) {
    var limit = log ? log.r : grid.length;
    for (var c = snap.c + 1; c < grid[snap.r].length && String(grid[snap.r][c]).trim(); c++) out.accounts.push(String(grid[snap.r][c]).trim());
    for (var r = snap.r + 1; r < limit; r++) {
      var label = String(grid[r][snap.c] || '').trim();
      if (!label) break;
      var vals = {};
      out.accounts.forEach(function (a, i) { vals[a] = grid[r][snap.c + 1 + i]; });
      out.snapshot.push({ label: label, values: vals });
    }
  }

  if (log) {
    // Find the column-name row: the first row below "Weekly log" whose first cell starts with "Week of".
    var hr = -1;
    for (var rr = log.r + 1; rr < Math.min(grid.length, log.r + 5); rr++) {
      if (/^week of/i.test(String(grid[rr][log.c] || '').trim())) { hr = rr; break; }
    }
    if (hr >= 0) {
      out.headerRow = hr;
      var group = '';
      for (var cc = log.c; cc < grid[hr].length; cc++) {
        var name = String(grid[hr][cc] || '').trim();
        if (!name) break;
        var g = hr > 0 ? String(grid[hr - 1][cc] || '').trim() : '';
        if (g) group = g;
        var isGroup = cc !== log.c && group && !/^notes$/i.test(name);
        out.columns.push({ index: cc, name: name, group: isGroup ? group : '', key: isGroup ? group + '|' + name : name });
      }
    }
  }
  return out;
}

function getSocial(fresh) {
  assertOwner_();
  var tz = sheetTz_();
  var sh = sheet_(CONFIG.TABS.SOCIAL);
  var grid = sh.getDataRange().getValues().map(function (row) { return row.map(function (v) { return serialize_(v, tz); }); });
  var L = socialLayout_(grid);
  var weekCol = L.columns[0];
  var followerCols = L.columns.filter(function (c) { return /^followers$/i.test(c.name) && c.group; });
  var rows = [];
  if (L.headerRow >= 0) {
    for (var r = L.headerRow + 1; r < grid.length; r++) {
      var logged = followerCols.some(function (c) { return typeof grid[r][c.index] === 'number'; });
      if (!logged) continue;
      var o = { row: r + 1 };
      L.columns.forEach(function (c) { o[c.key] = grid[r][c.index]; });
      rows.push(o);
    }
  }
  return {
    today: todayStr_(),
    thisMonday: mondayOf_(todayStr_()),
    accounts: L.accounts.filter(function (a) { return /^@/.test(a); }),
    allAccounts: L.accounts,
    snapshot: L.snapshot,
    columns: L.columns,
    weekKey: weekCol ? weekCol.key : 'Week of (Monday)',
    rows: rows
  };
}

/**
 * Log one week. values: { 'Week of (Monday)': 'YYYY-MM-DD', '@acct|Followers': 218, ..., Notes: '...' }.
 * Writes into the row for that week if it exists, else the first empty row after the last logged week.
 * Formula cells (Week of after the first row, Gained, Growth %, Both accounts) are skipped.
 */
function addSocialCheckin(values, requestId) {
  assertOwner_();
  return once_(requestId, function () {
    return withLock_(function () {
      var sh = sheet_(CONFIG.TABS.SOCIAL);
      var tz = sheetTz_();
      var raw = sh.getDataRange().getValues();
      var grid = raw.map(function (row) { return row.map(function (v) { return serialize_(v, tz); }); });
      var L = socialLayout_(grid);
      if (L.headerRow < 0) throw new Error('Could not find the Weekly log on the Social tab.');
      var weekCol = L.columns[0];
      var followerCols = L.columns.filter(function (c) { return /^followers$/i.test(c.name) && c.group; });
      var week = asYmd_(values[weekCol.key]) || mondayOf_(todayStr_());

      var target = -1, lastLogged = L.headerRow;
      for (var r = L.headerRow + 1; r < grid.length; r++) {
        var logged = followerCols.some(function (c) { return typeof grid[r][c.index] === 'number'; });
        if (!logged) continue;
        lastLogged = r;
        if (asYmd_(grid[r][weekCol.index]) === week) target = r;
      }
      var existing = target >= 0;
      if (!existing) target = lastLogged + 1;
      var rowNum = target + 1;
      if (rowNum > sh.getMaxRows()) throw new Error('The Social tab is full. Add rows at the bottom of the Weekly log, then try again.');

      var formulas = sh.getRange(rowNum, 1, 1, Math.max(1, L.columns[L.columns.length - 1].index + 1)).getFormulas()[0];
      var written = [], skipped = [];
      L.columns.forEach(function (c) {
        if (!(c.key in values)) return;
        var v = values[c.key];
        if (v === '' || v === null || v === undefined) return;
        if (formulas[c.index]) { skipped.push(c.key); return; }
        var out;
        if (c === weekCol) {
          if (existing) return;
          out = Utilities.parseDate(asYmd_(v) || week, tz, 'yyyy-MM-dd');
        }
        else if (/^notes$/i.test(c.name)) out = /^[=+\-@]/.test(String(v)) ? "'" + v : String(v);
        else {
          var n = Number(String(v).replace(/[,\s%+]/g, ''));
          if (isNaN(n)) throw new Error(c.key.replace('|', ' ') + ' must be a number.');
          out = n;
        }
        sh.getRange(rowNum, c.index + 1).setValue(out);
        written.push(c.key);
      });
      if (!written.length) throw new Error(existing ? 'No changes to save.' : 'Nothing to save. Fill in at least one number.');
      SpreadsheetApp.flush();
      bustCache_();
      return { ok: true, row: rowNum, week: week, updated: existing, skipped: skipped };
    });
  });
}
