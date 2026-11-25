/**
 * Tally applications: spot new ones, size them up, and give the next steps.
 * Follows the "323 Application Check" workflow:
 *  - An application is handled once its Submission ID is in a Leads note as "Tally #<id>",
 *    or the same athlete name and parent phone are already in Leads.
 *  - Pain anywhere in the answers is a red flag: talk to the family first, refer out, never diagnose.
 *  - Outreach goes to the parent, never the athlete alone. Drafts only. Nothing is sent.
 */

function appCfg_() { return CONFIG.APPLICATIONS; }

/** Map each field in CONFIG to the first header containing its key phrase. */
function appColumns_(headers) {
  var map = {};
  var F = appCfg_().FIELDS;
  Object.keys(F).forEach(function (k) {
    var want = norm_(F[k]);
    var h = headers.filter(function (x) { return norm_(x).indexOf(want) >= 0; })[0];
    if (h) map[k] = h;
  });
  return map;
}

function digits_(s) { return String(s || '').replace(/\D/g, '').slice(-10); }
function firstName_(s) { return String(s || '').trim().split(/\s+/)[0] || ''; }
function clip_(s, n) { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1).replace(/[\s,.;:]+\S*$/, '') + '...' : s; }

function readApplications_(fresh) {
  var A = appCfg_();
  var t = readTab_(A.TAB, fresh, A.SPREADSHEET_ID);
  var col = appColumns_(t.headers);
  var leads = readTab_(CONFIG.TABS.LEADS, fresh);
  var L = CONFIG.H.leads;

  var apps = t.rows.map(function (r) {
    var a = { row: r._row, answers: [] };
    Object.keys(col).forEach(function (k) { a[k] = r[col[k]] == null ? '' : r[col[k]]; });
    a.id = String(a.id || '').trim() || ('row' + r._row);
    t.headers.forEach(function (h) {
      if (/^(submission id|respondent id|submitted at)$/i.test(h)) return;
      var v = r[h];
      if (v !== '' && v != null) a.answers.push({ q: h, a: String(v) });
    });
    return a;
  }).filter(function (a) { return a.athlete || a.parent; });

  apps.forEach(function (a) {
    var tag = new RegExp('Tally #' + a.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![A-Za-z0-9_-])', 'i');
    var lead = leads.rows.filter(function (l) {
      if (tag.test(String(l['Notes'] || ''))) return true;
      var sameName = norm_(l[L.athlete]) && norm_(l[L.athlete]) === norm_(a.athlete);
      var phone = digits_(a.parentPhone);
      var samePhone = phone && (digits_(l['Contact (IG or email)']) === phone || String(l['Notes'] || '').replace(/\D/g, '').indexOf(phone) >= 0);
      return sameName && samePhone;
    })[0];
    a.handled = !!lead;
    a.leadRow = lead ? lead._row : null;
    a.leadStage = lead ? lead[L.stage] || '' : '';
    a.submitted = asYmd_(a.submittedAt) || '';
  });
  apps.sort(function (x, y) { return String(y.submittedAt).localeCompare(String(x.submittedAt)); });
  return { apps: apps, leads: leads, headers: t.headers };
}

