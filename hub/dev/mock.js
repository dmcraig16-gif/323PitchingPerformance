/*
 * Minimal stand-ins for the Apps Script services the Hub uses, so the server code can run
 * in Node (tests) or a browser (UI preview) against fake data. Not deployed.
 */
(function (root) {
  'use strict';
  var TZ = 'America/Boise';

  function tzParts(date, tz) {
    var f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23', weekday: 'short'
    });
    var o = {};
    f.formatToParts(date).forEach(function (p) { o[p.type] = p.value; });
    return o;
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
      return localMidnight(a[0], a[1], a[2], tz);
    }
  };

  /** Date for midnight on y-m-d in tz. */
  function localMidnight(y, m, d, tz) {
    var guess = new Date(Date.UTC(y, m - 1, d, 12));
    var p = tzParts(guess, tz || TZ);
    var offsetMs = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute) - guess.getTime();
    return new Date(Date.UTC(y, m - 1, d) - offsetMs);
  }

  var Criteria = { CHECKBOX: 'CHECKBOX', DATE_IS_VALID_DATE: 'DATE_IS_VALID_DATE', VALUE_IN_LIST: 'VALUE_IN_LIST', VALUE_IN_RANGE: 'VALUE_IN_RANGE' };

  function Validation(type, args) { this.type = type; this.args = args || []; }
  Validation.prototype.getCriteriaType = function () { return this.type; };
  Validation.prototype.getCriteriaValues = function () { return this.args; };

  function Sheet(spec, book) {
    this.name = spec.name;
    this.book = book;
    this.values = spec.values.map(function (r) { return r.slice(); });
    this.formulas = spec.formulas || {};        // "row,col" (1-based) -> formula
    this.validations = spec.validations || {};   // col (1-based) -> Validation, applies to rows >= 2
    this.maxRows = spec.maxRows || Math.max(this.values.length, 50);
    this.writes = [];
  }
  Sheet.prototype.cell = function (r, c) { var row = this.values[r - 1]; return row && row[c - 1] !== undefined ? row[c - 1] : ''; };
  Sheet.prototype.getLastRow = function () {
    for (var r = this.values.length; r >= 1; r--) {
      if (this.values[r - 1].some(function (v) { return v !== '' && v !== null && v !== undefined; })) return r;
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
  Sheet.prototype.getMaxRows = function () { return this.maxRows; };
  Sheet.prototype.insertRowsAfter = function (after, n) { this.maxRows += n; };
  Sheet.prototype.getRange = function (r, c, nr, nc) { return new Range(this, r, c, nr || 1, nc || 1); };
  Sheet.prototype.getDataRange = function () { return this.getRange(1, 1, Math.max(1, this.getLastRow()), Math.max(1, this.getLastColumn())); };
  Sheet.prototype.set = function (r, c, v) {
    while (this.values.length < r) this.values.push([]);
    var row = this.values[r - 1];
    while (row.length < c) row.push('');
    row[c - 1] = v;
    this.writes.push({ r: r, c: c, v: v });
  };

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
    if (this.getFormula()) throw new Error('TEST: wrote over a formula at ' + this.r + ',' + this.c);
    if (typeof v === 'string' && v[0] === "'") v = v.slice(1);
    this.sh.set(this.r, this.c, v);
    return this;
  };

  function Book(specs) {
    var self = this;
    this.sheets = {};
    specs.forEach(function (s) { self.sheets[s.name] = new Sheet(s, self); });
  }
  Book.prototype.getSheetByName = function (n) { return this.sheets[n] || null; };
  Book.prototype.getSpreadsheetTimeZone = function () { return TZ; };
  Book.prototype.getUrl = function () { return 'https://docs.google.com/spreadsheets/d/FAKE/edit'; };

  function makeCache() {
    var m = {};
    return {
      get: function (k) { return k in m ? m[k] : null; },
      getAll: function (ks) { var o = {}; ks.forEach(function (k) { if (k in m) o[k] = m[k]; }); return o; },
      put: function (k, v) { m[k] = v; },
      putAll: function (o) { Object.keys(o).forEach(function (k) { m[k] = o[k]; }); },
      removeAll: function (ks) { ks.forEach(function (k) { delete m[k]; }); },
      _dump: m
    };
  }

  function install(target, specs, opts) {
    opts = opts || {};
    var book = new Book(specs);
    var cache = makeCache();
    target.Utilities = Utilities;
    target.SpreadsheetApp = { openById: function () { return book; }, flush: function () {}, DataValidationCriteria: Criteria };
    target.CacheService = { getScriptCache: function () { return cache; } };
    target.LockService = { getScriptLock: function () { return { tryLock: function () { return true; }, releaseLock: function () {} }; } };
    target.Session = { getActiveUser: function () { return { getEmail: function () { return opts.email || '323mperformance@gmail.com'; } }; } };
    return { book: book, cache: cache };
  }

  root.HubMock = { install: install, Validation: Validation, Criteria: Criteria, localMidnight: localMidnight, Utilities: Utilities, TZ: TZ };
})(typeof globalThis !== 'undefined' ? globalThis : this);
