// Apple-style 1-5 slider used throughout the daily check-in. Native
// range input, styled via the .slider-accent rules in index.css so the
// thumb/track look consistent cross-browser.

export default function Slider({ label, low, high, value, onChange }) {
  return (
    <div className="mb-6">
      <div className="flex items-baseline justify-between mb-2">
        <label className="text-sm font-medium text-neutral-900">{label}</label>
        <span className="text-sm font-semibold text-accent tabular-nums">{value}</span>
      </div>
      <input
        type="range"
        min={1}
        max={5}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="slider-accent w-full"
        style={{ '--slider-fill': `${((value - 1) / 4) * 100}%` }}
      />
      <div className="flex justify-between mt-1.5">
        <span className="text-xs text-neutral-400">{low}</span>
        <span className="text-xs text-neutral-400">{high}</span>
      </div>
    </div>
  )
}
