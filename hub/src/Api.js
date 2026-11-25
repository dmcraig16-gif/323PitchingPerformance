/**
 * Functions the front end calls with google.script.run.
 * Names without a trailing underscore are public to the page. Each one checks the owner first.
 * Error messages never include sheet values, so nothing personal ends up in logs.
 */

/* ---------- Home ---------- */

/** fresh = true skips the 60 second cache (the refresh button). */
function getHome(fresh) {
  assertOwner_();
  var T = CONFIG.TABS;
  fresh = fresh === true;
  var today = todayStr_();
  var sc = readScorecard_(fresh);
  var todo = readTab_(T.TODO, fresh);
  var leads = readTab_(T.LEADS, fresh);
  var clients = readTab_(T.CLIENTS, fresh);
  var payments = readTab_(T.PAYMENTS, fresh);

  var H = CONFIG.H;
  var todos = todo.rows.filter(function (r) { return asYmd_(r[H.todo.date]) === today; })
    .map(todoView_);

  var minutesPlanned = 0, minutesLeft = 0;
  todos.forEach(function (t) {
    minutesPlanned += t.minutes;
    if (!t.done) minutesLeft += t.minutes;
  });

  return {
    today: today,
    weekOf: sc.weekOf,
    cards: {
      mrr: sc.mrr, mrrTarget: sc.mrrTarget, gap: sc.gap, enrolled: sc.enrolled,
      paid323: sc.paid323, cashMonth: sc.cashMonth, spots: sc.spots
    },
    week: { conversations: sc.conversations, callsBooked: sc.callsBooked, callsHeld: sc.callsHeld, closes: sc.closes },
    todos: todos,
    minutesPlanned: minutesPlanned,
    minutesLeft: minutesLeft,
    attention: needsAttention_(today, leads, clients, payments),
    sheetErrors: [].concat(todo.errors, leads.errors, clients.errors, payments.errors)
  };
}

function todoView_(r) {
  var H = CONFIG.H.todo;
  return {
    row: r._row,
    date: asYmd_(r[H.date]),
    day: r[H.day] || '',
    block: r[H.block] || 'Other',
    task: r[H.task] || '',
    minutes: asNumber_(r[H.minutes]),
    done: r[H.done] === true
  };
}

function needsAttention_(today, leads, clients, payments) {
  var H = CONFIG.H;
  var items = [];
  var soon = addDays_(today, 7);

  leads.rows.forEach(function (l) {
    var due = asYmd_(l[H.leads.nextDue]);
    var stage = l[H.leads.stage] || '';
    if (due && due < today && CONFIG.CLOSED_LEAD_STAGES.indexOf(stage) < 0) {
      items.push({
        kind: 'lead', level: 'overdue', tab: CONFIG.TABS.LEADS, row: l._row,
        title: l[H.leads.athlete] || l[H.leads.parent] || 'Lead',
        detail: 'Follow-up was due ' + due + (l[H.leads.nextAction] ? '. ' + l[H.leads.nextAction] : ''),
        date: due
      });
    }
  });

  clients.rows.forEach(function (c) {
    var status = c[H.clients.status] || '';
    if (CONFIG.ACTIVE_CLIENT_STATUSES.indexOf(status) < 0) return;
    var name = c[H.clients.athlete];
    var tag = programTag_(c[H.clients.program]);
    var paid = String(c[H.clients.paid] == null ? '' : c[H.clients.paid]).trim();
    if (CONFIG.PAID_OK_VALUES.indexOf(paid) < 0) {
      items.push({
        kind: 'client-pay', level: 'due', tab: CONFIG.TABS.CLIENTS, row: c._row, tag: tag,
        title: name, detail: 'Paid this month: ' + paid
      });
    }
    var missing = H.clients.onboarding.filter(function (h) { return h in c && c[h] !== true; });
    if (missing.length) {
      items.push({
        kind: 'onboarding', level: 'info', tab: CONFIG.TABS.CLIENTS, row: c._row, tag: tag,
        title: name, detail: 'Onboarding left: ' + missing.join(', ')
      });
    }
  });

  payments.rows.forEach(function (p) {
    var due = asYmd_(p[H.payments.nextDue]);
    if (!due || p[H.payments.status] === 'Paid' || due > soon) return;
    items.push({
      kind: 'payment', level: due < today ? 'overdue' : 'due', tab: CONFIG.TABS.PAYMENTS, row: p._row,
      tag: programTag_(p[H.payments.program] || p[H.payments.athlete]),
      title: p[H.payments.athlete], detail: (due < today ? 'Payment past due since ' : 'Payment due ') + due, date: due
    });
  });

  var rank = { overdue: 0, due: 1, info: 2 };
  items.sort(function (a, b) { return rank[a.level] - rank[b.level] || String(a.date || '').localeCompare(String(b.date || '')); });
  return items;
}

/* ---------- To-Do ---------- */

function setTaskDone(row, task, done) {
  assertOwner_();
  var H = CONFIG.H.todo;
  var changes = {}; changes[H.done] = !!done;
  var expect = {}; expect[H.task] = task;
  var res = updateRow_(CONFIG.TABS.TODO, row, changes, expect);
  if (res.written.indexOf(H.done) < 0) throw new Error('Done could not be saved (that cell holds a formula).');
  return { ok: true };
}

/* ---------- Add forms ---------- */

