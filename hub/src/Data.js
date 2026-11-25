/**
 * Data layer: reads any tab into objects keyed by header name.
 *
 * readTab_(name) returns:
 *   { name, headers, meta, rows: [{ _row: 7, 'Athlete name': 'X', ... }] }
 * Dates come back as 'YYYY-MM-DD' strings (google.script.run cannot send Date objects).
 * Results are cached for CONFIG.CACHE_SECONDS and cleared on any write.
 */

var __ss = null;
function ss_() {
  if (!__ss) __ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  return __ss;
}

function sheet_(name) {
  var sh = ss_().getSheetByName(name);
  if (!sh) throw new Error('Tab not found: ' + name);
  return sh;
}

function sheetTz_() {
  return ss_().getSpreadsheetTimeZone() || CONFIG.TZ;
}

/* ---------- small helpers ---------- */

function norm_(s) {
  return String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9]/g, '');
}

function isBlank_(v) {
  return v === '' || v === null || v === undefined || v === false;
}

function isDate_(v) {
  return Object.prototype.toString.call(v) === '[object Date]' && !isNaN(v.getTime());
}

/** 'YYYY-MM-DD' for today in Boise. */
function todayStr_() {
  return Utilities.formatDate(new Date(), CONFIG.TZ, 'yyyy-MM-dd');
}

/** Add days to a 'YYYY-MM-DD' string. */
function addDays_(ymd, n) {
  var p = ymd.split('-');
  var d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2] + n));
  return d.toISOString().slice(0, 10);
}

function serialize_(v, tz) {
  if (isDate_(v)) {
    var hm = Utilities.formatDate(v, tz, 'HH:mm');
    var day = Utilities.formatDate(v, tz, 'yyyy-MM-dd');
    return hm === '00:00' ? day : day + 'T' + hm;
  }
  return v;
}

/** Turn a cell value into a 'YYYY-MM-DD' string if it looks like a date, else ''. */
function asYmd_(v) {
  if (!v) return '';
  var s = String(v);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  var m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return m[3] + '-' + ('0' + m[1]).slice(-2) + '-' + ('0' + m[2]).slice(-2);
  return '';
}

function asNumber_(v) {
  if (typeof v === 'number') return v;
  if (v === '' || v == null) return 0;
  var n = Number(String(v).replace(/[$,\s]/g, ''));
  return isNaN(n) ? 0 : n;
}

/* ---------- cache (chunked: CacheService caps each value at 100KB) ---------- */

var CACHE_PREFIX = 'hub:v1:';
var CHUNK = 90000;

function cacheGet_(key) {
  var c = CacheService.getScriptCache();
  var head = c.get(CACHE_PREFIX + key);
  if (!head) return null;
  var n = Number(head);
  var keys = [];
  for (var i = 0; i < n; i++) keys.push(CACHE_PREFIX + key + ':' + i);
  var parts = c.getAll(keys);
  var s = '';
  for (var j = 0; j < n; j++) {
    var p = parts[keys[j]];
    if (p == null) return null;
    s += p;
  }
  try { return JSON.parse(s); } catch (e) { return null; }
}

function cachePut_(key, obj) {
  var s = JSON.stringify(obj);
  var map = {};
  var n = Math.ceil(s.length / CHUNK) || 1;
  for (var i = 0; i < n; i++) map[CACHE_PREFIX + key + ':' + i] = s.slice(i * CHUNK, (i + 1) * CHUNK);
  map[CACHE_PREFIX + key] = String(n);
  try { CacheService.getScriptCache().putAll(map, CONFIG.CACHE_SECONDS); } catch (e) { /* cache is optional */ }
}

/** Clear every cached read. Called after any write. */
function bustCache_() {
  var keys = [];
  Object.keys(CONFIG.TABS).forEach(function (k) {
    keys.push(CACHE_PREFIX + 'tab:' + CONFIG.TABS[k]);
  });
  keys.push(CACHE_PREFIX + 'scorecard', CACHE_PREFIX + 'settings');
  CacheService.getScriptCache().removeAll(keys);
}

/* ---------- table metadata ---------- */

/**
 * Reads row 1 and the first data row of a tab and works out, per header:
 *  - index: zero-based column index
 *  - computed: true if the column is filled by a formula (ARRAYFORMULA in row 1 or 2). Never written.
 *  - type: 'bool' | 'date' | 'number' | 'text'
 *  - choices: dropdown values from data validation, if any
 * The table ends at the first blank header, so summary blocks to the right are ignored.
 */
