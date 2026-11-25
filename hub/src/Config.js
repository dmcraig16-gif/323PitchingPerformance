/**
 * 323 Hub configuration.
 * Tab names and header names live here. Column letters never do.
 */
var CONFIG = {
  SPREADSHEET_ID: '1ur9PASWDn6vUrh15oqsXvAQpWbjkWvZdfiXrZ4SoeCU',
  OWNER_EMAIL: '323mperformance@gmail.com',
  TZ: 'America/Boise',
  CACHE_SECONDS: 60,

  TABS: {
    SCORECARD: 'Scorecard',
    TODO: 'Daily To-Do',
    LEADS: 'Leads',
    CLIENTS: 'Clients',
    PAYMENTS: 'Payments',
    CONTENT: 'Content',
    WINS: 'Wins',
    EXPENSES: 'Expenses',
    MONEY: 'Money',
    SOCIAL: 'Social',
    SETTINGS: 'Settings'
  },

  // A row counts only if at least one of these headers has a value.
  // Blank rows, rows with only checkboxes, and half-filled rows (a date and nothing else) are skipped.
  KEY_HEADERS: {
    'Daily To-Do': ['Task'],
    'Leads': ['Parent name', 'Athlete name', 'Contact (IG or email)'],
    'Clients': ['Athlete name'],
    'Payments': ['Athlete'],
    'Content': ['Topic', 'Hook'],
    'Wins': ['Athlete', 'Win'],
    'Expenses': ['Vendor', 'Amount'],
    'Money': ['Description', 'Amount']
  },

  // Tabs the app may append rows to, and the fields shown first in the add form.
  // Any other writable column still shows under "More fields", so new columns appear automatically.
  ADD_FORMS: {
    'Daily To-Do': { title: 'Add task', primary: ['Date', 'Block', 'Task', 'Minutes'], hidden: ['Day', 'Week', 'Done'] },
    'Leads': { title: 'Add lead', primary: ['Parent name', 'Athlete name', 'Grad year', 'Contact (IG or email)', 'Source', 'Program interest', 'Stage', 'Next action', 'Next action due', 'Notes'], hidden: ['Last touch'] },
    'Payments': { title: 'Log payment', primary: ['Date received', 'Athlete', 'Amount', 'Paid through', 'Next payment due', 'Notes'], hidden: [] },
    'Expenses': { title: 'Log expense', primary: ['Date', 'Vendor', 'Category', "What it's for", 'Amount', 'Billing', 'Paid with', 'Receipt link'], hidden: [] },
    'Wins': { title: 'Log win', primary: ['Date', 'Athlete', 'Area', 'Win', 'Evidence', 'Media consent', 'OK to post'], hidden: [] },
    'Content': { title: 'Add post', primary: ['Post date', 'Pillar', 'Format', 'Topic', 'Teaching point', 'Hook', 'CTA', 'Status', 'Link'], hidden: [] },
    'Clients': { title: 'Add client', primary: ['Athlete name', 'Parent name', 'Parent email', 'Program', 'Plan', 'Monthly rate', 'Start date', 'Term (months)', 'Status', 'Notes'], hidden: [] }
  },

  // Tabs whose existing rows the generic editor may change (Clients and Leads have their own functions).
  EDIT_TABS: ['Content', 'Wins', 'Payments', 'Expenses', 'Daily To-Do'],

  // Values filled in on a new row when left blank.
  NEW_ROW_DEFAULTS: {
    'Leads': { 'Stage': 'New' },
    'Clients': { 'Status': 'Onboarding' }
  },

  // Headers that default to today when left blank on a new row.
  TODAY_DEFAULTS: {
    'Daily To-Do': ['Date'],
    'Leads': ['Date added', 'Last touch'],
    'Payments': ['Date received'],
    'Expenses': ['Date'],
    'Wins': ['Date'],
    'Clients': ['Start date']
  },

  // Notes columns that take timestamped entries (M/D/YYYY: text, newest first).
  NOTE_HEADERS: { 'Leads': 'Notes', 'Clients': 'Notes' },

  // Header names used in logic. If you rename one in the sheet, change it here too.
  H: {
    todo: { date: 'Date', day: 'Day', week: 'Week', block: 'Block', task: 'Task', minutes: 'Minutes', done: 'Done' },
    leads: { parent: 'Parent name', athlete: 'Athlete name', stage: 'Stage', lastTouch: 'Last touch', nextAction: 'Next action', nextDue: 'Next action due' },
    clients: {
      athlete: 'Athlete name', parent: 'Parent name', program: 'Program', plan: 'Plan', status: 'Status',
      paid: 'Paid this month', onboarding: ['Agreement signed', 'Intake form done', 'Velo Beam set up', 'First call held']
    },
    payments: { date: 'Date received', athlete: 'Athlete', program: 'Program', amount: 'Amount', nextDue: 'Next payment due', status: 'Status' }
  },

  // Tally applications. Tally writes this sheet; the Hub only reads it. New applicants are logged in Leads.
  // Columns are found by a key phrase in the header, so small wording edits in the Tally form don't break it.
  APPLICATIONS: {
    SPREADSHEET_ID: '1ejieG5-vel52XU-sj0EB5NOGGKA7wWtuvGNTNLnJNEk',
    TAB: 'Sheet1',
    FIELDS: {
      id: 'submission id', submittedAt: 'submitted at', athlete: 'athlete full name', grad: 'graduation year',
      athletePhone: 'athlete phone', athleteEmail: 'athlete email', location: 'located', parent: 'parent name',
      parentPhone: 'parent phone', parentEmail: 'parent email', level: 'current level', school: 'school',
      throws: 'throws', velo: 'velocity', routine: 'currently do', interest: 'program are you interested',
      goals: 'goals', holding: 'holding you back', days: 'days available', invest: 'ready to invest', other: 'anything else'
    },
    LEAD_SOURCE: 'Tally application',
    NEXT_ACTION: 'Text parent discovery call link'
  },

  ACTIVE_CLIENT_STATUSES: ['Active', 'Onboarding'],
  CLOSED_LEAD_STAGES: ['Won', 'Lost'],
  // Paid this month values that do not need attention.
  PAID_OK_VALUES: ['Paid', 'No charge', 'Prepaid', '']
};