/** Quick read of one application: program fit, score, flags, call questions. */
function sizeUp_(a) {
  var all = a.answers.map(function (x) { return x.a; }).join(' \n ').toLowerCase();
  var interest = String(a.interest || '').toLowerCase();
  var holding = String(a.holding || '').toLowerCase();
  var routine = String(a.routine || '').toLowerCase();

  // Program fit
  var fit = 'Unsure', why = 'They did not pick a program. Ask on the call.';
  var mentalSignals = /(mental|confiden|nerv|anxi|head|focus|pressure|fear|overthink|composure|mindset)/.test(holding);
  var noProgram = /(nothing|none|no program|not much|just (team|practice)|n\/a|^\s*no\b)/.test(routine) || !routine;
  if (/complete|pitching program|pitching/.test(interest)) { fit = 'Complete Pitching Program'; why = 'They asked for it'; }
  if (/mental/.test(interest)) { fit = 'Mental Game Mentorship'; why = 'They asked for it'; }
  if (fit === 'Unsure' && noProgram) { fit = 'Complete Pitching Program'; why = 'No real throwing or lifting plan right now'; }
  else if (fit === 'Unsure' && mentalSignals) { fit = 'Mental Game Mentorship'; why = 'What holds them back sounds mental'; }
  if (fit === 'Complete Pitching Program' && why === 'They asked for it' && noProgram) why += ', and they have no real throwing or lifting plan now';
  if (fit === 'Mental Game Mentorship' && why === 'They asked for it' && mentalSignals) why += ', and what holds them back sounds mental';
  if (fit === 'Mental Game Mentorship' && noProgram && !mentalSignals) why += '. They also have no throwing plan, so ask whether Complete fits better';

  // Flags
  var flags = [];
  var pain = all.match(/\b(pain|hurt(s|ing)?|sore( arm| elbow| shoulder)?|injur\w*|tommy john|ucl|tendinitis|tendonitis|strain\w*|sprain\w*|surgery)\b/);
  if (pain) flags.push({ level: 'red', text: 'Mentions "' + pain[0] + '". Talk to the family before any programming. Refer to a medical provider. Do not diagnose.' });
  if (!a.parent && !a.parentPhone && !a.parentEmail) flags.push({ level: 'warn', text: 'No parent info. Get a parent on the thread before anything else.' });
  if (/^(no|not yet|not right now|maybe|unsure|not sure)/i.test(String(a.invest || '').trim())) flags.push({ level: 'warn', text: 'Not ready to invest yet ("' + clip_(a.invest, 40) + '"). Nurture, no hard push.' });
  var yr = Number(String(a.grad).replace(/\D/g, '').slice(0, 4));
  var thisYear = Number(todayStr_().slice(0, 4));
  if (/middle|7th|8th|12u|13u|14u/i.test(String(a.level)) || (yr && yr > thisYear + 4)) flags.push({ level: 'warn', text: 'Middle school age. Make sure the program fits a younger athlete.' });
  if (/in[\s-]?season|travel|team (practice|schedule)|showcase/.test(all)) flags.push({ level: 'info', text: 'Has a team or travel schedule. Plan around their throwing load.' });

  // Score
  var pts = 0;
  if (/high|hs|varsity|jv|freshman|sophomore|junior|senior|college|juco|d1|d2|d3|naia/i.test(String(a.level))) pts++;
  if (a.parent && (a.parentPhone || a.parentEmail)) pts++;
  var days = String(a.days || '').toLowerCase();
  var dayCount = (days.match(/mon|tue|wed|thu|fri|sat|sun/g) || []).length || Number((days.match(/\d+/) || [0])[0]);
  if (dayCount >= 3 || /every|daily|all/.test(days)) pts++;
  if (/^(yes|yeah|absolutely|ready|definitely|for sure)/i.test(String(a.invest || '').trim())) pts++;
  if (/(velo|velocity|mph|command|strike|college|recruit|commit|varsity|mental|confiden|consisten|arm health)/i.test(String(a.goals))) pts++;
  var score = pts >= 4 ? 'Strong' : pts >= 2 ? 'Good' : 'Long shot';
  if (pain && score === 'Strong') score = 'Good';

  // Call questions from their own answers
  var qs = [];
  if (a.goals) qs.push('You said the goal is "' + clip_(a.goals, 70) + '". What would hitting that look like by next summer?');
  if (a.holding) qs.push('You mentioned "' + clip_(a.holding, 60) + '". When does that show up most?');
  if (a.routine) qs.push('Walk me through a normal throwing and lifting week right now.');
  if (a.velo) qs.push('Where did the ' + clip_(a.velo, 12) + ' number come from, and how often do you get on a gun?');
  if (qs.length < 3) qs.push('What has your coach told you to work on?');
  if (qs.length < 3) qs.push('What does a good season look like for you?');

  return { fit: fit, why: why, score: score, flags: flags, questions: qs.slice(0, 3) };
}

function draftText_(a, link) {
  var parent = firstName_(a.parent) || 'there';
  var kid = firstName_(a.athlete) || 'your athlete';
  var goal = clip_(a.goals, 80).replace(/[.!]+$/, '');
  if (/^[A-Z][a-z]/.test(goal)) goal = goal.charAt(0).toLowerCase() + goal.slice(1);
  var detail = goal ? 'I liked seeing the goal to ' + goal.replace(/^(to|i want to|we want to)\s+/i, '') + '.' : 'I appreciate you taking the time to fill it out.';
  return 'Hi ' + parent + ', this is David with 323 Pitching Performance. Thanks for sending in ' + kid + "'s application. " + detail +
    " I'd love to hear more about where " + kid + ' is at and what would help most. Here is a link to grab a time for a quick call: ' + (link || '[discovery call link]');
}

function nextSteps_(a, s) {
  var steps = [];
  if (s.flags.some(function (f) { return f.level === 'red'; })) steps.push({ key: 'call', text: 'Call the family first about the pain they mentioned. Refer to a medical provider. No programming until that is settled.' });
  steps.push({ key: 'lead', text: a.handled ? 'Logged in Leads' + (a.leadStage ? ' (' + a.leadStage + ')' : '') : 'Add to Leads', done: a.handled });
  steps.push({ key: 'text', text: 'Text ' + (firstName_(a.parent) || 'the parent') + ' the discovery call link. Copy the draft below and send it from your phone. No price in the text.' });
  steps.push({ key: 'task', text: 'Put a follow-up on your To-Do so it does not slip past 24 hours' });
  steps.push({ key: 'prep', text: 'Before the call, read the three questions below' });
  return steps;
}

