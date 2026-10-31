import { useRef, useState } from 'react';
import { Upload, FileText, AlertCircle } from 'lucide-react';
import { parseTrackmanCSV } from '../utils/parseTrackman';
import { sampleDataToCSV } from '../data/sampleData';

const SOURCE_FIELDS = [
  {
    label: 'Trackman',
    color: '#60A5FA',
    fields: 'TaggedPitchType / AutoPitchType, RelSpeed, SpinRate, HorzBreak, InducedVertBreak, PlateLocHeight, PlateLocSide, RelHeight, RelSide, Extension, VertApprAngle, Pitcher, Date, PitchCall',
  },
  {
    label: 'Baseball Savant',
    color: '#34D399',
    fields: 'pitch_name / pitch_type, release_speed, release_spin_rate, pfx_x, pfx_z (converted ft→in), plate_x, plate_z, release_pos_x, release_pos_z, release_extension, spin_axis, player_name, game_date, description',
  },
];

export default function UploadPanel({ onDataLoaded }) {
  const inputRef = useRef();
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleFile(file) {
    if (!file) return;
    if (!file.name.endsWith('.csv')) {
      setError('Please upload a CSV file.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await parseTrackmanCSV(file);
      onDataLoaded(result);
    } catch (e) {
      setError(`Failed to parse file: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  }

  function loadSampleData() {
    setLoading(true);
    setError('');
    const blob = new Blob([sampleDataToCSV()], { type: 'text/csv' });
    const file = new File([blob], 'sample_trackman.csv', { type: 'text/csv' });
    parseTrackmanCSV(file)
      .then(result => onDataLoaded(result))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '48px 16px' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>⚾</div>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#F9FAFB', margin: 0 }}>
          Pitch Visualizer
        </h1>
        <p style={{ color: '#9CA3AF', marginTop: 8 }}>
          Supports <span style={{ color: '#60A5FA' }}>Trackman</span> and{' '}
          <span style={{ color: '#34D399' }}>Baseball Savant</span> CSV exports —
          format is detected automatically
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? '#60A5FA' : '#374151'}`,
          borderRadius: 12,
          padding: '40px 24px',
          textAlign: 'center',
          cursor: 'pointer',
          background: dragging ? '#1E3A5F22' : '#111827',
          transition: 'all 0.15s',
          marginBottom: 16,
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          style={{ display: 'none' }}
          onChange={e => handleFile(e.target.files[0])}
        />
        {loading ? (
          <p style={{ color: '#60A5FA', margin: 0 }}>Parsing data…</p>
        ) : (
          <>
            <Upload size={32} color="#4B5563" style={{ marginBottom: 12 }} />
            <p style={{ color: '#D1D5DB', margin: 0, fontWeight: 500 }}>
              Drop a Trackman or Baseball Savant CSV here
            </p>
            <p style={{ color: '#6B7280', margin: '6px 0 0', fontSize: 13 }}>
              or click to browse
            </p>
          </>
        )}
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#F87171', marginBottom: 12, fontSize: 13 }}>
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <div style={{ textAlign: 'center', color: '#6B7280', fontSize: 13, marginBottom: 12 }}>or</div>

      <button
        onClick={loadSampleData}
        style={{
          width: '100%', padding: '12px', borderRadius: 8,
          background: '#1F2937', border: '1px solid #374151',
          color: '#9CA3AF', cursor: 'pointer', fontSize: 14,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          transition: 'all 0.15s',
        }}
        onMouseOver={e => e.currentTarget.style.borderColor = '#60A5FA'}
        onMouseOut={e => e.currentTarget.style.borderColor = '#374151'}
      >
        <FileText size={16} />
        Load Sample Trackman Data
      </button>

      {/* Supported fields breakdown */}
      <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {SOURCE_FIELDS.map(src => (
          <div key={src.label} style={{
            padding: '12px 14px', background: '#111827',
            borderRadius: 8, border: `1px solid #1F2937`,
          }}>
            <p style={{ margin: '0 0 5px', fontSize: 12, fontWeight: 600, color: src.color }}>
              {src.label}
            </p>
            <p style={{ margin: 0, color: '#6B7280', fontSize: 11, lineHeight: 1.6 }}>
              {src.fields}
            </p>
          </div>
        ))}
        <p style={{ margin: 0, color: '#4B5563', fontSize: 11, textAlign: 'center' }}>
          Baseball Savant pfx_x / pfx_z are automatically converted from feet to inches.
        </p>
      </div>
    </div>
  );
}
