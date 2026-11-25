/*
 * Builds a single HTML file that runs the whole Hub in a normal browser against the fake sheet.
 * google.script.run is replaced by a shim that calls the server functions in the page.
 * Usage: node hub/dev/preview.js /path/to/out.html
 */
'use strict';
var fs = require('fs');
var path = require('path');
var SRC = path.join(__dirname, '..', 'src');
var out = process.argv[2] || path.join(__dirname, 'preview.html');

function read(p) { return fs.readFileSync(p, 'utf8'); }

var server = ['Config.js', 'Data.js', 'Write.js', 'Api.js', 'Todo.js', 'Clients.js', 'Leads.js', 'Money.js', 'Code.js'].map(function (f) { return read(path.join(SRC, f)); }).join('\n');
var shim = [
  read(path.join(__dirname, 'mock.js')),
  read(path.join(__dirname, 'fixture.js')),
  'HubMock.install(window, HubFixture.build(HubMock.Utilities.formatDate(new Date(), "America/Boise", "yyyy-MM-dd")));',
  server,
  'window.google = { script: { run: (function () {',
  '  function mk(ok, fail) { return new Proxy({}, { get: function (_, k) {',
  '    if (k === "withSuccessHandler") return function (f) { return mk(f, fail); };',
  '    if (k === "withFailureHandler") return function (f) { return mk(ok, f); };',
  '    return function () { var a = arguments; setTimeout(function () {',
  '      try { var r = JSON.parse(JSON.stringify(window[k].apply(null, a) ?? null)); ok && ok(r); }',
  '      catch (e) { fail && fail(e); } }, 250); };',
  '  } }); }',
  '  return mk(null, null); })() } };'
].join('\n');

var html = read(path.join(SRC, 'Index.html'))
  .replace(/<\?!= include_\('(\w+)'\); \?>/g, function (_, name) {
    var file = read(path.join(SRC, name + '.html'));
    return name === 'App' ? '<script>\n' + shim + '\n</script>\n' + file : file;
  })
  .replace('<meta charset="utf-8">', '<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">');

fs.writeFileSync(out, html);
console.log(out);
