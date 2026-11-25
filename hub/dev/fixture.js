/*
 * Fake Command Center for local tests and the UI preview.
 * Same tabs and headers as the real sheet. All names and links are made up.
 * Quirks of the real sheet are reproduced on purpose: a date-only Leads row, checkbox-only rows,
 * ARRAYFORMULA columns, a #REF! in Payments, summary blocks to the right of tables.
 */
(function (root) {
  'use strict';
  var M = root.HubMock;
  var V = M.Validation, C = M.Criteria;

  function buildFixture(todayYmd) {
    var t = todayYmd.split('-').map(Number);
    function d(off) { return M.localMidnight(t[0], t[1], t[2] + off); }
    function monday(off) { var x = new Date(Date.UTC(t[0], t[1] - 1, t[2])); var back = (x.getUTCDay() + 6) % 7; return d(-back + (off || 0)); }
    function rangeRef(sheet, col) {
      return { getValues: function () { return SpreadsheetApp.openById().getSheetByName(sheet).getRange(2, col, 200, 1).getValues(); } };
    }
    var list = function (arr) { return new V(C.VALUE_IN_LIST, [arr, true]); };
    var box = new V(C.CHECKBOX);
    var F = false;
    var blankClient = ['', '', '', '', '', '', '', '', '', '', '', F, F, F, F, '', '', ''];

    var todoRows = [
      [d(-2), 'Mon', 'W2', 'Build', 'Old task left open', 15, F],
      [d(-1), 'Tue', 'W2', 'Post', 'Yesterday post', 20, true],
      [d(0), '', 'W2', 'Build', 'Update the intake form questions', 20, true],
      [d(0), '', 'W2', 'Post', 'Film and post tonight\'s reel. Captions on.', 25, F],
      [d(0), '', 'W2', 'Stories', 'Post 3 story frames', 5, F],
      [d(0), '', 'W2', 'Outreach', 'Message new followers. No more than 10 an hour.', 25, F],
      [d(1), '', 'W2', 'Build', 'Tomorrow task', 30, F]
    ];
    var todo = [['Date', 'Day', 'Week', 'Block', 'Task', 'Minutes', 'Done']].concat(todoRows);

    var specs = [
      {
        name: 'Daily To-Do', values: todo, validations: { 7: box }
      },
      {
        name: 'Leads',
        values: [
          ['Date added', 'Parent name', 'Athlete name', 'Grad year', 'State', 'Source', 'Contact (IG or email)', 'Program interest', 'Stage', 'Call booked on', 'Call date', 'Last touch', 'Next action', 'Next action due', 'Notes'],
          [d(-14)],
          [d(-6), 'Pat Example', 'Sam Example', 2028, 'ID', 'Instagram DM', '@sam.example', 'Complete Pitching Program', 'Talking', '', '', d(-5), 'Send film breakdown', d(-2), ''],
          [d(-3), 'Lee Sample', 'Jordan Sample', 2027, 'UT', 'Website', 'lee@example.com', 'Unsure', 'Won', '', '', d(-1), 'Send agreement', d(-4), '']
        ],
        validations: {
          6: list(['Film breakdown', 'Instagram DM', 'Skool', 'Website', 'Referral', 'Facebook group', 'Personal IG', 'Other']),
          8: list(['Complete Pitching Program', 'Mental Game Mentorship', 'Unsure']),
          9: list(['New', 'Talking', 'Call booked', 'Call held', 'Recap sent', 'Won', 'Lost', 'Nurture'])
        }
      },
      {
        name: 'Clients',
        values: [
          ['Athlete name', 'Parent name', 'Parent email', 'Program', 'Plan', 'Monthly rate', 'Start date', 'Term (months)', 'Term ends', 'Status', 'Price stage', 'Agreement signed', 'Intake form done', 'Velo Beam set up', 'First call held', 'Stripe customer', 'Notes', 'Paid this month'],
          ['Alex Demo', '', '', 'DDC IN PERSON THROWING GROUP', 'Month to month', 150, d(-6), 1, d(24), 'Onboarding', '', F, F, F, F, 'Venmo', '', 'Paid'],
          ['Casey Demo', 'Robin Demo', 'robin@example.com', 'Complete Pitching Program', 'Month to month', 400, d(-40), 6, d(140), 'Active', 1, true, true, F, true, 'Yes', '', 'Due'],
          ['Taylor Demo', '', '', 'Guinea Pig', '12 months', 0, d(-100), 12, d(265), 'Active', '', true, true, true, true, 'No', 'Guinea Pig Customer', 'No charge'],
          blankClient.slice(), blankClient.slice(), blankClient.slice()
        ],
        formulas: {
          '2,9': '=ARRAYFORMULA(IF((G2:G="")+(H2:H=""),"",EDATE(G2:G,H2:H)))',
          '2,18': '=ARRAYFORMULA(IF(A2:A="","",...))'
        },
        validations: { 10: list(['Onboarding', 'Active', 'Paused', 'Cancelled']), 11: list(['1', '2', '3']), 12: box, 13: box, 14: box, 15: box },
        maxRows: 200
      },
      {
        name: 'Payments',
        values: [
          ['Date received', 'Athlete', 'Program', 'Paid through', 'Amount', 'Notes', 'Next payment due', 'Status'],
          [d(-7), 'Alex Demo', '#REF!', 'Venmo', 150, '', '', 'No next date'],
          [d(-6), 'Diamond Development Center', 'DDC coaching (facility payment)', 'Venmo', 400, 'Facility payment', '', 'No next date'],
          [d(-30), 'Casey Demo', 'Complete Pitching Program', 'Stripe', 400, '', d(3), 'Follow up']
        ],
        formulas: {
          '2,3': '=ARRAYFORMULA(IF(B2:B="","",IFERROR(VLOOKUP(B2:B,Clients!$A$2:$D,4,FALSE),"")))',
          '2,8': '=ARRAYFORMULA(IF(B2:B="","",...))'
        },
        validations: { 1: new V(C.DATE_IS_VALID_DATE), 2: new V(C.VALUE_IN_RANGE, [rangeRef('Clients', 1), true]), 4: list(['Stripe', 'Venmo', 'Other']) }
      },
      {
        name: 'Content',
        values: [
          ['Post date', 'Pillar', 'Format', 'Topic', 'Teaching point', 'Hook', 'CTA', 'Status', 'Link', 'Reach', 'Saves', 'DMs started'],
          [d(-30), 'Pitching Development', 'Carousel', 'Film breakdown launch', 'Point', 'Hook', 'DM FILM', 'Designed', '', '', '', '']
        ]
      },
      {
        name: 'Wins',
        values: [
          ['Date', 'Athlete', 'Area', 'Win', 'Evidence', 'Media consent', 'OK to post', 'Notes'],
          ['', '', '', '', '', '', F, ''], ['', '', '', '', '', '', F, ''], ['', '', '', '', '', '', F, '']
        ],
        validations: { 7: box }, maxRows: 300
      },
      {
        name: 'Expenses',
        values: [
          ['Date', 'Vendor', 'Category', "What it's for", 'Amount', 'Billing', 'Paid with', 'Receipt link', 'Notes', '', 'Summary', 'This month', 'Year to date'],
          [d(-35), 'Software Co', 'Software and apps', 'Research', 20, 'Monthly', 'Personal card', '', '', '', 'Total spent', 0, 246.44],
          [d(-50), 'Gear Co', 'Equipment', 'Training gear', 126.44, 'One-time', 'Personal card', '', '', '', 'Software and apps', 0, 20],
          ['', '', '', '', '', '', '', '', '', '', 'Equipment', 0, 226.44]
        ],
        formulas: { '2,12': '=SUMIFS(...)', '2,13': '=SUMIFS(...)' }
      },
      {
        name: 'Money',
        values: [
          ['Date', 'Type', 'Category', 'Description', 'Amount', 'Receipt link / Notes', '', 'SUMMARY (all time)'],
          ['', '', '', '', '', '', '', 'Tax set-aside rate', 0.25],
          ['', '', '', '', '', '', '', 'Money in (from Payments tab)', 950]
        ]
      },
      {
        name: 'Settings',
        values: [
          ['Settings'], ['Blue cells are inputs.'], ['Rates are per month.'],
          ['Program', 'Month to month', '6 months', '12 months', 'Pays through', 'Month-to-month link', '6-month link', '12-month link'],
          ['Complete Pitching Program', 400, 325, 300, 'Stripe', 'https://example.com/cpp-m', 'https://example.com/cpp-6', 'https://example.com/cpp-12'],
          ['Mental Game Mentorship', 300, 250, 240, 'Stripe', 'https://example.com/mgm-m', 'https://example.com/mgm-6', 'https://example.com/mgm-12'],
          ['DDC IN PERSON THROWING GROUP', 150, '', '', 'Venmo', 'Venmo'],
          ['Guinea Pig', '-', '-', '-', 'No charge'],
          ['First price step (paid athletes)', 5],
          ['MRR target', 5000],
          ['Discovery call link', 'https://example.com/discovery'],
          ['Business email', 'coach@example.com'],
          ['Agreement: Complete Pitching Program', 'https://example.com/agreement-cpp'],
          ['Agreement: Mental Game Mentorship', 'https://example.com/agreement-mgm'],
          ['Second price step (paid athletes)', 10],
          ['Increase per step ($ a month)', 25]
        ]
      },
      {
        name: 'Scorecard',
        values: [
          ['323 Scorecard'], ['Live numbers pull from Leads and Clients.'], [],
          ['This week', '', '', 'Pipeline by stage', 'Leads', '', '', '', '', '', 'Cash collected', '323', 'DDC (Venmo)', 'Total'],
          ['Week starting (Monday)', monday(), '', 'New', 0, '', '', '', '', '', new Date(2026, 0, 1), 0, 0, 0],
          ['Conversations started', 3, '', 'Talking', 1, '', '', '', '', '', new Date(2026, 1, 1), 0, 0, 0],
          ['Calls booked', 1, '', 'Call booked', 0, '', '', '', '', '', new Date(2026, 2, 1), 0, 0, 0],
          ['Calls held', 1, '', 'Call held', 0, '', '', '', '', '', new Date(2026, 3, 1), 0, 0, 0],
          ['Closes', 1, '', 'Recap sent', 0, '', '', '', '', '', new Date(2026, 4, 1), 0, 0, 0],
          ['', '', '', 'Won', 1, '', '', '', '', '', new Date(2026, 5, 1), 0, 0, 0],
          ['Business', '', '', 'Lost', 0, '', '', '', '', '', new Date(2026, 6, 1), 0, 0, 0],
          ['Enrolled athletes (323 only)', 2, '', 'Nurture', 0, '', '', '', '', '', new Date(2026, 7, 1), 0, 0, 0],
          ['Monthly recurring revenue (323 only)', 400, '', 'Overdue follow-ups', 2, '', '', '', '', '', new Date(2026, 8, 1), 0, 0, 0],
          ['MRR target', 5000, '', 'DDC group, monthly (Venmo, not in MRR)', 150, '', '', '', '', '', new Date(2026, 9, 1), 400, 0, 400],
          ['Gap to target', 4600, '', 'Paid 323 athletes', 1, '', '', '', '', '', new Date(2026, 10, 1), 0, 550, 550],
          ['Spots to next price step', 4, '', 'Cash collected this month', 550, '', '', '', '', '', new Date(2026, 11, 1), 0, 0, 0],
          ['Recurring costs per month', 20, '', 'Cash collected year to date', 950, '', '', '', '', '', 'Year to date', 400, 550, 950],
          ['Net per month', 380],
          ['Weekly log (snapshot written each Monday)'],
          ['Week of', 'Conversations started', 'Calls booked', 'Calls held', 'Closes', 'Enrolled athletes', 'MRR', 'Spots to next step', 'Notes'],
          [monday(-14), 0, 0, 0, 0, 1, 0, 5, 'Example'],
          [monday(-7), 2, 1, 0, 0, 2, 400, 4, 'Example']
        ]
      }
    ];
    return specs;
  }

  root.HubFixture = { build: buildFixture };
})(typeof globalThis !== 'undefined' ? globalThis : this);