/** Applications screen. */
function getApplications(fresh) {
  assertOwner_();
  fresh = fresh === true;
  var r = readApplications_(fresh);
  var link = readSettings_(fresh).discoveryLink || '';
  var apps = r.apps.map(function (a) {
    var s = sizeUp_(a);
    return {
      id: a.id, row: a.row, submitted: a.submitted, submittedAt: String(a.submittedAt || ''),
      athlete: a.athlete, parent: a.parent, parentPhone: a.parentPhone, parentEmail: a.parentEmail,
      grad: a.grad, level: a.level, school: a.school, throws: a.throws, velo: a.velo, location: a.location,
      interest: a.interest, handled: a.handled, leadRow: a.leadRow, leadStage: a.leadStage,
      answers: a.answers, fit: s.fit, why: s.why, score: s.score, flags: s.flags, questions: s.questions,
      steps: nextSteps_(a, s), text: draftText_(a, link)
    };
  });
  var rank = { Strong: 0, Good: 1, 'Long shot': 2 };
  apps.sort(function (x, y) {
    if (x.handled !== y.handled) return x.handled ? 1 : -1;
    var xr = x.flags.some(function (f) { return f.level === 'red'; }) ? -1 : rank[x.score];
    var yr = y.flags.some(function (f) { return f.level === 'red'; }) ? -1 : rank[y.score];
    if (!x.handled && xr !== yr) return xr - yr;
    return String(y.submittedAt).localeCompare(String(x.submittedAt));
  });
  return { today: todayStr_(), discoveryLink: link, apps: apps, total: apps.length, newCount: apps.filter(function (a) { return !a.handled; }).length };
}

/** Light check for the notification banner and badge. */
function getApplicationAlerts(fresh) {
  assertOwner_();
  var r = readApplications_(fresh === true);
  var fresh_ = r.apps.filter(function (a) { return !a.handled; });
  return {
    newCount: fresh_.length,
    total: r.apps.length,
    items: fresh_.slice(0, 10).map(function (a) {
      var s = sizeUp_(a);
      return { id: a.id, athlete: a.athlete || a.parent, submitted: a.submitted, score: s.score, red: s.flags.some(function (f) { return f.level === 'red'; }) };
    })
  };
}

/** Log an application in Leads, the way the Application Check skill does. */
function addApplicationLead(id, requestId) {
  assertOwner_();
  return once_(requestId, function () {
    var r = readApplications_(true);
    var a = r.apps.filter(function (x) { return x.id === String(id); })[0];
    if (!a) throw new Error('That application is no longer in the Tally sheet. Refresh and try again.');
    if (a.handled) return { ok: true, row: a.leadRow, already: true };
    var s = sizeUp_(a);
    var L = r.leads.meta.cols;
    var pick = function (h, want, fallback) {
      var c = L[h];
      if (!c || !c.choices) return want;
      return c.choices.indexOf(want) >= 0 ? want : fallback;
    };
    var stageChoices = (L['Stage'] && L['Stage'].choices) || ['New'];
    var stage = stageChoices.filter(function (x) { return /^(new|applied)/i.test(x); })[0] || stageChoices[0];
    var interest = /mental/i.test(a.interest) ? 'Mental Game Mentorship' : /complete|pitching/i.test(a.interest) ? 'Complete Pitching Program' : 'Unsure';
    var state = String(a.location || '').split(',').pop().trim();
    var tomorrow = addDays_(todayStr_(), 1);
    var contact = a.parentEmail || a.parentPhone || '';
    var noteBits = ['Tally #' + a.id, s.score + ' fit for ' + s.fit + ': ' + s.why];
    if (a.parentPhone && contact !== a.parentPhone) noteBits.push('Parent phone ' + a.parentPhone);
    s.flags.filter(function (f) { return f.level === 'red'; }).forEach(function (f) { noteBits.push('RED FLAG: ' + f.text); });
    var rec = {
      'Date added': todayStr_(),
      'Parent name': a.parent || '',
      'Athlete name': a.athlete || '',
      'Grad year': a.grad || '',
      'State': state,
      'Source': pick('Source', appCfg_().LEAD_SOURCE, 'Website'),
      'Contact (IG or email)': contact,
      'Program interest': pick('Program interest', interest, 'Unsure'),
      'Stage': stage,
      'Next action': appCfg_().NEXT_ACTION,
      'Next action due': tomorrow,
      'Notes': stampNote_('', noteBits.join('. '))
    };
    var res = appendRow_(CONFIG.TABS.LEADS, rec);
    return { ok: true, row: res.row };
  });
}

/** Add a To-Do task to text the parent today. */
function addApplicationTask(id, requestId) {
  assertOwner_();
  return once_(requestId, function () {
    var r = readApplications_(false);
    var a = r.apps.filter(function (x) { return x.id === String(id); })[0];
    if (!a) throw new Error('That application is no longer in the Tally sheet. Refresh and try again.');
    var who = (a.parent ? firstName_(a.parent) + ' (' + (a.athlete || 'athlete') + "'s parent)" : (a.athlete || 'the family'));
    var rec = { Date: todayStr_(), Block: 'Outreach', Task: 'Text ' + who + ' the discovery call link. New Tally application.', Minutes: 5 };
    deriveTodoFields_(rec);
    var res = appendRow_(CONFIG.TABS.TODO, rec);
    return { ok: true, row: res.row };
  });
}
