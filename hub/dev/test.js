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
  ['Config.js', 'Data.js', 'Write.js', 'Api.js', 'Todo.js', 'Clients.js', 'Leads.js', 'Money.js', 'Social.js', 'Code.js'].forEach(function (f) {
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
  assert.throws(function () { g.addRecord('Payments', { 'Amount': 5 }, 'z'); }, /Fill in Athlete/);
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


/* ---------- Phase B: To-Do ---------- */
test('todo: list, edit and move updates Day and Week', function (g, b, today) {
  var d = g.getTodos();
  assert.strictEqual(d.tasks.length, 7);
  var t = d.tasks.filter(function (x) { return x.task === 'Tomorrow task'; })[0];
  g.updateTask(t.row, t.task, { Date: g.addDays_(today, 7), Task: 'Moved task' });
  var sh = b.getSheetByName('Daily To-Do');
  assert.strictEqual(sh.cell(t.row, 5), 'Moved task');
  assert.strictEqual(sh.cell(t.row, 3), 'W3', 'week label follows the new date');
  assert.throws(function () { g.updateTask(t.row, 'wrong', { Task: 'x' }); }, /changed/);
});

test('todo: move overdue to today', function (g, b, today) {
  var od = g.getTodos().tasks.filter(function (x) { return x.date < today && !x.done; });
  assert.strictEqual(od.length, 1);
  var r = g.moveTasks(od.map(function (x) { return { row: x.row, task: x.task }; }), today);
  assert.strictEqual(r.moved, 1);
  assert.strictEqual(g.getTodos(true).tasks.filter(function (x) { return x.date < today && !x.done; }).length, 0);
});

/* ---------- Phase B: Clients ---------- */
test('clients: list with tags and pay badges', function (g) {
  var d = plain(g.getClients());
  var by = {}; d.clients.forEach(function (c) { by[c.athlete] = c; });
  assert.strictEqual(by['Alex Demo'].tag, 'DDC');
  assert.strictEqual(by['Taylor Demo'].tag, 'Guinea Pig');
  assert.strictEqual(by['Casey Demo'].pay, 'Due');
  assert.strictEqual(by['Alex Demo'].pay, 'Paid');
  assert.ok(by['Alex Demo'].endsSoon, 'term ending within 30 days');
});

test('clients: profile has payments, links, term, onboarding', function (g) {
  var row = g.getClients().clients.filter(function (c) { return c.athlete === 'Casey Demo'; })[0].row;
  var p = plain(g.getClient(row));
  assert.strictEqual(p.payments.length, 1);
  assert.strictEqual(p.totalPaid, 400);
  assert.strictEqual(p.links.payment, 'https://example.com/cpp-m');
  assert.strictEqual(p.links.agreement, 'https://example.com/agreement-cpp');
  assert.strictEqual(p.term.monthsIn >= 1, true);
  assert.deepStrictEqual(p.onboarding.filter(function (o) { return !o.done; }).map(function (o) { return o.name; }), ['Velo Beam set up']);
  var termEnds = p.fields.filter(function (f) { return f.name === 'Term ends'; })[0];
  assert.ok(termEnds.computed);
  var plan = p.fields.filter(function (f) { return f.name === 'Plan'; })[0];
  assert.ok(plan.choices.indexOf('6 months') >= 0, 'plan choices from Settings');
});

test('clients: inline edit, formula column refused, notes prepend newest first', function (g, b) {
  var sh = b.getSheetByName('Clients');
  var r = g.updateClient(3, 'Casey Demo', { 'Velo Beam set up': true, 'Term ends': '2030-01-01' });
  assert.deepStrictEqual(plain(r.skipped), ['Term ends']);
  assert.strictEqual(sh.cell(3, 14), true);
  g.addClientNote(3, 'Casey Demo', 'First');
  var n = g.addClientNote(3, 'Casey Demo', 'Second');
  assert.ok(/^\d+\/\d+\/\d{4}: Second\n\d+\/\d+\/\d{4}: First$/.test(n));
  assert.throws(function () { g.updateClient(3, 'Someone Else', { Notes: 'x' }); }, /changed/);
});

test('clients: add client fills first empty checkbox row, defaults Onboarding', function (g, b) {
  var r = g.addRecord('Clients', { 'Athlete name': 'New Kid', 'Program': 'Mental Game Mentorship', 'Plan': '6 months', 'Monthly rate': '250' }, 'c9');
  assert.strictEqual(r.row, 5);
  assert.deepStrictEqual(plain(r.skipped), ['Monthly rate'], 'rate comes from the Settings formula');
  var sh = b.getSheetByName('Clients');
  assert.strictEqual(sh.cell(5, 10), 'Onboarding');
  assert.strictEqual(sh.cell(5, 6), '');
  var f = plain(g.getFormSpec('Clients')).fields.map(function (x) { return x.name; });
  assert.ok(f.indexOf('Monthly rate') < 0, 'formula column not in the form');
  var spec = plain(g.getFormSpec('Clients'));
  assert.strictEqual(spec.prices['Complete Pitching Program']['6 months'], 325);
});

/* ---------- Phase C: Leads ---------- */
test('leads: stage change sets Last touch, note sets Last touch', function (g, b, today) {
  var d = plain(g.getLeads());
  assert.deepStrictEqual(d.stages.slice(0, 2), ['New', 'Talking']);
  assert.strictEqual(d.discoveryLink, 'https://example.com/discovery');
  var sam = d.leads.filter(function (l) { return l['Athlete name'] === 'Sam Example'; })[0];
  assert.ok(sam._overdue);
  var ex = { 'Parent name': 'Pat Example', 'Athlete name': 'Sam Example' };
  g.updateLead(sam.row, ex, { Stage: 'Call booked' });
  var sh = b.getSheetByName('Leads');
  assert.strictEqual(sh.cell(sam.row, 9), 'Call booked');
  assert.strictEqual(g.Utilities.formatDate(sh.cell(sam.row, 12), 'America/Boise', 'yyyy-MM-dd'), today);
  var r = g.addLeadNote(sam.row, ex, 'Booked for Friday');
  assert.ok(/Booked for Friday$/.test(r.notes));
  assert.throws(function () { g.updateLead(sam.row, { 'Parent name': 'X', 'Athlete name': 'Y' }, { Stage: 'Won' }); }, /changed/);
});

/* ---------- Phase D ---------- */
test('money: split, net, tax, expenses summary by label', function (g) {
  var m = plain(g.getMoney());
  assert.strictEqual(m.month.cashIn, 550);
  assert.strictEqual(m.month.taxRate, 0.25);
  assert.strictEqual(m.month.tax, 137.5);
  assert.strictEqual(m.month.spent, 0, 'This month from the Expenses summary block');
  assert.strictEqual(m.ytd.spent, 246.44);
  assert.strictEqual(m.month.left, 550 - 137.5);
  assert.deepStrictEqual(m.split.ytd.map(function (x) { return x.value; }), [400, 550, 950]);
  assert.strictEqual(m.payments[0].tag !== undefined, true);
  var ddc = m.payments.filter(function (p) { return p.athlete === 'Diamond Development Center'; })[0];
  assert.strictEqual(ddc.tag, 'DDC');
});

test('content: stale pillar, edit through generic editor', function (g, b) {
  var c = plain(g.getContent());
  assert.strictEqual(c.posts.length, 1);
  assert.ok(c.stale.length >= 1);
  var r = g.updateRecord('Content', 2, { Topic: 'Film breakdown launch' }, { Status: 'Posted' });
  assert.deepStrictEqual(plain(r.skipped), []);
  assert.strictEqual(b.getSheetByName('Content').cell(2, 8), 'Posted');
  assert.throws(function () { g.updateRecord('Clients', 2, {}, { Notes: 'x' }); }, /not allowed/);
});

test('wins and history read', function (g) {
  g.addRecord('Wins', { 'Athlete': 'Casey Demo', 'Win': 'Hit 80', 'OK to post': true }, 'w2');
  var w = plain(g.getWins(true));
  assert.strictEqual(w.wins.length, 1);
  assert.strictEqual(w.wins[0]['OK to post'], true);
  var h = plain(g.getHistory());
  assert.strictEqual(h.rows.length, 2);
  assert.strictEqual(h.headers[6], 'MRR');
});

/* ---------- Social ---------- */
test('social: snapshot and weekly log read by labels', function (g) {
  var s = plain(g.getSocial());
  assert.deepStrictEqual(s.accounts, ['@3.23performance', '@dc.throws']);
  assert.strictEqual(s.rows.length, 2);
  assert.strictEqual(s.rows[1]['@dc.throws|Followers'], 604);
  assert.strictEqual(s.rows[1]['@3.23performance|Followers'], 218);
  assert.strictEqual(s.snapshot[2].values['Both accounts'], 822);
  assert.strictEqual(s.weekKey, 'Week of (Monday)');
});

test('social: log next week skips formula cells, update same week', function (g, b, today) {
  var sh = b.getSheetByName('Social');
  var next = g.addDays_(g.mondayOf_(today), 7);
  var r = g.addSocialCheckin({ 'Week of (Monday)': next, '@3.23performance|Followers': '225', '@dc.throws|Followers': '610', '@dc.throws|7-day views': '3,400', '@dc.throws|Gained': '6', Notes: 'Reel hit' }, 's1');
  assert.strictEqual(r.row, 16);
  assert.strictEqual(r.updated, false);
  assert.strictEqual(sh.cell(16, 2), 225);
  assert.strictEqual(sh.cell(16, 11), 3400);
  assert.strictEqual(sh.cell(16, 17), 'Reel hit');
  assert.ok(r.skipped.indexOf('Week of (Monday)') >= 0, 'Week of is a formula in that row');
  assert.ok(r.skipped.indexOf('@dc.throws|Gained') >= 0, 'Gained is a formula');
  var u = g.addSocialCheckin({ 'Week of (Monday)': g.mondayOf_(today), '@3.23performance|7-day views': '15' }, 's2');
  assert.strictEqual(u.row, 15);
  assert.strictEqual(u.updated, true);
  assert.strictEqual(sh.cell(15, 5), 15);
  assert.throws(function () { g.addSocialCheckin({ '@dc.throws|Followers': 'lots' }, 's3'); }, /must be a number/);
});

console.log('\n' + passed + ' passed');
