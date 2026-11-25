/*
 * Runs the server code against the fake sheet and checks the data-layer rules.
 * Usage: node hub/dev/test.js
 */
'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');
var assert = require('assert');

var SRC = path.join(__dirname, '..', 'src');

function load() {
  var ctx = vm.createContext({ console: console, Intl: Intl, Date: Date, JSON: JSON, Math: Math });
  vm.runInContext(fs.readFileSync(path.join(__dirname, 'mock.js'), 'utf8'), ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, 'fixture.js'), 'utf8'), ctx);
  var today = ctx.HubMock.Utilities.formatDate(new Date(), 'America/Boise', 'yyyy-MM-dd');
  var env = ctx.HubMock.install(ctx, ctx.HubFixture.build(today));
  ['Config.js', 'Data.js', 'Write.js', 'Api.js', 'Code.js'].forEach(function (f) {
    vm.runInContext(fs.readFileSync(path.join(SRC, f), 'utf8'), ctx, { filename: f });
  });
  ctx.HtmlService = {};
  return { ctx: ctx, book: env.book, today: today };
}

var passed = 0;
function test(name, fn) {
  var env = load();
  try { fn(env.ctx, env.book, env.today); passed++; console.log('ok   ' + name); }
  catch (e) { console.log('FAIL ' + name + '\n     ' + (e && e.stack || e)); process.exitCode = 1; }
}
// vm objects come from another realm, so compare as plain JSON.
function plain(x) { return JSON.parse(JSON.stringify(x)); }

test('home: scorecard values found by label', function (g) {
  var h = g.getHome();
  assert.strictEqual(h.cards.mrr, 400);
  assert.strictEqual(h.cards.gap, 4600);
  assert.strictEqual(h.cards.paid323, 1);
  assert.strictEqual(h.cards.cashMonth, 550);
  assert.strictEqual(h.cards.spots, 4);
  assert.strictEqual(h.week.callsBooked, 1, 'Calls booked must come from the top block, not the weekly log');
  assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(h.weekOf));
});

test('home: today todos and minutes left', function (g, b, today) {
  var h = g.getHome();
  assert.strictEqual(h.todos.length, 4);
  assert.strictEqual(h.minutesPlanned, 75);
  assert.strictEqual(h.minutesLeft, 55);
  h.todos.forEach(function (t) { assert.strictEqual(t.date, today); });
});

test('home: needs attention rules', function (g) {
  var a = plain(g.getHome().attention);
  var kinds = a.map(function (x) { return x.kind + ':' + x.title; });
  assert.ok(kinds.indexOf('lead:Sam Example') >= 0, 'overdue lead');
  assert.ok(kinds.indexOf('lead:Jordan Sample') < 0, 'Won leads are not overdue');
  assert.ok(kinds.indexOf('client-pay:Casey Demo') >= 0, 'Due client');
  assert.ok(kinds.indexOf('client-pay:Taylor Demo') < 0, 'No charge is fine');
  assert.ok(kinds.indexOf('payment:Casey Demo') >= 0, 'payment due within 7 days');
  assert.ok(kinds.indexOf('onboarding:Alex Demo') >= 0, 'onboarding checklist');
  var alex = a.filter(function (x) { return x.title === 'Alex Demo'; })[0];
  assert.strictEqual(alex.tag, 'DDC');
  assert.strictEqual(a[0].level, 'overdue', 'overdue sorts first');
});

test('home: #REF! is flagged, not hidden', function (g) {
  var e = plain(g.getHome().sheetErrors);
  assert.deepStrictEqual(e, [{ tab: 'Payments', row: 2, header: 'Program', error: '#REF!' }]);
});

test('read: blank, checkbox-only and date-only rows are skipped', function (g) {
  assert.strictEqual(g.readTab_('Leads').rows.length, 2);
  assert.strictEqual(g.readTab_('Clients').rows.length, 3);
  assert.strictEqual(g.readTab_('Wins').rows.length, 0);
});

test('read: summary block to the right is not a column', function (g) {
  var h = plain(g.readTab_('Expenses').headers);
  assert.strictEqual(h[h.length - 1], 'Notes');
  assert.strictEqual(plain(g.readTab_('Money').headers).length, 6);
});

test('meta: ARRAYFORMULA columns are computed', function (g) {
  var c = g.readTab_('Payments').meta.cols;
  assert.ok(c['Program'].computed && c['Status'].computed && !c['Amount'].computed);
  assert.strictEqual(c['Amount'].type, 'number');
  assert.strictEqual(c['Date received'].type, 'date');
  var cl = g.readTab_('Clients').meta.cols;
  assert.ok(cl['Term ends'].computed && cl['Paid this month'].computed);
  assert.strictEqual(cl['Agreement signed'].type, 'bool');
});

test('settings: programs and links read by label', function (g) {
  var s = g.readSettings_();
  assert.strictEqual(s.programs.length, 4);
  assert.strictEqual(s.programs[3].Program, 'Guinea Pig');
  assert.strictEqual(s.mrrTarget, 5000);
  assert.strictEqual(s.secondStep, 10);
  assert.strictEqual(s.discoveryLink, 'https://example.com/discovery');
  assert.strictEqual(s.agreements['Complete Pitching Program'], 'https://example.com/agreement-cpp');
});

test('scorecard: cash by month and weekly log tables', function (g) {
  var s = g.readScorecard_();
  assert.strictEqual(s.cashByMonth.rows.length, 13);
  assert.strictEqual(s.cashByMonth.rows[12]['Cash collected'], 'Year to date');
  assert.strictEqual(s.weeklyLog.rows.length, 2);
  assert.strictEqual(s.weeklyLog.headers[0], 'Week of');
});

