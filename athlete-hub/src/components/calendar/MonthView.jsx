import { useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { addMonths, formatDayOfWeek, formatMonthYear, isSameDay, monthGrid, toISODate } from '../../lib/calendarDates.js'
import { deriveWorkoutStatus, workoutStatusMeta } from '../../lib/facilityConfig.js'

const todayISO = () => toISODate(new Date())

// Bottom-sheet month grid, opened from WeekStrip's month/year label —
// jump further out than a week without leaving the calendar screen.
// Picking a date selects it and closes the sheet; the 6x7 grid always
// covers the full month plus the adjacent-month days needed to fill it.
export default function MonthView({ initialMonth, selectedDate, workoutsByDate, onSelectDate, onClose }) {
  const [visibleMonth, setVisibleMonth] = useState(initialMonth)
  const today = todayISO()
  const grid = monthGrid(visibleMonth)
  const weekLabels = grid.slice(0, 7).map((d) => formatDayOfWeek(d))

  return (
    <div className="fixed inset-0 z-40" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute bottom-0 inset-x-0 bg-white rounded-t-3xl shadow-elevated max-h-[85vh] overflow-y-auto pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <div className="flex items-center gap-1">
            <button onClick={() => setVisibleMonth((m) => addMonths(m, -1))} aria-label="Previous month" className="p-1.5 rounded-full text-neutral-400 hover:bg-neutral-100">
              <ChevronLeft size={18} />
            </button>
            <p className="text-sm font-semibold text-neutral-900 w-36 text-center">{formatMonthYear(visibleMonth)}</p>
            <button onClick={() => setVisibleMonth((m) => addMonths(m, 1))} aria-label="Next month" className="p-1.5 rounded-full text-neutral-400 hover:bg-neutral-100">
              <ChevronRight size={18} />
            </button>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full text-neutral-400 hover:bg-neutral-100" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="px-4 pb-6">
          <div className="grid grid-cols-7 mb-1">
            {weekLabels.map((label, i) => (
              <p key={i} className="text-center text-[10px] font-medium uppercase tracking-wide text-neutral-400 py-1">
                {label}
              </p>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-1">
            {grid.map((d) => {
              const iso = toISODate(d)
              const inMonth = d.getMonth() === visibleMonth.getMonth()
              const isToday = iso === today
              const isSelected = isSameDay(d, selectedDate)
              const workouts = workoutsByDate.get(iso) ?? []
              return (
                <button
                  key={iso}
                  onClick={() => {
                    onSelectDate(d)
                    onClose()
                  }}
                  className="flex flex-col items-center gap-1 py-1.5"
                >
                  <span
                    className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium transition-colors ${
                      isSelected
                        ? 'bg-neutral-900 text-white'
                        : isToday
                          ? 'bg-accent/10 text-accent font-semibold'
                          : inMonth
                            ? 'text-neutral-700 hover:bg-neutral-100'
                            : 'text-neutral-300'
                    }`}
                  >
                    {d.getDate()}
                  </span>
                  <span className="flex items-center gap-0.5 h-1.5">
                    {workouts.slice(0, 4).map((w) => (
                      <span key={w.id} className={`w-1.5 h-1.5 rounded-full ${workoutStatusMeta(deriveWorkoutStatus(w, today)).dotClass}`} />
                    ))}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
