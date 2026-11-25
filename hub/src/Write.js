/**
 * Safe write helpers. Every write:
 *  - runs inside a script lock (two quick taps cannot double-write)
 *  - maps columns by header name, read live from row 1
 *  - skips formula cells and formula-filled (ARRAYFORMULA) columns
 *  - clears the read cache afterwards
 */

function withLock_(fn) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) throw new Error('The sheet is busy. Try again in a moment.');
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

/**
 * Run fn once per requestId. A repeat of the same request (double tap, retry) returns the first result.
 */
function once_(requestId, fn) {
  if (!requestId) return fn();
  var c = CacheService.getScriptCache();
  var key = CACHE_PREFIX + 'req:' + String(requestId).slice(0, 64);
  var prev = c.get(key);
  if (prev) return JSON.parse(prev);
  var res = fn();
  try { c.put(key, JSON.stringify(res), 600); } catch (e) { /* ignore */ }
  return res;
}

/** Live header map for writes (never cached, so a column added a second ago is respected). */
function liveMeta_(name) {
  var sh = sheet_(name);
  var lastCol = Math.max(1, sh.getLastColumn());
  var probe = Math.min(Math.max(2, sh.getLastRow()), 60);
  var values = sh.getRange(1, 1, probe, lastCol).getValues();
  return { sh: sh, meta: buildMeta_(sh, values) };
}

/** Convert an app value to what the sheet should hold for that column type. */
function coerce_(col, v) {
  if (v === null || v === undefined) return '';
  if (col.type === 'bool') return v === true || v === 'true' || v === 'TRUE';
  if (col.type === 'date') {
    var ymd = asYmd_(v);
    if (!ymd) return '';
    return Utilities.parseDate(ymd, sheetTz_(), 'yyyy-MM-dd');
  }
  if (col.type === 'number') {
    if (v === '') return '';
    var n = Number(String(v).replace(/[$,\s]/g, ''));
    return isNaN(n) ? String(v) : n;
  }
  var s = String(v);
  // A leading = + - @ would turn typed text into a formula. Store it as text.
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}

function writeCells_(sh, meta, row, changes) {
  var written = [], skipped = [];
  var rowFormulas = sh.getRange(row, 1, 1, meta.width).getFormulas()[0];
  Object.keys(changes).forEach(function (h) {
    var col = meta.cols[h];
    if (!col) { skipped.push({ header: h, reason: 'no such column' }); return; }
    if (col.computed || rowFormulas[col.index]) { skipped.push({ header: h, reason: 'formula' }); return; }
    sh.getRange(row, col.index + 1).setValue(coerce_(col, changes[h]));
    written.push(h);
  });
  return { written: written, skipped: skipped };
}

/**
 * Update cells in one row.
 * expect: { header: value } that must still match before writing, so a sorted or edited sheet
 * never gets a value written into the wrong row.
 */
function updateRow_(name, row, changes, expect) {
  return withLock_(function () {
    var lm = liveMeta_(name);
    var sh = lm.sh, meta = lm.meta;
    row = Number(row);
    if (!(row >= 2) || row > sh.getLastRow()) throw new Error('That row no longer exists. Refresh and try again.');
    if (expect) {
      var current = sh.getRange(row, 1, 1, meta.width).getValues()[0];
      Object.keys(expect).forEach(function (h) {
        var col = meta.cols[h];
        if (!col) return;
        if (String(serialize_(current[col.index], sheetTz_())).trim() !== String(expect[h]).trim()) {
          throw new Error('That row changed in the sheet. Refresh and try again.');
        }
      });
    }
    var res = writeCells_(sh, meta, row, changes);
    SpreadsheetApp.flush();
    bustCache_();
    res.row = row;
    return res;
  });
}

/**
 * Append a record after the last row that has real content.
 * Checkbox-only rows (FALSE) and formula output do not count as content, so a tab pre-filled with
 * empty checkboxes gets its next row filled instead of row 1001.
 */
function appendRow_(name, record) {
  return withLock_(function () {
    var lm = liveMeta_(name);
    var sh = lm.sh, meta = lm.meta;
    var target = firstFreeRow_(sh, meta);
    if (target > sh.getMaxRows()) sh.insertRowsAfter(sh.getMaxRows(), 1);
    var res = writeCells_(sh, meta, target, record);
    SpreadsheetApp.flush();
    bustCache_();
    res.row = target;
    return res;
  });
}

function firstFreeRow_(sh, meta) {
  var last = sh.getLastRow();
  if (last < 2) return 2;
  var values = sh.getRange(2, 1, last - 1, meta.width).getValues();
  var writable = meta.headers.filter(function (h) { return !meta.cols[h].computed; })
    .map(function (h) { return meta.cols[h].index; });
  for (var r = values.length - 1; r >= 0; r--) {
    var has = writable.some(function (i) {
      var v = values[r][i];
      return v !== '' && v !== null && v !== false;
    });
    if (has) return r + 3;
  }
  return 2;
}

/**
 * Add a timestamped note to the top of a notes cell. Reads the cell inside the lock,
 * so a note typed in the sheet a second ago is kept.
 */
function prependNote_(name, row, header, text, expect) {
  if (!String(text || '').trim()) throw new Error('Type a note first.');
  return withLock_(function () {
    var lm = liveMeta_(name);
    var sh = lm.sh, meta = lm.meta;
    var col = meta.cols[header];
    if (!col) throw new Error('No ' + header + ' column on ' + name + '.');
    row = Number(row);
    if (!(row >= 2) || row > sh.getLastRow()) throw new Error('That row no longer exists. Refresh and try again.');
    var current = sh.getRange(row, 1, 1, meta.width).getValues()[0];
    Object.keys(expect || {}).forEach(function (h) {
      var c = meta.cols[h];
      if (c && String(current[c.index]).trim() !== String(expect[h]).trim()) {
        throw new Error('That row changed in the sheet. Refresh and try again.');
      }
    });
    var changes = {};
    changes[header] = stampNote_(current[col.index], text);
    var res = writeCells_(sh, meta, row, changes);
    if (res.written.indexOf(header) < 0) throw new Error('Notes could not be saved (that cell holds a formula).');
    SpreadsheetApp.flush();
    bustCache_();
    return changes[header];
  });
}

/** Prepend a timestamped line to a notes value: "M/D/YYYY: text", newest first. */
function stampNote_(existing, text) {
  var d = Utilities.formatDate(new Date(), CONFIG.TZ, 'M/d/yyyy');
  var line = d + ': ' + String(text).trim();
  existing = String(existing || '').trim();
  return existing ? line + '\n' + existing : line;
}