function buildMeta_(sh, values) {
  var header = values[0] || [];
  var width = 0;
  while (width < header.length && String(header[width]).trim() !== '') width++;
  var headers = header.slice(0, width).map(function (h) { return String(h).trim(); });

  var maxRows = sh.getMaxRows();
  var probeRows = Math.min(2, maxRows);
  var formulas = width ? sh.getRange(1, 1, probeRows, width).getFormulas() : [[]];
  var validations = (width && maxRows >= 2) ? sh.getRange(2, 1, 1, width).getDataValidations()[0] : [];

  var cols = {};
  headers.forEach(function (h, i) {
    var f1 = (formulas[0] && formulas[0][i]) || '';
    var f2 = (formulas[1] && formulas[1][i]) || '';
    var computed = !!f1 || /arrayformula/i.test(f2);
    var col = { index: i, computed: computed, type: 'text', choices: null, choiceSource: null };

    var dv = validations[i];
    if (dv) {
      var t = dv.getCriteriaType();
      var C = SpreadsheetApp.DataValidationCriteria;
      var args = dv.getCriteriaValues() || [];
      if (t === C.CHECKBOX) col.type = 'bool';
      else if (t === C.DATE_IS_VALID_DATE) col.type = 'date';
      else if (t === C.VALUE_IN_LIST) { col.choices = (args[0] || []).map(String); col.choiceSource = 'list'; }
      else if (t === C.VALUE_IN_RANGE && args[0]) {
        try {
          var seen = {};
          col.choices = args[0].getValues().map(function (r) { return String(r[0]).trim(); })
            .filter(function (v) { if (!v || seen[v]) return false; seen[v] = 1; return true; });
          col.choiceSource = 'range';
        } catch (e) { /* ignore */ }
      }
    }

    if (col.type === 'text' && !col.choices) col.type = inferType_(h, values, i);
    cols[h] = col;
  });

  return { headers: headers, width: width, cols: cols };
}

function inferType_(header, values, i) {
  var dates = 0, nums = 0, bools = 0, seen = 0;
  for (var r = 1; r < values.length && seen < 40; r++) {
    var v = values[r][i];
    if (v === '' || v == null) continue;
    seen++;
    if (isDate_(v)) dates++;
    else if (typeof v === 'number') nums++;
    else if (typeof v === 'boolean') bools++;
  }
  if (seen) {
    if (bools === seen) return 'bool';
    if (dates / seen > 0.6) return 'date';
    if (nums / seen > 0.6) return 'number';
  }
  if (/(^|\b)(date|due|ends|touch|booked on|received|week of)(\b|$)/i.test(header)) return 'date';
  if (/amount|minutes|rate|reach|saves|dms started|\(months\)/i.test(header)) return 'number';
  return 'text';
}

/* ---------- reading tabs ---------- */

function rowHasKey_(name, headers, row) {
  var keys = CONFIG.KEY_HEADERS[name];
  if (keys) {
    return keys.some(function (k) {
      var i = headers.indexOf(k);
      return i >= 0 && !isBlank_(row[i]) && String(row[i]).trim() !== '';
    });
  }
  return row.some(function (v) { return !isBlank_(v) && String(v).trim() !== ''; });
}

/**
 * Read a tab. Uses the 60 second cache unless fresh is true.
 * Rows without a value in any KEY_HEADERS column are skipped.
 */
function readTab_(name, fresh) {
  if (!fresh) {
    var hit = cacheGet_('tab:' + name);
    if (hit) return hit;
  }
  var sh = sheet_(name);
  var lastRow = sh.getLastRow();
  var lastCol = sh.getLastColumn();
  var values = lastRow && lastCol ? sh.getRange(1, 1, lastRow, lastCol).getValues() : [[]];
  var meta = buildMeta_(sh, values);
  var tz = sheetTz_();
  var rows = [];
  var errors = [];
  for (var r = 1; r < values.length; r++) {
    var raw = values[r].slice(0, meta.width);
    if (!rowHasKey_(name, meta.headers, raw)) continue;
    var obj = { _row: r + 1 };
    meta.headers.forEach(function (h, i) {
      var v = serialize_(raw[i], tz);
      if (typeof v === 'string' && /^#(REF!|N\/A|VALUE!|DIV\/0!|NAME\?|ERROR!|NUM!)/.test(v)) {
        errors.push({ tab: name, row: r + 1, header: h, error: v });
      }
      obj[h] = v;
    });
    rows.push(obj);
  }
  var out = { name: name, headers: meta.headers, meta: meta, rows: rows, errors: errors };
  cachePut_('tab:' + name, out);
  return out;
}

/* ---------- summary-layout tabs (found by label text, not cell address) ---------- */

function findCell_(grid, label, opts) {
  opts = opts || {};
  var target = norm_(label);
  var maxRow = opts.maxRow == null ? grid.length : opts.maxRow;
  for (var r = 0; r < maxRow; r++) {
    for (var c = 0; c < grid[r].length; c++) {
      var n = norm_(grid[r][c]);
      if (!n) continue;
      if (opts.exact ? n === target : n.indexOf(target) === 0) return { r: r, c: c };
    }
  }
  return null;
}

/**
 * Scorecard: each label's value sits in the cell to its right.
 * The cash-by-month table and the weekly log are found by their header text.
 */
