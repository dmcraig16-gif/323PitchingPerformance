/*
 * Test only: a fake "Google Sheets" connector backed by the fake Command Center in dev/fixture.js.
 * Answers get_spreadsheet and update_values in the same shapes the real connector returns,
 * and refuses any write that would land on a formula or inside an ARRAYFORMULA column.
 */
(function () {
  'use strict';
  var M = window.HubMock;
  var TZ = 'America/Boise';
  var today = M.Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
  var book = M.install({}, window.HubFixture.build(today)).book;
  window.__fakeBook = book;
  window.__mcpLog = [];

  function serial(d) {
    var p = M.Utilities.formatDate(d, TZ, 'yyyy-MM-dd').split('-').map(Number);
    return Math.round((Date.UTC(p[0], p[1] - 1, p[2]) - Date.UTC(1899, 11, 30)) / 864e5);
  }
  var ERR = { '#REF!': 'REF', '#N/A': 'N_A', '#VALUE!': 'VALUE', '#NAME?': 'NAME' };

  function cellJson(sh, r, c) {
    var v = sh.cell(r, c), o = {};
    if (Object.prototype.toString.call(v) === '[object Date]') { o.effectiveValue = { numberValue: serial(v) }; o.effectiveFormat = { numberFormat: { type: 'DATE' } }; }
    else if (typeof v === 'boolean') o.effectiveValue = { boolValue: v };
    else if (typeof v === 'number') o.effectiveValue = { numberValue: v };
    else if (typeof v === 'string' && ERR[v]) o.effectiveValue = { errorValue: { type: ERR[v] } };
    else if (v !== '' && v != null) o.effectiveValue = { stringValue: String(v) };
    var f = sh.formulas[r + ',' + c];
    if (f) o.userEnteredValue = { formulaValue: f };
    var dv = r === 2 ? sh.validations[c] : null;
    if (dv) {
      var t = dv.getCriteriaType(), a = dv.getCriteriaValues();
      var cond = t === 'CHECKBOX' ? { type: 'BOOLEAN' }
        : t === 'DATE_IS_VALID_DATE' ? { type: 'DATE_IS_VALID' }
        : t === 'VALUE_IN_LIST' ? { type: 'ONE_OF_LIST', values: a[0].map(function (x) { return { userEnteredValue: x }; }) }
        : { type: 'ONE_OF_RANGE', values: [{ userEnteredValue: a[0].ref }] };
      o.dataValidation = { condition: cond };
    }
    return o;
  }

  function getSpreadsheet(input) {
    var name = input.ranges[0].replace(/^'|'$/g, '').replace(/''/g, "'");
    var sh = book.getSheetByName(name);
    if (!sh) throw { code: 'tool_error', message: 'Unable to parse range' };
    var rows = [];
    var width = Math.max(1, sh.getLastColumn());
    for (var r = 1; r <= sh.values.length; r++) {
      var vals = [];
      for (var c = 1; c <= width; c++) vals.push(cellJson(sh, r, c));
      rows.push({ values: vals });
    }
    return { properties: { timeZone: TZ }, sheets: [{ properties: { title: name, gridProperties: { rowCount: sh.getMaxRows() } }, data: [{ rowData: rows }] }], spreadsheetId: input.spreadsheetId };
  }

  function colNum(L) { var n = 0; for (var i = 0; i < L.length; i++) n = n * 26 + L.charCodeAt(i) - 64; return n; }

  function updateValues(input) {
    var m = input.range.match(/^'((?:[^']|'')+)'!([A-Z]+)(\d+):([A-Z]+)(\d+)$/);
    if (!m) throw { code: 'tool_error', message: 'Bad range ' + input.range };
    var sh = book.getSheetByName(m[1].replace(/''/g, "'"));
    var r = Number(m[3]), c1 = colNum(m[2]);
    input.values[0].forEach(function (v, i) {
      if (v === null) return;
      var c = c1 + i;
      var f2 = sh.formulas['2,' + c] || '';
      if (sh.formulas[r + ',' + c] || (r > 2 && /arrayformula/i.test(f2))) throw { code: 'tool_error', message: 'TEST: write into formula area at ' + m[1] + ' R' + r + 'C' + c };
      var val = v;
      if (typeof v === 'string') {
        var d = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (v.charAt(0) === "'") val = v.slice(1);
        else if (d) val = M.localMidnight(+d[3], +d[1], +d[2]);
        else if (/^-?\d+(\.\d+)?$/.test(v)) val = Number(v);
        else if (/^(true|false)$/i.test(v)) val = /^true$/i.test(v);
      }
      sh.set(r, c, val);
    });
    return { updatedRange: input.range, updatedCells: input.values[0].filter(function (v) { return v !== null; }).length };
  }

  var mcp = {
    callTool: function (server, tool, input) {
      window.__mcpLog.push({ server: server, tool: tool, input: JSON.parse(JSON.stringify(input)) });
      return new Promise(function (res, rej) {
        setTimeout(function () {
          try {
            if (server !== 'Google Sheets') throw { code: 'server_not_connected' };
            var out = tool === 'get_spreadsheet' ? getSpreadsheet(input) : tool === 'update_values' ? updateValues(input) : null;
            if (!out) throw { code: 'not_in_manifest' };
            var wrapped = { content: out };
            res({ content: [{ type: 'text', text: JSON.stringify(wrapped) }], payload: wrapped });
          } catch (e) { rej(e); }
        }, 150);
      });
    }
  };
  window.claude = { use: function (name) { return Promise.resolve(name === 'mcp' ? mcp : null); } };
})();
