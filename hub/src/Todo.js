/**
 * To-Do screen.
 */

/** All tasks (the page filters into Today, Tomorrow, This week, Overdue). */
function getTodos(fresh) {
  assertOwner_();
  var t = readTab_(CONFIG.TABS.TODO, fresh === true);
  var blocks = {};
  var rows = t.rows.map(todoView_).filter(function (x) { return x.date; });
  rows.forEach(function (x) { blocks[x.block] = 1; });
  var col = t.meta.cols[CONFIG.H.todo.block];
  return {
    today: todayStr_(),
    weekStart: mondayOf_(todayStr_()),
    tasks: rows,
    blocks: (col && col.choices) || Object.keys(blocks).sort()
  };
}

/**
 * Edit a task. changes may hold Date, Block, Task, Minutes.
 * Moving to a new date also updates Day and Week.
 */
function updateTask(row, expectTask, changes) {
  assertOwner_();
  var H = CONFIG.H.todo;
  var allowed = [H.date, H.block, H.task, H.minutes, H.done];
  var c = {};
  Object.keys(changes || {}).forEach(function (k) { if (allowed.indexOf(k) >= 0) c[k] = changes[k]; });
  if (c[H.task] !== undefined && !String(c[H.task]).trim()) throw new Error('Task cannot be blank.');
  if (c[H.date] !== undefined) {
    if (!asYmd_(c[H.date])) throw new Error('Pick a date.');
    deriveTodoFields_(c);
  }
  var expect = {}; expect[H.task] = expectTask;
  updateRow_(CONFIG.TABS.TODO, row, c, expect);
  return { ok: true };
}

/** Move several tasks to one date (used by "Move overdue to today"). items: [{ row, task }]. */
function moveTasks(items, date) {
  assertOwner_();
  if (!asYmd_(date)) throw new Error('Pick a date.');
  var moved = 0, failed = 0;
  (items || []).slice(0, 100).forEach(function (it) {
    try { updateTask(it.row, it.task, { Date: date }); moved++; } catch (e) { failed++; }
  });
  return { moved: moved, failed: failed };
}
