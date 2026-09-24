import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { missDirectionTrendBySession } from '../lib/commandMetrics.js'

// Fixed colors per direction label so the same bucket reads the same
// color across sessions and across the by-pitch-type table above it.
const DIRECTION_COLORS = {
  'High & Arm-side': '#ff3b30',
  'High & Glove-side': '#ff9f0a',
  'Low & Arm-side': '#0071e3',
  'Low & Glove-side': '#5e5ce6',
  High: '#ff6482',
  Low: '#64b5f6',
  'Arm-side': '#ffb340',
  'Glove-side': '#bf5af2',
  Centered: '#34c759',
}
const FALLBACK_COLOR = '#8e8e93'

// Stacked bar per session — how a pitcher's miss-direction tendency
// (e.g. leaking arm-side) is trending across their bullpen history,
// rather than one blended all-time number.
export default function MissDirectionTrend({ pitches, throws }) {
  const { labels, rows } = missDirectionTrendBySession(pitches, throws)

  if (rows.length < 2) {
    return <p className="text-sm text-neutral-500">Log pitches across at least two sessions to see a trend.</p>
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={rows}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d) => d.slice(5)} />
        <YAxis tick={{ fontSize: 10 }} allowDecimals={false} width={28} />
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {labels.map((label) => (
          <Bar key={label} dataKey={label} stackId="direction" fill={DIRECTION_COLORS[label] ?? FALLBACK_COLOR} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
