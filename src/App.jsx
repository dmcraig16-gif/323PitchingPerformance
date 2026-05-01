import { useState, useMemo } from 'react';
import { Upload, RefreshCw } from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import UploadPanel from './components/UploadPanel';
import StrikeZoneChart from './components/StrikeZoneChart';
import MovementChart from './components/MovementChart';
import ReleasePointChart from './components/ReleasePointChart';
import { VelocityChart, SpinRateChart, VeloSpinScatter } from './components/VeloSpinCharts';
import StatsTable from './components/StatsTable';
import PitchLegend from './components/PitchLegend';
import FilterBar from './components/FilterBar';
import ElevationAdjustment from './components/ElevationAdjustment';
import { getUnique, computeStats } from './utils/parseTrackman';
import { PITCH_TYPE_ORDER, getNormalizedPitchColor } from './utils/pitchTypes';
import './index.css';

const TABS = [
  { id: 'location', label: 'Location' },
  { id: 'movement', label: 'Movement' },
  { id: 'velocity', label: 'Velocity & Spin' },
  { id: 'release', label: 'Release Point' },
  { id: 'elevation', label: 'Elevation' },
];

function UsageChart({ pitches, selectedPitchTypes }) {
  const stats = useMemo(() => {
    const source = selectedPitchTypes.length > 0
      ? pitches.filter(p => selectedPitchTypes.includes(p.pitchType))
      : pitches;
    return computeStats(source).map(d => ({ ...d, color: getNormalizedPitchColor(d.pitchType) }));
  }, [pitches, selectedPitchTypes]);

  if (!stats.length) return null;

  return (
    <div className="chart-card">
      <h3 className="chart-title">Pitch Usage</h3>
      <p className="chart-subtitle">Distribution by pitch type</p>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={stats}
            dataKey="count"
            nameKey="pitchType"
            cx="50%"
            cy="50%"
            outerRadius={90}
            label={({ pitchType, percent }) => `${pitchType} ${(percent * 100).toFixed(0)}%`}
            labelLine
          >
            {stats.map((d, i) => <Cell key={i} fill={d.color} />)}
          </Pie>
          <Tooltip
            contentStyle={{ background: '#1F2937', border: '1px solid #374151', borderRadius: 6 }}
            formatter={(val, name) => [val, name]}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function ApproachAnglesChart({ pitches, selectedPitchTypes }) {
  const stats = useMemo(() => {
    const byType = {};
    for (const p of pitches) {
      if (selectedPitchTypes.length > 0 && !selectedPitchTypes.includes(p.pitchType)) continue;
      if (p.vertApprAngle === null) continue;
      if (!byType[p.pitchType]) byType[p.pitchType] = [];
      byType[p.pitchType].push(p.vertApprAngle);
    }
    return PITCH_TYPE_ORDER.filter(t => byType[t])
      .map(t => ({
        pitchType: t,
        avgVAA: byType[t].reduce((a, b) => a + b, 0) / byType[t].length,
        color: getNormalizedPitchColor(t),
      }));
  }, [pitches, selectedPitchTypes]);

  return (
    <div className="chart-card">
      <h3 className="chart-title">Vertical Approach Angle</h3>
      <p className="chart-subtitle">Average VAA by pitch type (degrees)</p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={stats} margin={{ top: 20, right: 16, left: 8, bottom: 20 }} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
          <XAxis type="number" domain={['auto', 'auto']} tick={{ fill: '#9CA3AF', fontSize: 11 }}
            tickFormatter={v => v.toFixed(1) + '°'} />
          <YAxis type="category" dataKey="pitchType" tick={{ fill: '#9CA3AF', fontSize: 11 }} width={70} />
          <Tooltip
            contentStyle={{ background: '#1F2937', border: '1px solid #374151', borderRadius: 6 }}
            formatter={(val) => [val.toFixed(2) + '°', 'Avg VAA']}
          />
          <Bar dataKey="avgVAA" radius={[0, 4, 4, 0]}>
            {stats.map((d, i) => <Cell key={i} fill={d.color} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function ExtensionChart({ pitches, selectedPitchTypes }) {
  const stats = useMemo(() => {
    const byType = {};
    for (const p of pitches) {
      if (selectedPitchTypes.length > 0 && !selectedPitchTypes.includes(p.pitchType)) continue;
      if (p.extension === null) continue;
      if (!byType[p.pitchType]) byType[p.pitchType] = [];
      byType[p.pitchType].push(p.extension);
    }
    return PITCH_TYPE_ORDER.filter(t => byType[t])
      .map(t => ({
        pitchType: t,
        avgExt: byType[t].reduce((a, b) => a + b, 0) / byType[t].length,
        color: getNormalizedPitchColor(t),
      }));
  }, [pitches, selectedPitchTypes]);

  return (
    <div className="chart-card">
      <h3 className="chart-title">Extension</h3>
      <p className="chart-subtitle">Average release extension by pitch type (ft)</p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={stats} margin={{ top: 20, right: 16, left: 8, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="pitchType" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
          <YAxis domain={[5, 'auto']} tick={{ fill: '#9CA3AF', fontSize: 11 }}
            tickFormatter={v => v.toFixed(1)} />
          <Tooltip
            contentStyle={{ background: '#1F2937', border: '1px solid #374151', borderRadius: 6 }}
            formatter={(val) => [val.toFixed(2) + ' ft', 'Avg Extension']}
          />
          <Bar dataKey="avgExt" radius={[4, 4, 0, 0]}>
            {stats.map((d, i) => <Cell key={i} fill={d.color} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function App() {
  const [data, setData] = useState(null);
  const [selectedPitchTypes, setSelectedPitchTypes] = useState([]);
  const [selectedPitcher, setSelectedPitcher] = useState('');
  const [activeTab, setActiveTab] = useState('location');

  function handleDataLoaded(result) {
    setData(result);
    setSelectedPitchTypes([]);
    setSelectedPitcher('');
  }

  const pitches = useMemo(() => {
    if (!data) return [];
    return selectedPitcher
      ? data.pitches.filter(p => p.pitcher === selectedPitcher)
      : data.pitches;
  }, [data, selectedPitcher]);

  const pitchTypes = useMemo(() => {
    const found = getUnique(pitches, 'pitchType');
    return PITCH_TYPE_ORDER.filter(t => found.includes(t)).concat(
      found.filter(t => !PITCH_TYPE_ORDER.includes(t))
    );
  }, [pitches]);

  const pitchers = useMemo(() => data ? getUnique(data.pitches, 'pitcher') : [], [data]);

  function togglePitchType(pt) {
    setSelectedPitchTypes(prev =>
      prev.includes(pt) ? prev.filter(t => t !== pt) : [...prev, pt]
    );
  }

  if (!data) {
    return (
      <div style={{ minHeight: '100vh', background: '#0D1117' }}>
        <UploadPanel onDataLoaded={handleDataLoaded} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0D1117', color: '#F9FAFB' }}>
      {/* Header */}
      <header style={{
        borderBottom: '1px solid #1F2937',
        padding: '14px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22 }}>⚾</span>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Trackman Pitch Visualizer</h1>
          <span style={{ color: '#6B7280', fontSize: 13, marginLeft: 8 }}>
            {pitches.length} pitches
            {selectedPitcher && ` · ${selectedPitcher}`}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <FilterBar
            pitchers={pitchers}
            selectedPitcher={selectedPitcher}
            onPitcherChange={setSelectedPitcher}
          />
          <button
            onClick={() => setData(null)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 6,
              background: '#1F2937', border: '1px solid #374151',
              color: '#9CA3AF', cursor: 'pointer', fontSize: 13,
            }}
          >
            <Upload size={14} />
            New File
          </button>
        </div>
      </header>

      <main style={{ padding: '20px 24px', maxWidth: 1400, margin: '0 auto' }}>
        {/* Summary Table */}
        <StatsTable pitches={pitches} selectedPitchTypes={selectedPitchTypes} />

        {/* Legend / pitch-type filter */}
        <div style={{ margin: '16px 0', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ color: '#6B7280', fontSize: 12 }}>Filter by pitch:</span>
          <PitchLegend
            pitchTypes={pitchTypes}
            selectedPitchTypes={selectedPitchTypes}
            onToggle={togglePitchType}
          />
          {selectedPitchTypes.length > 0 && (
            <button
              onClick={() => setSelectedPitchTypes([])}
              style={{
                fontSize: 12, color: '#6B7280', background: 'none',
                border: 'none', cursor: 'pointer', padding: '2px 6px',
                display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              <RefreshCw size={11} /> Clear
            </button>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #1F2937', marginBottom: 20 }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '8px 16px',
                background: 'none',
                border: 'none',
                borderBottom: `2px solid ${activeTab === tab.id ? '#60A5FA' : 'transparent'}`,
                color: activeTab === tab.id ? '#60A5FA' : '#6B7280',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: activeTab === tab.id ? 600 : 400,
                marginBottom: -1,
                transition: 'all 0.15s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Chart panels */}
        {activeTab === 'location' && (
          <div className="chart-grid chart-grid-2">
            <StrikeZoneChart pitches={pitches} selectedPitchTypes={selectedPitchTypes} />
            <UsageChart pitches={pitches} selectedPitchTypes={selectedPitchTypes} />
          </div>
        )}

        {activeTab === 'movement' && (
          <div className="chart-grid chart-grid-2">
            <MovementChart pitches={pitches} selectedPitchTypes={selectedPitchTypes} />
            <ApproachAnglesChart pitches={pitches} selectedPitchTypes={selectedPitchTypes} />
          </div>
        )}

        {activeTab === 'velocity' && (
          <div>
            <div className="chart-grid chart-grid-2" style={{ marginBottom: 20 }}>
              <VelocityChart pitches={pitches} selectedPitchTypes={selectedPitchTypes} />
              <SpinRateChart pitches={pitches} selectedPitchTypes={selectedPitchTypes} />
            </div>
            <VeloSpinScatter pitches={pitches} selectedPitchTypes={selectedPitchTypes} />
          </div>
        )}

        {activeTab === 'release' && (
          <div className="chart-grid chart-grid-2">
            <ReleasePointChart pitches={pitches} selectedPitchTypes={selectedPitchTypes} />
            <ExtensionChart pitches={pitches} selectedPitchTypes={selectedPitchTypes} />
          </div>
        )}

        {activeTab === 'elevation' && (
          <ElevationAdjustment pitches={pitches} selectedPitchTypes={selectedPitchTypes} />
        )}
      </main>
    </div>
  );
}