function readScorecard_(fresh) {
  if (!fresh) {
    var hit = cacheGet_('scorecard');
    if (hit) return hit;
  }
  var sh = sheet_(CONFIG.TABS.SCORECARD);
  var tz = sheetTz_();
  var grid = sh.getDataRange().getValues().map(function (row) {
    return row.map(function (v) { return serialize_(v, tz); });
  });

  var logHead = findCell_(grid, 'Week of', { exact: true });
  var limit = logHead ? logHead.r : grid.length;

  function val(label, exact) {
    var at = findCell_(grid, label, { maxRow: limit, exact: exact });
    return at ? grid[at.r][at.c + 1] : null;
  }

  var stages = {};
  ['New', 'Talking', 'Call booked', 'Call held', 'Recap sent', 'Won', 'Lost', 'Nurture'].forEach(function (s) {
    stages[s] = val(s, true);
  });

  var out = {
    weekOf: val('Week starting'),
    conversations: val('Conversations started'),
    callsBooked: val('Calls booked', true),
    callsHeld: val('Calls held', true),
    closes: val('Closes', true),
    enrolled: val('Enrolled athletes'),
    mrr: val('Monthly recurring revenue'),
    mrrTarget: val('MRR target'),
    gap: val('Gap to target'),
    spots: val('Spots to next price step'),
    recurringCosts: val('Recurring costs per month'),
    net: val('Net per month'),
    ddcMonthly: val('DDC group'),
    paid323: val('Paid 323 athletes'),
    cashMonth: val('Cash collected this month'),
    cashYtd: val('Cash collected year to date'),
    overdueFollowups: val('Overdue follow-ups'),
    stages: stages,
    cashByMonth: readBlockTable_(grid, findCell_(grid, 'Cash collected', { exact: true, maxRow: limit })),
    weeklyLog: readBlockTable_(grid, logHead)
  };
  cachePut_('scorecard', out);
  return out;
}

/** Read a small table whose top-left header cell is at `at`. Stops at the first row with a blank first cell. */
function readBlockTable_(grid, at) {
  if (!at) return { headers: [], rows: [] };
  var head = grid[at.r];
  var headers = [];
  for (var c = at.c; c < head.length && String(head[c]).trim() !== ''; c++) headers.push(String(head[c]).trim());
  var rows = [];
  for (var r = at.r + 1; r < grid.length; r++) {
    var first = grid[r][at.c];
    if (first === '' || first == null) break;
    var obj = {};
    headers.forEach(function (h, i) { obj[h] = grid[r][at.c + i]; });
    rows.push(obj);
  }
  return { headers: headers, rows: rows };
}

/**
 * Settings: the program price table (found by its "Program" header) plus label/value pairs.
 */
function readSettings_(fresh) {
  if (!fresh) {
    var hit = cacheGet_('settings');
    if (hit) return hit;
  }
  var grid = sheet_(CONFIG.TABS.SETTINGS).getDataRange().getValues();
  var head = findCell_(grid, 'Program', { exact: true });
  var programs = [];
  var headers = [];
  var tableEnd = head ? head.r : -1;
  if (head) {
    for (var c = head.c; c < grid[head.r].length && String(grid[head.r][c]).trim() !== ''; c++) headers.push(String(grid[head.r][c]).trim());
    var paysIdx = headers.map(norm_).indexOf('paysthrough');
    for (var r = head.r + 1; r < grid.length; r++) {
      var name = String(grid[r][head.c]).trim();
      var pays = paysIdx >= 0 ? String(grid[r][head.c + paysIdx]).trim() : 'x';
      if (!name || !pays) break;
      var p = {};
      headers.forEach(function (h, i) { p[h] = grid[r][head.c + i]; });
      programs.push(p);
      tableEnd = r;
    }
  }
  var pairs = {};
  for (var rr = tableEnd + 1; rr < grid.length; rr++) {
    var label = String(grid[rr][0]).trim();
    if (label) pairs[label] = grid[rr][1];
  }
  function pick(prefix) {
    var key = Object.keys(pairs).filter(function (k) { return norm_(k).indexOf(norm_(prefix)) === 0; })[0];
    return key ? pairs[key] : null;
  }
  var agreements = {};
  Object.keys(pairs).forEach(function (k) {
    var m = k.match(/^Agreement:\s*(.+)$/i);
    if (m) agreements[m[1].trim()] = pairs[k];
  });
  var out = {
    programs: programs,
    programHeaders: headers,
    firstStep: pick('First price step'),
    secondStep: pick('Second price step'),
    increasePerStep: pick('Increase per step'),
    mrrTarget: pick('MRR target'),
    discoveryLink: pick('Discovery call link'),
    businessEmail: pick('Business email'),
    agreements: agreements,
    raw: pairs
  };
  cachePut_('settings', out);
  return out;
}

/** Tag a program so DDC and Guinea Pig never read as 323 revenue. */
function programTag_(program) {
  var p = norm_(program);
  if (!p) return '';
  if (p.indexOf('ddc') >= 0 || p.indexOf('diamonddevelopment') >= 0) return 'DDC';
  if (p.indexOf('guineapig') >= 0) return 'Guinea Pig';
  return '323';
}
