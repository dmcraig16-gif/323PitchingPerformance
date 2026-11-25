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
    'Wins': { title: 'Log win', primary: ['Date', 'Athlete', 'Area', 'Win', 'Evidence', 'Media consent', 'OK to post'], hidden: [] }
  },

  // Headers that default to today when left blank on a new row.
  TODAY_DEFAULTS: {
    'Daily To-Do': ['Date'],
    'Leads': ['Date added', 'Last touch'],
    'Payments': ['Date received'],
    'Expenses': ['Date'],
    'Wins': ['Date']
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

  ACTIVE_CLIENT_STATUSES: ['Active', 'Onboarding'],
  CLOSED_LEAD_STAGES: ['Won', 'Lost'],
  // Paid this month values that do not need attention.
  PAID_OK_VALUES: ['Paid', 'No charge', 'Prepaid', '']
};
