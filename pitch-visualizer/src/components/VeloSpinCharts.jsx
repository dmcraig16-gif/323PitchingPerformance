import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  ScatterChart, Scatter,
} from 'recharts';
import { useMemo } from 'react';
import { getNormalizedPitchColor, PITCH_TYPE_ORDER } from '../utils/pitchTypes';

function avg(arr, field) {
  const vals = arr.map(p => p[field]).filter(v => v !== null);
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
}

function stddev(arr, field) {
  const vals = arr.map(p => p[field]).filter(v => v !== null);
  if (vals.length < 2) return 0;
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  return Math.sqrt(vals.map(v => (v - mean) ** 2).reduce((a, b) => a + b, 0) / vals.length);
}

function buildStats(pitches, selectedPitchTypes) {
  const byType = {};
  for (const p of pitches) {
    if (selectedPitchTypes.length > 0 && !selectedPitchTypes.includes(p.pitchType)) continue;
    if (!byType[p.pitchType]) byType[p.pitchType] = [];
    byType[p.pitchType].push(p);
  }

  return PITCH_TYPE_ORDER
    .filter(t => byType[t] && byType[t].length > 0)
    .map(t => ({
      pitchType: t,
      count: byType[t].length,
      avgVelo: avg(byType[t], 'velocity'),
      sdVelo: stddev(byType[t], 'velocity'),
      avgSpin: avg(byType[t], 'spinRate'),
      sdSpin: stddev(byType[t], 'spinRate'),
      color: getNormalizedPitchColor(t),
    }))
    .filter(d => d.avgVelo !== null || d.avgSpin !== null);
}

const CustomBarLabel = ({ x, y, width, value }) => {
  if (!value) return null;
  return (
    <text x={x + width / 2} y={y - 4} textAnchor="middle" fontSize={11} fill="#E5E7EB">
      {value.toFixed(1)}
    </text>
  );
};

export function VelocityChart({ pitches, selectedPitchTypes }) {
  const stats = useMemo(() => buildStats(pitches, selectedPitchTypes), [pitches, selectedPitchTypes]);

  return (
    <div className="chart-card">
      <h3 className="chart-title">Average Velocity</h3>
      <p className="chart-subtitle">By pitch type (mph)</p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={stats} margin={{ top: 20, right: 16, left: 0, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="pitchType" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
          <YAxis
            domain={[60, 'auto']}
            tick={{ fill: '#9CA3AF', fontSize: 11 }}
            tickFormatter={v => v.toFixed(0)}
          />
          <Tooltip
            contentStyle={{ background: '#1F2937', border: '1px solid #374151', borderRadius: 6 }}
            labelStyle={{ color: '#F9FAFB' }}
            formatter={(val, name) => [val ? val.toFixed(1) + ' mph' : '-', 'Avg Velo']}
          />
          <Bar dataKey="avgVelo" radius={[4, 4, 0, 0]} label={<CustomBarLabel />}>
            {stats.map((d, i) => <Cell key={i} fill={d.color} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SpinRateChart({ pitches, selectedPitchTypes }) {
  const stats = useMemo(() => buildStats(pitches, selectedPitchTypes), [pitches, selectedPitchTypes]);

  return (
    <div className="chart-card">
      <h3 className="chart-title">Average Spin Rate</h3>
      <p className="chart-subtitle">By pitch type (rpm)</p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={stats} margin={{ top: 20, right: 16, left: 8, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="pitchType" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
          <YAxis
            domain={[1400, 'auto']}
            tick={{ fill: '#9CA3AF', fontSize: 11 }}
            tickFormatter={v => v.toFixed(0)}
          />
          <Tooltip
            contentStyle={{ background: '#1F2937', border: '1px solid #374151', borderRadius: 6 }}
            labelStyle={{ color: '#F9FAFB' }}
            formatter={(val) => [val ? val.toFixed(0) + ' rpm' : '-', 'Avg Spin']}
          />
          <Bar dataKey="avgSpin" radius={[4, 4, 0, 0]}>
            {stats.map((d, i) => <Cell key={i} fill={d.color} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function VeloSpinScatter({ pitches, selectedPitchTypes }) {
  const byType = useMemo(() => {
    const groups = {};
    for (const p of pitches) {
      if (p.velocity === null || p.spinRate === null) continue;
      if (selectedPitchTypes.length > 0 && !selectedPitchTypes.includes(p.pitchType)) continue;
      if (!groups[p.pitchType]) groups[p.pitchType] = [];
      groups[p.pitchType].push({ x: p.velocity, y: p.spinRate, pitchType: p.pitchType });
    }
    return groups;
  }, [pitches, selectedPitchTypes]);

  return (
    <div className="chart-card">
      <h3 className="chart-title">Velocity vs. Spin Rate</h3>
      <p className="chart-subtitle">Each dot = one pitch</p>
      <ResponsiveContainer width="100%" height={260}>
        <ScatterChart margin={{ top: 10, right: 16, left: 8, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="x" name="Velo" unit=" mph" type="number" domain={['auto', 'auto']}
            tick={{ fill: '#9CA3AF', fontSize: 11 }} label={{ value: 'Velocity (mph)', position: 'insideBottom', offset: -10, fill: '#6B7280', fontSize: 11 }} />
          <YAxis dataKey="y" name="Spin" unit=" rpm" type="number" domain={['auto', 'auto']}
            tick={{ fill: '#9CA3AF', fontSize: 11 }} />
          <Tooltip
            contentStyle={{ background: '#1F2937', border: '1px solid #374151', borderRadius: 6 }}
            labelStyle={{ color: '#F9FAFB' }}
            cursor={{ strokeDasharray: '3 3' }}
            formatter={(val, name) => [name === 'Velo' ? val.toFixed(1) + ' mph' : val.toFixed(0) + ' rpm', name]}
          />
          {Object.entries(byType).map(([type, data]) => (
            <Scatter
              key={type}
              name={type}
              data={data}
              fill={getNormalizedPitchColor(type)}
              fillOpacity={0.7}
            />
          ))}
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
