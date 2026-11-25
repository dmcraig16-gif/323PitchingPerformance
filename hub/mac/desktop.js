/*
 * Mac app layer: connects the bridge to Google Sheets, then sets up the app window,
 * icon, menu bar, keyboard shortcuts and Dock badge when running as an installed app.
 * Outside the installed app it offers an "Install as Mac app" button.
 */
(function () {
  'use strict';
  var H = window.Hub;
  var claude = window.claude;

  function noConnector(msg) {
    H.view.innerHTML = '<h1>323 Hub</h1><p class="placeholder">' + H.esc(msg) + '</p>';
  }

  if (!claude || typeof claude.use !== 'function') {
    noConnector('Open this app from the Claude desktop app. It reads your Command Center through your Google Sheets connector.');
    return;
  }

  H.view.innerHTML = '<div class="skeleton" style="height:40px;width:60%"></div><div class="cards">' +
    '<div class="card skeleton"></div><div class="card skeleton"></div><div class="card skeleton"></div>' +
    '<div class="card skeleton"></div><div class="card skeleton"></div><div class="card skeleton"></div></div>';

  claude.use('mcp').then(function (mcp) {
    if (!mcp) {
      noConnector('Google Sheets is not available in this window. Open the app from the Claude desktop app, with the Google Sheets connector turned on.');
      return;
    }
    window.HubBridge.attach(mcp);
    H.go('home');
    // Warm up the other tabs after Home has what it needs.
    setTimeout(function () { window.HubBridge.preload().catch(function () {}); }, 1500);
  });

  /* ---------- desktop app ---------- */

  var WINDOW = { titleBarStyle: 'hiddenInset', dragHeight: 64, width: 1280, height: 860, minWidth: 420, minHeight: 600, backgroundColor: '#000000' };

  function drawIcon() {
    var c = document.createElement('canvas');
    c.width = c.height = 256;
    var g = c.getContext('2d');
    var r = 56;
    g.fillStyle = '#000000';
    g.beginPath();
    g.moveTo(r, 0); g.arcTo(256, 0, 256, 256, r); g.arcTo(256, 256, 0, 256, r); g.arcTo(0, 256, 0, 0, r); g.arcTo(0, 0, 256, 0, r);
    g.closePath(); g.fill();
    g.fillStyle = '#0289eb';
    g.fillRect(40, 186, 176, 10);
    g.fillStyle = '#ffffff';
    g.textAlign = 'center';
    g.textBaseline = 'alphabetic';
    g.font = '120px Anton, "Bebas Neue", Impact, sans-serif';
    g.fillText('323', 128, 168);
    return c.toDataURL('image/png');
  }

  function menuTemplate() {
    var go = function (tab) { return function () { H.go(tab); }; };
    var add = function (tab) { return function () { H.openForm(tab, {}, function () { H.go(H.state.tab, { fresh: true }); }); }; };
    return [
      { label: 'Go', submenu: [
        { label: 'Home', accelerator: 'CmdOrCtrl+1', click: go('home') },
        { label: 'To-Do', accelerator: 'CmdOrCtrl+2', click: go('todo') },
        { label: 'Clients', accelerator: 'CmdOrCtrl+3', click: go('clients') },
        { label: 'Leads', accelerator: 'CmdOrCtrl+4', click: go('leads') },
        { label: 'Money', accelerator: 'CmdOrCtrl+5', click: go('money') },
        { type: 'separator' },
        { label: 'Content', click: go('content') },
        { label: 'Wins', click: go('wins') },
        { label: 'Scorecard history', click: go('history') }
      ] },
      { label: 'Add', submenu: [
        { label: 'Add task', accelerator: 'CmdOrCtrl+Shift+T', click: add('Daily To-Do') },
        { label: 'Add lead', accelerator: 'CmdOrCtrl+Shift+L', click: add('Leads') },
        { label: 'Add client', click: add('Clients') },
        { type: 'separator' },
        { label: 'Log payment', accelerator: 'CmdOrCtrl+Shift+P', click: add('Payments') },
        { label: 'Log expense', accelerator: 'CmdOrCtrl+Shift+E', click: add('Expenses') },
        { label: 'Log win', accelerator: 'CmdOrCtrl+Shift+W', click: add('Wins') }
      ] },
      { role: 'editMenu' },
      { label: 'View', submenu: [
        { label: 'Refresh from sheet', accelerator: 'CmdOrCtrl+R', click: function () { document.getElementById('refreshBtn').click(); } }
      ] }
    ];
  }

  /** Dock badge: overdue items on Home (red items plus overdue tasks). */
  var lastBadge = null;
  function badgeCount() {
    var h = H.state.home;
    if (!h) return null;
    var n = h.attention.filter(function (a) { return a.level === 'overdue'; }).length;
    return n;
  }

  claude.use('desktop').then(function (desktop) {
    if (!desktop) return;
    if (desktop.window) {
      document.documentElement.classList.add('in-app');
      desktop.window.setOptions(WINDOW).catch(function () {});
      var setIcon = function () { desktop.app.dock.setIcon(drawIcon()).catch(function () {}); };
      if (document.fonts && document.fonts.load) document.fonts.load('120px Anton').then(setIcon, setIcon); else setIcon();
      desktop.Menu.setApplicationMenu(menuTemplate()).catch(function () {});
      setInterval(function () {
        var n = badgeCount();
        if (n === null || n === lastBadge) return;
        lastBadge = n;
        desktop.app.dock.setBadge(n ? String(n) : '').catch(function () {});
      }, 5000);
      return;
    }
    if (!desktop.install) return;
    desktop.install.state().then(function (st) {
      if (st !== 'available') return;
      var b = document.createElement('button');
      b.className = 'btn small install-btn';
      b.textContent = 'Install as Mac app';
      b.onclick = function () {
        desktop.install.request().then(function (r) {
          if (r === 'installed') H.toast('Installing. Open 323 Hub from your Applications or Dock.');
          else if (r === 'cancelled') H.toast('Install cancelled.');
          else H.toast('Install is not available here. Open this artifact in the Claude desktop app.', true);
        }).catch(function () { H.toast('Install needs a click in the Claude desktop app.', true); });
      };
      var bar = document.querySelector('.topbar');
      bar.insertBefore(b, document.getElementById('refreshBtn'));
    }).catch(function () {});
  });
})();
