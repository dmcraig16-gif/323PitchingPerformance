import { ChevronDown } from 'lucide-react';

const selectStyle = {
  background: '#1F2937',
  border: '1px solid #374151',
  color: '#D1D5DB',
  padding: '6px 28px 6px 10px',
  borderRadius: 6,
  fontSize: 13,
  cursor: 'pointer',
  appearance: 'none',
  WebkitAppearance: 'none',
  minWidth: 140,
};

export default function FilterBar({ pitchers, selectedPitcher, onPitcherChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      <label style={{ color: '#9CA3AF', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
        Pitcher
        <div style={{ position: 'relative' }}>
          <select
            value={selectedPitcher}
            onChange={e => onPitcherChange(e.target.value)}
            style={selectStyle}
          >
            <option value="">All Pitchers</option>
            {pitchers.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <ChevronDown size={14} color="#6B7280"
            style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        </div>
      </label>
    </div>
  );
}
