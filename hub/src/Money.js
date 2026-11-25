/**
 * Money screen, Content, Wins, Scorecard history, and a generic row editor.
 */

/** Values to the right of a label cell anywhere on a tab, e.g. 'Total spent' -> [This month, Year to date]. */
function labelRow_(tab, label) {
  var grid = sheet_(tab).getDataRange().getValues();
  var at = findCell_(grid, label, { exact: true }) || findCell_(grid, label);
  if (!at) return null;
  return { values: grid[at.r].slice(at.c + 1), header: findHeaderAbove_(grid, at) };
}

/** The header row above a summary label (first row above with text in the next column). */
function findHeaderAbove_(grid, at) {
  for (var r = at.r - 1; r >= 0; r--) {
    if (String(grid[r][at.c + 1] || '').trim()) return grid[r].slice(at.c + 1).map(String);
  }
  return [];
}

function getMoney(fresh) {
  assertOwner_();
  fresh = fresh === true;
  var T = CONFIG.TABS;
  var today = todayStr_();
  var month = today.slice(0, 7), year = today.slice(0, 4);
  var sc = readScorecard_(fresh);
  var pays = readTab_(T.PAYMENTS, fresh);
  var exps = readTab_(T.EXPENSES, fresh);

  // Expenses summary block (This month, Year to date) by label.
  var spent = labelRow_(T.EXPENSES, 'Total spent');
  var spentMonth = null, spentYtd = null;
  if (spent) {
    var hm = spent.header.map(norm_);
    spentMonth = spent.values[hm.indexOf('thismonth')];
    spentYtd = spent.values[hm.indexOf('yeartodate')];
  }
  // Fall back to summing rows if the block is missing.
  if (spentMonth == null || spentYtd == null) {
    spentMonth = 0; spentYtd = 0;
    exps.rows.forEach(function (e) {
      var d = asYmd_(e['Date']);
      if (d.slice(0, 7) === month) spentMonth += asNumber_(e['Amount']);
      if (d.slice(0, 4) === year) spentYtd += asNumber_(e['Amount']);
    });
  }

  var rateRow = labelRow_(T.MONEY, 'Tax set-aside rate');
  var taxRate = rateRow ? asNumber_(rateRow.values[0]) : 0;

  // This month's split from the Scorecard cash table (323 vs DDC).
  var cash = sc.cashByMonth;
  var cols = cash.headers.slice(1);
  var thisMonthRow = cash.rows.filter(function (r) { return String(r[cash.headers[0]]).slice(0, 7) === month; })[0] || {};
  var ytdRow = cash.rows.filter(function (r) { return norm_(r[cash.headers[0]]) === 'yeartodate'; })[0] || {};

  var cashIn = asNumber_(sc.cashMonth);
  var net = cashIn - asNumber_(spentMonth);
  var tax = cashIn * taxRate;

  return {
    today: today,
    cash: { headers: cash.headers, rows: cash.rows, cols: cols },
    split: {
      month: cols.map(function (c) { return { name: c, value: asNumber_(thisMonthRow[c]) }; }),
      ytd: cols.map(function (c) { return { name: c, value: asNumber_(ytdRow[c]) }; })
    },
    month: { cashIn: cashIn, spent: asNumber_(spentMonth), net: net, taxRate: taxRate, tax: tax, left: net - tax },
    ytd: { cashIn: asNumber_(sc.cashYtd), spent: asNumber_(spentYtd) },
    payments: pays.rows.map(function (p) {
      return {
        row: p._row, date: asYmd_(p['Date received']), athlete: p['Athlete'], program: p['Program'] || '',
        method: p['Paid through'] || '', amount: asNumber_(p['Amount']), notes: p['Notes'] || '',
        nextDue: asYmd_(p['Next payment due']), status: p['Status'] || '',
        tag: programTag_(p['Program'] || p['Athlete'])
      };
    }).sort(function (a, b) { return b.date.localeCompare(a.date); }),
    expenses: exps.rows.map(function (e) {
      var o = { row: e._row };
      exps.headers.forEach(function (h) { o[h] = e[h]; });
      o.date = asYmd_(e['Date']); o.amount = asNumber_(e['Amount']);
      return o;
    }).sort(function (a, b) { return b.date.localeCompare(a.date); })
  };
}

