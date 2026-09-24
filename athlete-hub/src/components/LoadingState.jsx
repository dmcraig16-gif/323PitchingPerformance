import { LOGO_CIRCLE } from '../lib/facilityConfig.js'

// Shared loading placeholder — a faint pulse of the 3:23 mark instead of
// bare text, so the many brief loading moments across the app carry a
// touch of the same identity as the header/login screen rather than
// reading as leftover debug text. Kept deliberately quiet (small, low
// opacity) since this shows up constantly.
export default function LoadingState({ label = 'Loading…', size = 'sm' }) {
  const textClass = size === 'xs' ? 'text-xs' : 'text-sm'
  const iconClass = size === 'xs' ? 'w-3.5 h-3.5' : 'w-4 h-4'

  return (
    <div className="flex items-center gap-2">
      <img src={LOGO_CIRCLE} alt="" className={`${iconClass} opacity-30 animate-pulse`} />
      <p className={`${textClass} text-neutral-400`}>{label}</p>
    </div>
  )
}
