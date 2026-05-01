import { getNormalizedPitchColor } from '../utils/pitchTypes';

export default function PitchLegend({ pitchTypes, selectedPitchTypes, onToggle }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
      {pitchTypes.map(pt => {
        const active = selectedPitchTypes.length === 0 || selectedPitchTypes.includes(pt);
        const color = getNormalizedPitchColor(pt);
        return (
          <button
            key={pt}
            onClick={() => onToggle(pt)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '4px 10px', borderRadius: 999,
              background: active ? `${color}22` : '#1F2937',
              border: `1.5px solid ${active ? color : '#374151'}`,
              color: active ? color : '#6B7280',
              cursor: 'pointer', fontSize: 12, fontWeight: 500,
              transition: 'all 0.15s',
            }}
          >
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: active ? color : '#4B5563',
              display: 'inline-block',
            }} />
            {pt}
          </button>
        );
      })}
    </div>
  );
}
