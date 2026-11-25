/**
 * Leads pipeline.
 * Rows are guarded by their names (Parent name + Athlete name) so a sorted sheet never gets the wrong row written.
 */

function leadExpect_(lead) {
  var L = CONFIG.H.leads, e = {};
  e[L.parent] = lead[L.parent] == null ? '' : lead[L.parent];
  e[L.athlete] = lead[L.athlete] == null ? '' : lead[L.athlete];
  return e;
}

function getLeads(fresh) {
  assertOwner_();
  fresh = fresh === true;
  var L = CONFIG.H.leads;
  var today = todayStr_();
  var t = readTab_(CONFIG.TABS.LEADS, fresh);
  var settings = readSettings_(fresh);
  var stageCol = t.meta.cols[L.stage];
  var stages = (stageCol && stageCol.choices) || ['New', 'Talking', 'Call booked', 'Call held', 'Recap sent', 'Won', 'Lost', 'Nurture'];
  var leads = t.rows.map(function (r) {
    var o = { row: r._row };
    t.headers.forEach(function (h) { o[h] = r[h]; });
    var due = asYmd_(r[L.nextDue]);
    o._overdue = !!due && due < today && CONFIG.CLOSED_LEAD_STAGES.indexOf(r[L.stage]) < 0;
    return o;
  });
  return {
    today: today,
    stages: stages,
    leads: leads,
    fields: t.meta.headers.map(function (h) {
      var c = t.meta.cols[h];
      return { name: h, type: c.type, choices: c.choices, computed: c.computed };
    }),
    discoveryLink: settings.discoveryLink || '',
    programs: settings.programs.map(function (p) { return String(p.Program); })
  };
}

/**
 * Save fields on a lead. expect holds the Parent name and Athlete name the page last saw.
 * Changing Stage sets Last touch to today.
 */
function updateLead(row, expect, changes) {
  assertOwner_();
  var L = CONFIG.H.leads;
  changes = changes || {};
  if (changes[L.stage] !== undefined && changes[L.lastTouch] === undefined) changes[L.lastTouch] = todayStr_();
  var res = updateRow_(CONFIG.TABS.LEADS, row, changes, expect || {});
  return { ok: true, written: res.written, skipped: res.skipped.map(function (s) { return s.header; }) };
}

/** Add a timestamped note and set Last touch to today. */
function addLeadNote(row, expect, text) {
  assertOwner_();
  var L = CONFIG.H.leads;
  var notes = prependNote_(CONFIG.TABS.LEADS, row, CONFIG.NOTE_HEADERS[CONFIG.TABS.LEADS], text, expect || {});
  var c = {}; c[L.lastTouch] = todayStr_();
  updateRow_(CONFIG.TABS.LEADS, row, c, expect || {});
  return { notes: notes, lastTouch: c[L.lastTouch] };
}
