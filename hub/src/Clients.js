/**
 * Clients screen and client profile.
 * Payments and Wins are matched to a client by athlete name.
 */

function sameName_(a, b) {
  return norm_(a) !== '' && norm_(a) === norm_(b);
}

function paymentsFor_(payments, athlete) {
  var P = CONFIG.H.payments;
  return payments.rows.filter(function (p) { return sameName_(p[P.athlete], athlete); })
    .map(function (p) {
      return {
        row: p._row, date: asYmd_(p[P.date]), amount: asNumber_(p[P.amount]),
        method: p['Paid through'] || '', program: p[P.program] || '', notes: p['Notes'] || '',
        nextDue: asYmd_(p[P.nextDue]), status: p[P.status] || ''
      };
    })
    .sort(function (a, b) { return b.date.localeCompare(a.date); });
}

/** Paid / Due / Overdue badge, plus No charge and Prepaid as plain labels. */
function payBadge_(client, pays) {
  var paid = String(client[CONFIG.H.clients.paid] == null ? '' : client[CONFIG.H.clients.paid]).trim();
  if (pays.some(function (p) { return /^overdue$/i.test(p.status); })) return 'Overdue';
  if (paid === 'Paid') return 'Paid';
  if (paid === 'Due') return 'Due';
  return paid;
}

function termInfo_(client, today) {
  var start = asYmd_(client['Start date']);
  var ends = asYmd_(client['Term ends']);
  var info = { start: start, ends: ends, months: client['Term (months)'] || '', monthsIn: null, daysLeft: null, endsSoon: false };
  if (start && start <= today) {
    var s = start.split('-').map(Number), t = today.split('-').map(Number);
    var m = (t[0] - s[0]) * 12 + (t[1] - s[1]) - (t[2] < s[2] ? 1 : 0);
    info.monthsIn = Math.max(0, m);
  }
  if (ends) {
    info.daysLeft = Math.round((Date.parse(ends) - Date.parse(today)) / 864e5);
    info.endsSoon = info.daysLeft >= 0 && info.daysLeft <= 30;
  }
  return info;
}

/** The Settings link column for a plan: "6 months" -> "6-month link". */
function planLink_(settings, program, plan) {
  var p = settings.programs.filter(function (x) { return sameName_(x.Program, program); })[0];
  if (!p || !plan) return '';
  var want = norm_(String(plan).replace(/s\b/gi, ''));
  var key = Object.keys(p).filter(function (h) {
    var n = norm_(h);
    return /link$/.test(n) && n.indexOf(want) === 0;
  })[0];
  return key ? String(p[key] || '') : '';
}

function getClients(fresh) {
  assertOwner_();
  fresh = fresh === true;
  var C = CONFIG.H.clients;
  var today = todayStr_();
  var clients = readTab_(CONFIG.TABS.CLIENTS, fresh);
  var payments = readTab_(CONFIG.TABS.PAYMENTS, fresh);
  var list = clients.rows.map(function (c) {
    var pays = paymentsFor_(payments, c[C.athlete]);
    var term = termInfo_(c, today);
    return {
      row: c._row, athlete: c[C.athlete], parent: c[C.parent] || '', email: c['Parent email'] || '',
      program: c[C.program] || '', plan: c[C.plan] || '', rate: c['Monthly rate'], status: c[C.status] || '',
      tag: programTag_(c[C.program]), pay: payBadge_(c, pays), endsSoon: term.endsSoon, daysLeft: term.daysLeft
    };
  });
  var statusCol = clients.meta.cols[C.status];
  return {
    today: today,
    clients: list,
    statuses: (statusCol && statusCol.choices) || [],
    programs: unique_(list.map(function (c) { return c.program; }))
  };
}

function unique_(arr) {
  var seen = {}, out = [];
  arr.forEach(function (v) { if (v && !seen[v]) { seen[v] = 1; out.push(v); } });
  return out.sort();
}

function getClient(row, fresh) {
  assertOwner_();
  fresh = fresh === true;
  var C = CONFIG.H.clients;
  var today = todayStr_();
  var clients = readTab_(CONFIG.TABS.CLIENTS, fresh);
  var c = clients.rows.filter(function (r) { return r._row === Number(row); })[0];
  if (!c) throw new Error('Client not found. Refresh and try again.');
  var payments = readTab_(CONFIG.TABS.PAYMENTS, fresh);
  var wins = readTab_(CONFIG.TABS.WINS, fresh);
  var settings = readSettings_(fresh);
  var meta = clients.meta;
  var pays = paymentsFor_(payments, c[C.athlete]);
  var total = pays.reduce(function (s, p) { return s + p.amount; }, 0);

  var fields = meta.headers.map(function (h) {
    var col = meta.cols[h];
    var choices = col.choices;
    if (!choices && h === C.program) choices = settings.programs.map(function (p) { return String(p.Program); });
    if (!choices && h === C.plan) choices = planNames_(settings);
    if (choices && c[h] !== '' && c[h] != null && choices.indexOf(String(c[h])) < 0) choices = choices.concat([String(c[h])]);
    return { name: h, value: c[h], type: col.type, choices: choices, computed: col.computed };
  });

  return {
    row: c._row,
    athlete: c[C.athlete],
    today: today,
    tag: programTag_(c[C.program]),
    pay: payBadge_(c, pays),
    paidThisMonth: c[C.paid] || '',
    fields: fields,
    onboarding: C.onboarding.filter(function (h) { return h in c; }).map(function (h) {
      return { name: h, done: c[h] === true, computed: meta.cols[h].computed };
    }),
    term: termInfo_(c, today),
    payments: pays,
    totalPaid: total,
    nextDue: pays.length ? pays[0].nextDue : '',
    wins: wins.rows.filter(function (w) { return sameName_(w['Athlete'], c[C.athlete]); })
      .map(function (w) { var o = {}; wins.headers.forEach(function (h) { o[h] = w[h]; }); o._row = w._row; return o; })
      .sort(function (a, b) { return String(b['Date']).localeCompare(String(a['Date'])); }),
    notes: c[CONFIG.NOTE_HEADERS[CONFIG.TABS.CLIENTS]] || '',
    links: {
      email: c['Parent email'] || '',
      payment: planLink_(settings, c[C.program], c[C.plan]),
      agreement: agreementFor_(settings, c[C.program])
    }
  };
}

function agreementFor_(settings, program) {
  var key = Object.keys(settings.agreements).filter(function (k) { return sameName_(k, program); })[0];
  return key ? String(settings.agreements[key]) : '';
}

/** Plan names from the Settings price table headers (Month to month, 6 months, 12 months). */
function planNames_(settings) {
  return (settings.programHeaders || []).filter(function (h) {
    var n = norm_(h);
    return n !== 'program' && n !== 'paysthrough' && !/link$/.test(n);
  });
}

/** Save one or more fields on a client row. expectName guards against a moved row. */
function updateClient(row, expectName, changes) {
  assertOwner_();
  var res = updateRow_(CONFIG.TABS.CLIENTS, row, changes || {}, expectAthlete_(expectName));
  return { ok: true, written: res.written, skipped: res.skipped.map(function (s) { return s.header; }) };
}

function addClientNote(row, expectName, text) {
  assertOwner_();
  return prependNote_(CONFIG.TABS.CLIENTS, row, CONFIG.NOTE_HEADERS[CONFIG.TABS.CLIENTS], text, expectAthlete_(expectName));
}

function expectAthlete_(name) {
  var e = {}; e[CONFIG.H.clients.athlete] = name; return e;
}