/** Field list for an add form, built from the live headers, so new columns show up on their own. */
function getFormSpec(tab) {
  assertOwner_();
  var cfg = CONFIG.ADD_FORMS[tab];
  if (!cfg) throw new Error('No add form for that tab.');
  var t = readTab_(tab);
  var meta = t.meta;
  var settings = tab === CONFIG.TABS.CLIENTS ? readSettings_() : null;
  var fields = meta.headers.filter(function (h) {
    return !meta.cols[h].computed && cfg.hidden.indexOf(h) < 0;
  }).map(function (h) {
    var col = meta.cols[h];
    var choices = col.choices, source = col.choiceSource;
    if (settings && h === CONFIG.H.clients.program) {
      if (!choices) choices = settings.programs.map(function (p) { return String(p.Program); });
      source = 'list';
    }
    if (settings && !choices && h === CONFIG.H.clients.plan) { choices = planNames_(settings); source = 'list'; }
    var suggestions = null;
    if (!choices && col.type === 'text') suggestions = distinctValues_(t.rows, h, 15);
    return {
      name: h,
      type: col.type,
      choices: choices,
      choiceSource: source,
      suggestions: suggestions,
      primary: cfg.primary.indexOf(h) >= 0,
      required: (CONFIG.KEY_HEADERS[tab] || []).indexOf(h) === 0,
      defaultToday: (CONFIG.TODAY_DEFAULTS[tab] || []).indexOf(h) >= 0
    };
  });
  fields.sort(function (a, b) {
    var ia = cfg.primary.indexOf(a.name), ib = cfg.primary.indexOf(b.name);
    if (ia < 0 && ib < 0) return 0;
    if (ia < 0) return 1;
    if (ib < 0) return -1;
    return ia - ib;
  });
  var out = { tab: tab, title: cfg.title, today: todayStr_(), fields: fields };
  if (settings) out.prices = priceTable_(settings);
  return out;
}

/**
 * Values already used in a column, offered as typing suggestions.
 * Only for category-like columns (values repeat), so names and contacts are never suggested.
 */
function distinctValues_(rows, h, max) {
  var count = {}, total = 0;
  rows.forEach(function (r) {
    var v = r[h];
    if (typeof v !== 'string') return;
    v = v.trim();
    if (!v || v.length > 40) return;
    count[v] = (count[v] || 0) + 1;
    total++;
  });
  var keys = Object.keys(count);
  var repeats = keys.some(function (k) { return count[k] > 1; });
  if (keys.length < 2 || !repeats || keys.length > total * 0.6) return null;
  return keys.sort().slice(0, max);
}

/**
 * Append one row to an allowed tab. requestId makes a repeated submit a no-op.
 */
function addRecord(tab, record, requestId) {
  assertOwner_();
  if (!CONFIG.ADD_FORMS[tab]) throw new Error('Adding rows to that tab is not allowed.');
  return once_(requestId, function () {
    var rec = {};
    Object.keys(record || {}).forEach(function (k) {
      var v = record[k];
      if (v !== '' && v !== null && v !== undefined) rec[k] = v;
    });
    var keys = CONFIG.KEY_HEADERS[tab] || [];
    if (keys.length && !keys.some(function (k) { return rec[k] !== undefined && String(rec[k]).trim() !== ''; })) {
      throw new Error('Fill in ' + keys.join(' or ') + ' first.');
    }
    var today = todayStr_();
    (CONFIG.TODAY_DEFAULTS[tab] || []).forEach(function (h) { if (!rec[h]) rec[h] = today; });
    var noteH = CONFIG.NOTE_HEADERS[tab];
    if (noteH && rec[noteH]) rec[noteH] = stampNote_('', rec[noteH]);
    var defs = CONFIG.NEW_ROW_DEFAULTS[tab] || {};
    Object.keys(defs).forEach(function (h) { if (!rec[h]) rec[h] = defs[h]; });
    if (tab === CONFIG.TABS.TODO) deriveTodoFields_(rec);

    var res = appendRow_(tab, rec);
    return { ok: true, row: res.row, skipped: res.skipped.map(function (s) { return s.header; }) };
  });
}

/** Fill Day (Mon, Tue...) and Week (W1, W2...) for a new task, matching how the tab already labels weeks. */
function deriveTodoFields_(rec) {
  var H = CONFIG.H.todo;
  var ymd = asYmd_(rec[H.date]);
  if (!ymd) return;
  var p = ymd.split('-');
  var d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));
  if (!rec[H.day]) rec[H.day] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getUTCDay()];
  if (rec[H.week]) return;
  var monday = mondayOf_(ymd);
  var rows = readTab_(CONFIG.TABS.TODO).rows;
  // Reuse the label of a task in the same week; otherwise count on from the most recent labeled task.
  var ref = null;
  for (var i = 0; i < rows.length; i++) {
    var rd = asYmd_(rows[i][H.date]);
    var wk = String(rows[i][H.week] || '');
    if (!rd || !/^W\d+$/.test(wk)) continue;
    if (mondayOf_(rd) === monday) { rec[H.week] = wk; return; }
    if (!ref || rd > ref.date) ref = { date: rd, monday: mondayOf_(rd), n: Number(wk.slice(1)) };
  }
  if (ref) {
    var weeks = Math.round((Date.parse(monday) - Date.parse(ref.monday)) / (7 * 864e5));
    var n = ref.n + weeks;
    if (n >= 1) rec[H.week] = 'W' + n;
  }
}

function mondayOf_(ymd) {
  var p = ymd.split('-');
  var d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));
  var back = (d.getUTCDay() + 6) % 7;
  return addDays_(ymd, -back);
}

/* ---------- Misc ---------- */

function getSheetUrl() {
  assertOwner_();
  return ss_().getUrl();
}

/** { program: { plan: monthly rate } } from Settings, used to prefill Monthly rate. */
function priceTable_(settings) {
  var plans = planNames_(settings);
  var out = {};
  settings.programs.forEach(function (p) {
    out[p.Program] = {};
    plans.forEach(function (pl) { if (typeof p[pl] === 'number') out[p.Program][pl] = p[pl]; });
  });
  return out;
}