/* ---------- Content ---------- */

function getContent(fresh) {
  assertOwner_();
  fresh = fresh === true;
  var today = todayStr_();
  var t = readTab_(CONFIG.TABS.CONTENT, fresh);
  var posts = t.rows.map(function (r) {
    var o = { row: r._row };
    t.headers.forEach(function (h) { o[h] = r[h]; });
    o.date = asYmd_(r['Post date']);
    return o;
  });
  var pillarCol = t.meta.cols['Pillar'], statusCol = t.meta.cols['Status'];
  var pillars = (pillarCol && pillarCol.choices) || unique_(posts.map(function (p) { return p['Pillar']; }));
  var statuses = (statusCol && statusCol.choices) || unique_(posts.map(function (p) { return p['Status']; }));

  // A post counts as posted if its Status says so, or (when no status says so) its date has passed.
  var postedWord = statuses.filter(function (s) { return /posted|live|published/i.test(s); });
  function isPosted(p) {
    if (postedWord.length) return postedWord.indexOf(p['Status']) >= 0;
    return p.date && p.date <= today;
  }
  var last = {};
  posts.forEach(function (p) {
    if (!p['Pillar'] || !isPosted(p)) return;
    if (!last[p['Pillar']] || p.date > last[p['Pillar']]) last[p['Pillar']] = p.date;
  });
  var stale = pillars.map(function (pl) {
    var d = last[pl] || '';
    return { pillar: pl, last: d, days: d ? Math.round((Date.parse(today) - Date.parse(d)) / 864e5) : null };
  }).sort(function (a, b) {
    if (a.days === null) return -1;
    if (b.days === null) return 1;
    return b.days - a.days;
  });

  return { today: today, posts: posts, pillars: pillars, statuses: statuses, stale: stale, postedRule: postedWord.length ? 'status' : 'date' };
}

/* ---------- Wins ---------- */

function getWins(fresh) {
  assertOwner_();
  var t = readTab_(CONFIG.TABS.WINS, fresh === true);
  var wins = t.rows.map(function (r) {
    var o = { row: r._row };
    t.headers.forEach(function (h) { o[h] = r[h]; });
    return o;
  }).sort(function (a, b) { return String(b['Date']).localeCompare(String(a['Date'])); });
  return { wins: wins, athletes: unique_(wins.map(function (w) { return w['Athlete']; })) };
}

/* ---------- Scorecard history ---------- */

function getHistory(fresh) {
  assertOwner_();
  var sc = readScorecard_(fresh === true);
  return { headers: sc.weeklyLog.headers, rows: sc.weeklyLog.rows };
}

/* ---------- generic row editor ---------- */

/** Editable fields for a tab: every column that is not formula-filled. */
function getEditSpec(tab) {
  assertOwner_();
  if (CONFIG.EDIT_TABS.indexOf(tab) < 0) throw new Error('Editing that tab is not allowed here.');
  var t = readTab_(tab);
  return {
    tab: tab,
    fields: t.meta.headers.filter(function (h) { return !t.meta.cols[h].computed; }).map(function (h) {
      var c = t.meta.cols[h];
      return { name: h, type: c.type, choices: c.choices, choiceSource: c.choiceSource };
    })
  };
}

/** Update a row on an allowed tab. expect: values the page last saw, checked before writing. */
function updateRecord(tab, row, expect, changes) {
  assertOwner_();
  if (CONFIG.EDIT_TABS.indexOf(tab) < 0) throw new Error('Editing that tab is not allowed here.');
  var res = updateRow_(tab, row, changes || {}, expect || {});
  return { ok: true, skipped: res.skipped.map(function (s) { return s.header; }) };
}
