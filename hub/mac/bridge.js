/*
 * 323 Hub for Mac: runs the same server code as the Apps Script version (src/*.js),
 * against a live copy of the Command Center read through the viewer's Google Sheets connector.
 *
 * How it works
 *  - Each tab is read with get_spreadsheet (values, formulas, number formats, dropdown rules).
 *  - The rows become an in-memory book that answers the SpreadsheetApp calls the server code makes.
 *  - Reads run against that copy. Before any write, the tabs involved are re-read fresh, so the
 *    row checks and formula checks see the sheet as it is right now.
 *  - Cells the server code changes are sent back with update_values, one call per row, with null
 *    for every cell left alone (the connector skips nulls), so formulas are never touched.
 *  - Writes run one at a time.
 */
(function (root) {
  'use strict';

  var SERVER = 'Google Sheets';
  var TZ = 'America/Boise';
  var ALL_TABS = ['Scorecard', 'Daily To-Do', 'Leads', 'Clients', 'Payments', 'Settings', 'Content', 'Wins', 'Expenses', 'Money', 'Social'];
  var FIELDS = [
    'properties.timeZone',
    'sheets.properties.title',
    'sheets.properties.gridProperties.rowCount',
    'sheets.data.startRow',
    'sheets.data.startColumn',
    'sheets.data.rowData.values.effectiveValue',
    'sheets.data.rowData.values.userEnteredValue',
    'sheets.data.rowData.values.effectiveFormat.numberFormat.type',
    'sheets.data.rowData.values.dataValidation.condition'
  ];
  var STALE_MS = 60000;

  /* ---------- dates and time zones ---------- */

  function tzParts(date, tz) {
    var f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23', weekday: 'short'
    });
    var o = {};
    f.formatToParts(date).forEach(function (p) { o[p.type] = p.value; });
    return o;
  }

  /** Midnight (plus optional minutes) on y-m-d in tz, as a Date. */
  function localTime(y, m, d, tz, minutes) {
    var guess = new Date(Date.UTC(y, m - 1, d, 12));
    var p = tzParts(guess, tz);
    var offsetMs = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute) - guess.getTime();
    return new Date(Date.UTC(y, m - 1, d) - offsetMs + (minutes || 0) * 60000);
  }

  /** Sheets serial number (days since 12/30/1899) to a Date in the sheet's time zone. */
  function serialToDate(serial, tz) {
    var days = Math.floor(serial);
    var minutes = Math.round((serial - days) * 1440);
    var base = new Date(Date.UTC(1899, 11, 30 + days));
    return localTime(base.getUTCFullYear(), base.getUTCMonth() + 1, base.getUTCDate(), tz, minutes);
  }

  var Utilities = {
    formatDate: function (date, tz, pattern) {
      var p = tzParts(date, tz);
      return pattern.replace(/yyyy|MM|dd|HH|mm|EEE|M|d/g, function (t) {
        switch (t) {
          case 'yyyy': return p.year;
          case 'MM': return p.month;
          case 'dd': return p.day;
          case 'HH': return p.hour;
          case 'mm': return p.minute;
          case 'EEE': return p.weekday;
          case 'M': return String(Number(p.month));
          case 'd': return String(Number(p.day));
        }
      });
    },
    parseDate: function (str, tz) {
      var a = str.split('-').map(Number);
      return localTime(a[0], a[1], a[2], tz);
    }
  };

  /* ---------- the in-memory book ---------- */

  var Criteria = { CHECKBOX: 'CHECKBOX', DATE_IS_VALID_DATE: 'DATE_IS_VALID_DATE', VALUE_IN_LIST: 'VALUE_IN_LIST', VALUE_IN_RANGE: 'VALUE_IN_RANGE' };

  function Validation(type, args) { this.type = type; this.args = args || []; }
  Validation.prototype.getCriteriaType = function () { return this.type; };
  Validation.prototype.getCriteriaValues = function () { return this.args; };

  var ERRORS = { REF: '#REF!', NAME: '#NAME?', VALUE: '#VALUE!', DIVIDE_BY_ZERO: '#DIV/0!', NUM: '#NUM!', N_A: '#N/A', NULL_VALUE: '#NULL!', ERROR: '#ERROR!', LOADING: '#LOADING' };

  function colLetters(n) {
    var s = '';
    while (n > 0) { var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
    return s;
  }
  function colNumber(letters) {
    var n = 0;
    for (var i = 0; i < letters.length; i++) n = n * 26 + (letters.charCodeAt(i) - 64);
    return n;
  }

  /** A range named in a dropdown rule, such as =Clients!$A$2:$A, read from the book. */
  function RuleRange(book, ref) {
    this.book = book; this.ref = ref;
  }
  RuleRange.prototype.getValues = function () {
    var m = String(this.ref).replace(/^=/, '').match(/^'?([^'!]+)'?!\$?([A-Z]+)\$?(\d+)?(?::\$?([A-Z]+)\$?(\d+)?)?$/);
    if (!m) return [];
    var sh = this.book.sheets[m[1]];
    if (!sh) return [];
    var c = colNumber(m[2]), r1 = Number(m[3] || 1), r2 = m[5] ? Number(m[5]) : sh.values.length;
    var out = [];
    for (var r = r1; r <= r2; r++) out.push([sh.cell(r, c)]);
    return out;
  };

  function Sheet(name, book) {
    this.name = name; this.book = book;
    this.values = []; this.formulas = {}; this.validations = {}; this.maxRows = 0;
    this.writes = [];
  }
  Sheet.prototype.load = function (grid, rowCount, tz) {
    var self = this;
    this.values = []; this.formulas = {}; this.validations = {}; this.maxRows = rowCount || 0;
    (grid.rowData || []).forEach(function (row, ri) {
      var r = (grid.startRow || 0) + ri + 1;
      var out = [];
      (row.values || []).forEach(function (cell, ci) {
        var c = (grid.startColumn || 0) + ci + 1;
        out[c - 1] = cellValue(cell, tz);
        var uv = cell.userEnteredValue;
        if (uv && uv.formulaValue) self.formulas[r + ',' + c] = uv.formulaValue;
        if (r === 2 && cell.dataValidation && cell.dataValidation.condition) {
          var v = toValidation(cell.dataValidation.condition, self.book);
          if (v) self.validations[c] = v;
        }
      });
      for (var i = 0; i < out.length; i++) if (out[i] === undefined) out[i] = '';
      while (self.values.length < r - 1) self.values.push([]);
      self.values[r - 1] = out;
    });
    this.writes = [];
  };
  Sheet.prototype.cell = function (r, c) { var row = this.values[r - 1]; return row && row[c - 1] !== undefined ? row[c - 1] : ''; };
  Sheet.prototype.getLastRow = function () {
    for (var r = this.values.length; r >= 1; r--) {
      var row = this.values[r - 1] || [];
      if (row.some(function (v) { return v !== '' && v !== null && v !== undefined; })) return r;
    }
    return 0;
  };
  Sheet.prototype.getLastColumn = function () {
    var m = 0;
    this.values.forEach(function (row) {
      for (var c = row.length; c >= 1; c--) { if (row[c - 1] !== '' && row[c - 1] != null) { m = Math.max(m, c); break; } }
    });
    return m;
  };
  Sheet.prototype.getMaxRows = function () { return this.maxRows || this.values.length; };
  Sheet.prototype.insertRowsAfter = function () {
    throw new Error('The ' + this.name + ' tab is full. Add more empty rows at the bottom of the tab in the sheet, then try again.');
  };
  Sheet.prototype.getRange = function (r, c, nr, nc) { return new Range(this, r, c, nr || 1, nc || 1); };
  Sheet.prototype.getDataRange = function () { return this.getRange(1, 1, Math.max(1, this.getLastRow()), Math.max(1, this.getLastColumn())); };

  function cellValue(cell, tz) {
    var ev = cell.effectiveValue;
    if (!ev) return '';
    if ('boolValue' in ev) return ev.boolValue;
    if ('errorValue' in ev) return ERRORS[ev.errorValue.type] || '#ERROR!';
    if ('stringValue' in ev) return ev.stringValue;
    if ('numberValue' in ev) {
      var t = cell.effectiveFormat && cell.effectiveFormat.numberFormat && cell.effectiveFormat.numberFormat.type;
      if (t === 'DATE' || t === 'DATE_TIME') return serialToDate(ev.numberValue, tz);
      return ev.numberValue;
    }
    return '';
  }

  function toValidation(cond, book) {
    var vals = (cond.values || []).map(function (v) { return v.userEnteredValue; });
    switch (cond.type) {
      case 'BOOLEAN': return new Validation(Criteria.CHECKBOX);
      case 'DATE_IS_VALID': return new Validation(Criteria.DATE_IS_VALID_DATE);
      case 'ONE_OF_LIST': return new Validation(Criteria.VALUE_IN_LIST, [vals, true]);
      case 'ONE_OF_RANGE': return new Validation(Criteria.VALUE_IN_RANGE, [new RuleRange(book, vals[0]), true]);
    }
    return null;
  }

  function Range(sh, r, c, nr, nc) { this.sh = sh; this.r = r; this.c = c; this.nr = nr; this.nc = nc; }
  Range.prototype.map = function (fn) {
    var out = [];
    for (var i = 0; i < this.nr; i++) {
      var row = [];
      for (var j = 0; j < this.nc; j++) row.push(fn(this.r + i, this.c + j));
      out.push(row);
    }
    return out;
  };
  Range.prototype.getValues = function () { var sh = this.sh; return this.map(function (r, c) { return sh.cell(r, c); }); };
  Range.prototype.getFormulas = function () { var sh = this.sh; return this.map(function (r, c) { return sh.formulas[r + ',' + c] || ''; }); };
  Range.prototype.getDataValidations = function () { var sh = this.sh; return this.map(function (r, c) { return r >= 2 ? (sh.validations[c] || null) : null; }); };
  Range.prototype.getValue = function () { return this.sh.cell(this.r, this.c); };
  Range.prototype.getFormula = function () { return this.sh.formulas[this.r + ',' + this.c] || ''; };
  Range.prototype.setValue = function (v) {
    if (this.sh.readOnly || this.sh.book.id !== root.CONFIG.SPREADSHEET_ID) throw new Error('The ' + this.sh.name + ' tab is read only in the Hub.');
    if (this.getFormula()) throw new Error('That cell holds a formula and was not changed.');
    if (this.r > this.sh.getMaxRows()) this.sh.insertRowsAfter();
    var local = (typeof v === 'string' && v.charAt(0) === "'") ? v.slice(1) : v;
    var sh = this.sh;
    while (sh.values.length < this.r) sh.values.push([]);
    var row = sh.values[this.r - 1];
    while (row.length < this.c) row.push('');
    row[this.c - 1] = local;
    sh.writes.push({ r: this.r, c: this.c, v: v });
    return this;
  };

  function Book(id) { this.id = id; this.sheets = {}; this.tz = TZ; }
  Book.prototype.getSheetByName = function (n) { return this.sheets[n] || null; };
  Book.prototype.getSpreadsheetTimeZone = function () { return this.tz; };
  Book.prototype.getUrl = function () { return 'https://docs.google.com/spreadsheets/d/' + this.id + '/edit'; };

  // One book per spreadsheet: the Command Center, plus the Tally applications sheet (read only).
  var books = {};
  function bookFor(id) {
    id = id || root.CONFIG.SPREADSHEET_ID;
    return books[id] || (books[id] = new Book(id));
  }
  var book = { get tz() { return bookFor().tz; } };
  var loadedAt = {};

  // A tab token is a Command Center tab name, or 'APPS' for the Tally applications tab.
  function resolve(token) {
    if (token === 'APPS') {
      var A = root.CONFIG.APPLICATIONS;
      return { id: A.SPREADSHEET_ID, name: A.TAB, readOnly: true };
    }
    return { id: root.CONFIG.SPREADSHEET_ID, name: token };
  }

  /* ---------- in-memory stand-ins for CacheService, LockService, Session ---------- */

  var cacheMap = {};
  var cache = {
    get: function (k) { return k in cacheMap ? cacheMap[k] : null; },
    getAll: function (ks) { var o = {}; ks.forEach(function (k) { if (k in cacheMap) o[k] = cacheMap[k]; }); return o; },
    put: function (k, v) { cacheMap[k] = v; },
    putAll: function (o) { Object.keys(o).forEach(function (k) { cacheMap[k] = o[k]; }); },
    remove: function (k) { delete cacheMap[k]; },
    removeAll: function (ks) { ks.forEach(function (k) { delete cacheMap[k]; }); }
  };
  function clearCache() {
    Object.keys(cacheMap).forEach(function (k) { if (k.indexOf(':req:') < 0) delete cacheMap[k]; });
  }

  root.Utilities = Utilities;
  root.SpreadsheetApp = { openById: function (id) { return bookFor(id); }, flush: function () {}, DataValidationCriteria: Criteria };
  root.CacheService = { getScriptCache: function () { return cache; } };
  root.LockService = { getScriptLock: function () { return { tryLock: function () { return true; }, waitLock: function () {}, releaseLock: function () {} }; } };
  // Access is enforced by Google: the connector reads the sheet as the person using the app.
  root.Session = { getActiveUser: function () { return { getEmail: function () { return root.CONFIG.OWNER_EMAIL; } }; } };

  /* ---------- talking to the connector ---------- */

  var mcp = null;

  function friendly(err, isWrite) {
    var code = err && err.code;
    var e = new Error(messageFor(code, err, isWrite));
    e.code = code || 'error';
    e.retryable = !!(err && err.retryable);
    return e;
  }

  function messageFor(code, err, isWrite) {
    switch (code) {
      case 'needs_reauth': return 'Google Sheets needs to be reconnected. Reconnect it in claude.ai Settings, Connectors, then tap refresh.';
      case 'server_not_connected': return 'Google Sheets is not connected. Add it in claude.ai Settings, Connectors, then tap refresh.';
      case 'selection_required': return 'You have more than one Google Sheets connector. Pick one when Claude asks, then tap refresh.';
      case 'not_in_manifest':
      case 'approval_required':
      case 'consent_required': return 'This app needs your OK to use Google Sheets. Tap refresh and choose Allow.';
      case 'blocked_by_policy': return 'Your organization blocks Google Sheets for this app.';
      case 'server_unavailable':
      case 'upstream_error':
        return isWrite ? 'Google Sheets did not confirm the save. Tap refresh to check the sheet before trying again.'
          : 'Google Sheets did not answer. Tap refresh to try again.';
      case 'tool_error': return 'Google Sheets refused the request: ' + String((err && err.message) || '').slice(0, 200);
      case 'not_granted':
      case 'capability_disabled':
      case 'capability_removed': return 'Connectors are not available in this window. Open the app from the Claude desktop app.';
    }
    return (err && err.message) ? String(err.message).slice(0, 200) : 'Something went wrong talking to Google Sheets.';
  }

  function payloadOf(res) {
    var p = res && (res.payload !== undefined ? res.payload : res.structuredContent);
    if (typeof p === 'string') { try { p = JSON.parse(p); } catch (e) { /* keep */ } }
    if (p && p.content && !p.sheets && typeof p.content === 'object' && !Array.isArray(p.content)) p = p.content;
    return p;
  }

  function call(tool, input, isWrite) {
    if (!mcp) return Promise.reject(friendly({ code: 'capability_disabled' }, isWrite));
    return mcp.callTool(SERVER, tool, input, { cache: false })
      .then(payloadOf)
      .catch(function (err) { throw friendly(err, isWrite); });
  }

  var inflight = {};
  function loadTab(token) {
    if (inflight[token]) return inflight[token];
    var ref = resolve(token), name = ref.name, bk = bookFor(ref.id);
    var p = call('get_spreadsheet', {
      spreadsheetId: ref.id,
      ranges: ["'" + name.replace(/'/g, "''") + "'"],
      includeGridData: true,
      fields: FIELDS
    }).then(function (data) {
      if (data && data.properties && data.properties.timeZone) bk.tz = data.properties.timeZone;
      var sheet = (data && data.sheets || []).filter(function (s) { return s.properties && s.properties.title === name; })[0] || (data && data.sheets || [])[0];
      if (!sheet) throw new Error('Tab not found: ' + name);
      var sh = bk.sheets[name] || (bk.sheets[name] = new Sheet(name, bk));
      sh.readOnly = !!ref.readOnly;
      sh.load((sheet.data || [])[0] || {}, sheet.properties.gridProperties && sheet.properties.gridProperties.rowCount, bk.tz);
      loadedAt[token] = Date.now();
      clearCache();
    });
    inflight[token] = p;
    var done = function () { delete inflight[token]; };
    p.then(done, done);
    return p;
  }

  /** Make sure the named tabs are loaded; fresh re-reads them regardless of age. */
  function ensure(tabs, fresh) {
    return Promise.all(tabs.map(function (t) {
      var at = loadedAt[t];
      if (!fresh && at && Date.now() - at < STALE_MS) return null;
      if (!fresh && at && inflight[t]) return inflight[t];
      return loadTab(t);
    }));
  }

  function markStale(tabs) { tabs.forEach(function (t) { loadedAt[t] = 0; }); clearCache(); }

  /* ---------- sending writes ---------- */

  function a1(name, r, c1, c2) {
    return "'" + name.replace(/'/g, "''") + "'!" + colLetters(c1) + r + ':' + colLetters(c2) + r;
  }

  // Sheets reads typed text the way it reads the keyboard. Text that would turn into a number,
  // date or TRUE/FALSE gets a leading apostrophe so it stays text.
  var PARSEABLE = /^\s*([-+]?\$?[\d,]*\.?\d+%?|\d{1,4}[\/.-]\d{1,2}([\/.-]\d{1,4})?|\d{1,2}:\d{2}(:\d{2})?(\s*[ap]m)?|true|false)\s*$/i;

  function wireValue(v) {
    if (v === '' || v === null || v === undefined) return '';
    if (Object.prototype.toString.call(v) === '[object Date]') {
      var hm = Utilities.formatDate(v, book.tz, 'HH:mm');
      return Utilities.formatDate(v, book.tz, 'M/d/yyyy') + (hm === '00:00' ? '' : ' ' + hm);
    }
    if (typeof v === 'boolean' || typeof v === 'number') return v;
    var s = String(v);
    if (s.charAt(0) === "'") return s;
    if (PARSEABLE.test(s)) return "'" + s;
    return s;
  }

  function flushWrites() {
    var jobs = [];
    var bk = bookFor();
    Object.keys(bk.sheets).forEach(function (name) {
      var sh = bk.sheets[name];
      if (!sh.writes.length) return;
      var byRow = {};
      sh.writes.forEach(function (w) { (byRow[w.r] = byRow[w.r] || {})[w.c] = w.v; });
      sh.writes = [];
      Object.keys(byRow).forEach(function (r) {
        var cols = Object.keys(byRow[r]).map(Number).sort(function (a, b) { return a - b; });
        var c1 = cols[0], c2 = cols[cols.length - 1];
        var row = [];
        for (var c = c1; c <= c2; c++) row.push(c in byRow[r] ? wireValue(byRow[r][c]) : null);
        jobs.push({ name: name, range: a1(name, Number(r), c1, c2), values: [row] });
      });
    });
    var chain = Promise.resolve();
    jobs.forEach(function (j) {
      chain = chain.then(function () {
        return call('update_values', { spreadsheetId: root.CONFIG.SPREADSHEET_ID, range: j.range, values: j.values }, true);
      });
    });
    return chain.then(function () { return jobs.map(function (j) { return j.name; }); });
  }

  /* ---------- which tabs each server function needs ---------- */

  var T = { SC: 'Scorecard', TODO: 'Daily To-Do', LEADS: 'Leads', CLIENTS: 'Clients', PAY: 'Payments', SET: 'Settings', CONTENT: 'Content', WINS: 'Wins', EXP: 'Expenses', MONEY: 'Money', SOCIAL: 'Social' };
  var READS = {
    getHome: [T.SC, T.TODO, T.LEADS, T.CLIENTS, T.PAY],
    getTodos: [T.TODO],
    getClients: [T.CLIENTS, T.PAY],
    getClient: [T.CLIENTS, T.PAY, T.WINS, T.SET],
    getLeads: [T.LEADS, T.SET],
    getMoney: [T.SC, T.PAY, T.EXP, T.MONEY],
    getContent: [T.CONTENT],
    getWins: [T.WINS],
    getHistory: [T.SC],
    getSocial: [T.SOCIAL],
    getApplications: ['APPS', T.LEADS, T.SET],
    getApplicationAlerts: ['APPS', T.LEADS],
    getSheetUrl: []
  };
  function formTabs(tab) { return [tab, T.CLIENTS, T.SET]; }
  var WRITES = {
    setTaskDone: function () { return [T.TODO]; },
    updateTask: function () { return [T.TODO]; },
    moveTasks: function () { return [T.TODO]; },
    addRecord: function (args) { return formTabs(args[0]); },
    updateClient: function () { return [T.CLIENTS]; },
    addClientNote: function () { return [T.CLIENTS]; },
    updateLead: function () { return [T.LEADS]; },
    addLeadNote: function () { return [T.LEADS]; },
    updateRecord: function (args) { return formTabs(args[0]); },
    addSocialCheckin: function () { return [T.SOCIAL]; },
    addApplicationLead: function () { return ['APPS', T.LEADS]; },
    addApplicationTask: function () { return ['APPS', T.LEADS, T.TODO]; }
  };
  var SPEC = { getFormSpec: function (args) { return formTabs(args[0]); }, getEditSpec: function (args) { return formTabs(args[0]); } };

  // Writes run one at a time, so two quick taps never interleave.
  var queue = Promise.resolve();

  function run(name, args) {
    var fn = root[name];
    if (typeof fn !== 'function' || /_$/.test(name)) return Promise.reject(new Error('Unknown action: ' + name));
    var plain = function (x) { return JSON.parse(JSON.stringify(x === undefined ? null : x)); };

    if (WRITES[name]) {
      var tabs = WRITES[name](args).filter(uniq);
      var job = queue.then(function () {
        return ensure(tabs, true).then(function () {
          var result = fn.apply(null, args);
          return flushWrites().then(function (written) {
            markStale(written.concat([T.SC, T.CLIENTS, T.PAY]).filter(uniq));
            return plain(result);
          }, function (err) {
            markStale(tabs.concat([T.SC]));
            throw err;
          });
        });
      });
      queue = job.catch(function () {});
      return job;
    }

    var need = READS[name] || (SPEC[name] ? SPEC[name](args) : ALL_TABS);
    var fresh = args.length && args[args.length - 1] === true;
    return ensure(need.filter(uniq), fresh).then(function () { return plain(fn.apply(null, args)); });
  }

  function uniq(v, i, a) { return v && a.indexOf(v) === i; }

  /** google.script.run stand-in: same chaining API the page already uses. */
  function makeRun(ok, fail) {
    return new Proxy({}, {
      get: function (_, k) {
        if (k === 'withSuccessHandler') return function (f) { return makeRun(f, fail); };
        if (k === 'withFailureHandler') return function (f) { return makeRun(ok, f); };
        return function () {
          var args = Array.prototype.slice.call(arguments);
          run(k, args).then(function (r) { if (ok) ok(r); }, function (e) { if (fail) fail(e); });
        };
      }
    });
  }

  root.google = { script: { run: makeRun(null, null) } };

  root.HubBridge = {
    attach: function (m) { mcp = m; },
    preload: function () { return ensure(ALL_TABS, false); },
    tabs: ALL_TABS,
    _books: books,
    _serialToDate: serialToDate,
    _wireValue: wireValue
  };
})(typeof window !== 'undefined' ? window : globalThis);
