/*
 * Builds the Mac app (one HTML file) from the same source as the Apps Script version.
 *   node hub/mac/build.js                -> hub/mac/323-hub.html (publish this as the artifact)
 *   node hub/mac/build.js --dev out.html -> same app wired to a fake Google Sheets connector, for testing
 */
'use strict';
var fs = require('fs');
var path = require('path');
var SRC = path.join(__dirname, '..', 'src');
var DEV = path.join(__dirname, '..', 'dev');
var dev = process.argv.indexOf('--dev') >= 0;
var outArg = process.argv.filter(function (a) { return /\.html$/.test(a); })[0];
var out = outArg || path.join(__dirname, '323-hub.html');

function read(p) { return fs.readFileSync(p, 'utf8'); }
function guard(js, name) {
  if (/<\/script/i.test(js)) throw new Error(name + ' contains </script>');
  return js;
}

var SERVER = ['Config.js', 'Data.js', 'Write.js', 'Api.js', 'Todo.js', 'Clients.js', 'Leads.js', 'Money.js', 'Social.js', 'Code.js'];
var VIEWS = ['App', 'Charts', 'ViewTodo', 'ViewClients', 'ViewLeads', 'ViewMoney', 'ViewMore'];

var index = read(path.join(SRC, 'Index.html'));
var body = index.slice(index.indexOf('<body>') + 6, index.indexOf("<?!= include_('App')")).trim();
var styles = read(path.join(SRC, 'Styles.html')).replace(/^\s*<style>|<\/style>\s*$/g, '');

var macCss = [
  '/* Mac app window */',
  '.install-btn { margin-left: auto; margin-right: 8px; }',
  'html.in-app .topbar { padding-left: 88px; min-height: 64px; -webkit-app-region: drag; app-region: drag; }',
  'html.in-app .topbar button, html.in-app .topbar a { -webkit-app-region: no-drag; app-region: no-drag; }',
  'html.in-app .tabbar { top: 64px; }'
].join('\n');

var server = SERVER.map(function (f) { return guard(read(path.join(SRC, f)), f); }).join('\n\n');
var views = VIEWS.map(function (v) { return read(path.join(SRC, v + '.html')); }).join('\n');

var devScripts = dev ? [
  '<script>' + guard(read(path.join(DEV, 'mock.js')), 'mock.js') + '</script>',
  '<script>' + guard(read(path.join(DEV, 'fixture.js')), 'fixture.js') + '</script>',
  '<script>' + guard(read(path.join(__dirname, 'dev-connector.js')), 'dev-connector.js') + '</script>'
].join('\n') : '';

var html = [
  '<title>323 Hub</title>',
  '<meta name="theme-color" content="#000000">',
  '<script type="application/json" id="claude-artifacts-manifest">{"permissions": []}</script>',
  '<link rel="preconnect" href="https://fonts.googleapis.com">',
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
  '<link href="https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">',
  '<style>',
  ':root { color-scheme: dark; }',
  styles.trim(),
  macCss,
  '</style>',
  body,
  devScripts,
  '<script>\n' + server + '\n</script>',
  '<script>\n' + guard(read(path.join(__dirname, 'bridge.js')), 'bridge.js') + '\n</script>',
  views,
  '<script>\n' + guard(read(path.join(__dirname, 'desktop.js')), 'desktop.js') + '\n</script>'
].join('\n');

fs.writeFileSync(out, html);
console.log(out + ' (' + Math.round(html.length / 1024) + ' KB)');
