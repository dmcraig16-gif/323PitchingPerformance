// Turns a list of exercise_logs rows (already sorted oldest-first) into
// what the UI needs to show progress: the most recent value, the delta
// vs. the entry before it, and a compact series for a sparkline.
//
// `metric` is 'weight' or 'velocity' — whichever the exercise's type logs.

export function primaryValue(log, metric) {
  return metric === 'velocity' ? log.velocity : log.weight
}

export function trendSummary(logs, metric) {
  const withValue = logs.filter((l) => primaryValue(l, metric) != null)
  if (withValue.length === 0) return null

  const latest = withValue[withValue.length - 1]
  const previous = withValue.length > 1 ? withValue[withValue.length - 2] : null
  const latestValue = primaryValue(latest, metric)
  const delta = previous ? latestValue - primaryValue(previous, metric) : null

  return {
    latest,
    latestValue,
    delta,
    count: withValue.length,
    series: withValue.map((l) => ({ date: l.date, value: primaryValue(l, metric) })),
  }
}
