import { useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { addDays, formatDayOfWeek, formatMonthYear, isSameDay, startOfWeek, toISODate } from '../../lib/calendarDates.js'
import { deriveWorkoutStatus, workoutStatusMeta } from '../../lib/facilityConfig.js'

const todayISO = () => toISODate(new Date())

// Persistent 7-day strip pinned above the day view — today highlighted,
// a small dot per workout on that day colored by status. Swiping or the
// arrows move a week at a time; tapping the month/year label opens the
// month sheet, the standard mobile-calendar interaction.
export default function WeekStrip({ selectedDate, onSelect, workoutsByDate, onOpenMonth, sticky = true }) {
  const touchStartX = useRef(null)
  const weekStart = startOfWeek(selectedDate)
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const today = todayISO()

  function shiftWeek(delta) {
    onSelect(addDays(selectedDate, delta * 7))
  }

  function handleTouchStart(e) {
    touchStartX.current = e.touches[0].clientX
  }
  function handleTouchEnd(e) {
    if (touchStartX.current == null) return
    const deltaX = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(deltaX) > 40) shiftWeek(deltaX < 0 ? 1 : -1)
    touchStartX.current = null
  }

  return (
    <div
      className={`bg-white/95 backdrop-blur-xl z-10 pt-2 pb-3 border-b border-neutral-100 ${
        sticky ? 'sticky top-14 -mx-4 md:-mx-8 px-4 md:px-8' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={onOpenMonth}
          className="text-sm font-semibold text-neutral-900 hover:text-accent transition-colors"
        >
          {formatMonthYear(selectedDate)}
        </button>
        <div className="flex items-center gap-1">
          <button onClick={() => shiftWeek(-1)} aria-label="Previous week" className="p-1.5 rounded-full text-neutral-400 hover:bg-neutral-100">
            <ChevronLeft size={16} />
          </button>
          <button onClick={() => shiftWeek(1)} aria-label="Next week" className="p-1.5 rounded-full text-neutral-400 hover:bg-neutral-100">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
      <div className="flex gap-1" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        {days.map((d) => {
          const iso = toISODate(d)
          const isSelected = isSameDay(d, selectedDate)
          const isToday = iso === today
          const workouts = workoutsByDate.get(iso) ?? []
          return (
            <button
              key={iso}
              onClick={() => onSelect(d)}
              className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-xl transition-colors min-h-[56px] ${
                isSelected ? 'bg-neutral-900 text-white' : isToday ? 'bg-accent/10 text-accent' : 'text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              <span className="text-[10px] font-medium uppercase tracking-wide opacity-70">{formatDayOfWeek(d)}</span>
              <span className="text-sm font-semibold">{d.getDate()}</span>
              <span className="flex items-center gap-0.5 h-1.5">
                {workouts.slice(0, 4).map((w) => (
                  <span
                    key={w.id}
                    className={`w-1.5 h-1.5 rounded-full ${
                      isSelected ? 'bg-white/80' : workoutStatusMeta(deriveWorkoutStatus(w, today)).dotClass
                    }`}
                  />
                ))}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