test('write: toggle task writes Done only', function (g, b) {
  var row = g.getHome().todos[1].row;
  g.setTaskDone(row, g.getHome().todos[1].task, true);
  var sh = b.getSheetByName('Daily To-Do');
  assert.strictEqual(sh.cell(row, 7), true);
  assert.strictEqual(sh.writes.length, 1);
  assert.strictEqual(g.getHome().minutesLeft, 30, 'cache was cleared after write');
});

test('write: toggle refuses if the row moved', function (g) {
  var row = g.getHome().todos[1].row;
  assert.throws(function () { g.setTaskDone(row, 'Some other task', true); }, /changed/);
});

test('append: lead goes after the date-only row, defaults filled', function (g, b, today) {
  var r = g.addRecord('Leads', { 'Parent name': 'New Parent', 'Notes': 'Asked about price' }, 'r1');
  assert.strictEqual(r.row, 5);
  var sh = b.getSheetByName('Leads');
  assert.strictEqual(sh.cell(5, 2), 'New Parent');
  assert.strictEqual(sh.cell(5, 9), 'New');
  assert.ok(/^\d{1,2}\/\d{1,2}\/\d{4}: Asked about price$/.test(sh.cell(5, 15)));
  assert.strictEqual(g.Utilities.formatDate(sh.cell(5, 1), 'America/Boise', 'yyyy-MM-dd'), today);
});

test('append: same requestId twice writes once', function (g, b) {
  g.addRecord('Wins', { 'Athlete': 'Casey Demo', 'Win': 'Hit 80' }, 'same');
  g.addRecord('Wins', { 'Athlete': 'Casey Demo', 'Win': 'Hit 80' }, 'same');
  assert.strictEqual(g.readTab_('Wins', true).rows.length, 1);
});

test('append: checkbox-only rows are filled, not skipped past', function (g) {
  var r = g.addRecord('Wins', { 'Athlete': 'Casey Demo', 'Win': 'Hit 80' }, 'w1');
  assert.strictEqual(r.row, 2);
});

test('append: payment never writes formula columns', function (g, b) {
  var r = g.addRecord('Payments', { 'Athlete': 'Casey Demo', 'Amount': '$400', 'Program': 'X', 'Status': 'Y' }, 'p1');
  assert.strictEqual(r.row, 5);
  assert.deepStrictEqual(plain(r.skipped).sort(), ['Program', 'Status']);
  var sh = b.getSheetByName('Payments');
  assert.strictEqual(sh.cell(5, 5), 400);
  assert.strictEqual(sh.cell(5, 3), '');
});

test('append: typed text starting with = is stored as text', function (g, b) {
  g.addRecord('Expenses', { 'Vendor': '=HYPERLINK("x")', 'Amount': '12.50' }, 'e1');
  var sh = b.getSheetByName('Expenses');
  assert.strictEqual(sh.cell(4, 2), '=HYPERLINK("x")');
  assert.strictEqual(sh.cell(4, 5), 12.5);
  assert.strictEqual(sh.cell(4, 11), 'Equipment', 'summary block untouched');
});

test('append: task gets Day and Week', function (g, b, today) {
  var r = g.addRecord('Daily To-Do', { 'Date': today, 'Block': 'Build', 'Task': 'New one', 'Minutes': '10' }, 't1');
  var sh = b.getSheetByName('Daily To-Do');
  assert.strictEqual(sh.cell(r.row, 3), 'W2');
  assert.ok(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)$/.test(sh.cell(r.row, 2)));
  assert.strictEqual(sh.cell(r.row, 6), 10);
});

test('append: key field required, unknown tabs refused', function (g) {
  assert.throws(function () { g.addRecord('Daily To-Do', { 'Block': 'Build' }, 'x'); }, /Fill in/);
  assert.throws(function () { g.addRecord('Scorecard', { a: 1 }, 'y'); }, /not allowed/);
  assert.throws(function () { g.addRecord('Clients', { 'Athlete name': 'x' }, 'z'); }, /not allowed/);
});

test('new column: shows up in the form and does not break reads', function (g, b) {
  var sh = b.getSheetByName('Leads');
  sh.values[0].push('Priority');
  var spec = g.getFormSpec('Leads');
  assert.ok(spec.fields.some(function (f) { return f.name === 'Priority' && !f.primary; }));
  var r = g.addRecord('Leads', { 'Parent name': 'P2', 'Priority': 'High' }, 'c1');
  assert.strictEqual(sh.cell(r.row, 16), 'High');
  assert.strictEqual(g.getHome().cards.mrr, 400);
});

test('form spec: dropdowns from validation, formula columns hidden', function (g) {
  var s = plain(g.getFormSpec('Payments'));
  var names = s.fields.map(function (f) { return f.name; });
  assert.ok(names.indexOf('Program') < 0 && names.indexOf('Status') < 0);
  var pt = s.fields.filter(function (f) { return f.name === 'Paid through'; })[0];
  assert.deepStrictEqual(pt.choices, ['Stripe', 'Venmo', 'Other']);
  var ath = s.fields.filter(function (f) { return f.name === 'Athlete'; })[0];
  assert.strictEqual(ath.choiceSource, 'range');
  assert.ok(ath.choices.indexOf('Casey Demo') >= 0);
  assert.strictEqual(names[0], 'Date received');
});

test('owner check blocks anyone else', function (g) {
  g.Session = { getActiveUser: function () { return { getEmail: function () { return 'someone@example.com'; } }; } };
  assert.throws(function () { g.getHome(); }, /Not authorized/);
});

console.log('\n' + passed + ' passed');
