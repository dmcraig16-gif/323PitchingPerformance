import { NavLink, Outlet } from 'react-router-dom'
import {
  Home,
  ClipboardCheck,
  Dumbbell,
  Target,
  BookOpen,
  Sunrise,
  Repeat2,
  Brain,
  Users,
  ClipboardList,
  Video,
  LogOut,
} from 'lucide-react'
import { useAuth } from '../lib/useAuth.js'
import { FACILITY_NAME, LOGO_CIRCLE } from '../lib/facilityConfig.js'

const athleteGroups = [
  {
    label: 'Today',
    links: [
      { to: '/dashboard', label: 'Dashboard', icon: Home },
      { to: '/check-in', label: 'Daily Check-In', icon: ClipboardCheck },
    ],
  },
  {
    label: 'Training',
    links: [
      { to: '/program', label: 'My Program', icon: Dumbbell },
      { to: '/command', label: 'Command Tracker', icon: Target },
    ],
  },
  {
    label: 'Growth',
    links: [
      { to: '/journal', label: 'Journal', icon: BookOpen },
      { to: '/devotionals', label: 'Devotionals', icon: Sunrise },
      { to: '/habits', label: 'Habits', icon: Repeat2 },
      { to: '/mental-game', label: 'Mental Game', icon: Brain },
    ],
  },
]

const coachGroup = {
  label: 'Coaching',
  links: [
    { to: '/coach/roster', label: 'Athletes', icon: Users },
    { to: '/coach/programs', label: 'Program Builder', icon: ClipboardList },
    { to: '/coach/exercises', label: 'Exercise Builder', icon: Video },
    { to: '/coach/content', label: 'Content Library', icon: BookOpen },
  ],
}

function initials(name) {
  if (!name) return '?'
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export default function AppShell() {
  const { profile, role, signOut, isDemoMode, demoProfiles, switchDemoProfile } = useAuth()
  // Coaches get a dedicated coaching workspace — not the athlete's own
  // check-in/program nav, which would otherwise point at the coach's own
  // (empty) athlete-style data and just be noise.
  const groups = role === 'coach' ? [coachGroup] : athleteGroups

  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-20 h-14 px-6 flex items-center justify-between bg-neutral-900/90 backdrop-blur-xl text-white border-b border-white/10">
        <div className="flex items-center gap-2">
          <img src={LOGO_CIRCLE} alt={FACILITY_NAME} className="w-8 h-8" />
          <span className="font-semibold text-[15px] tracking-tight tabular-nums opacity-95">{FACILITY_NAME}</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          {isDemoMode && (
            <select
              value={profile?.id ?? ''}
              onChange={(e) => switchDemoProfile(e.target.value)}
              className="bg-white/10 text-white text-xs rounded-full px-3 py-1.5 border border-white/10 focus:outline-none focus:ring-1 focus:ring-white/30"
            >
              {demoProfiles.map((p) => (
                <option key={p.id} value={p.id} className="text-neutral-900">
                  Preview as: {p.name} ({p.role})
                </option>
              ))}
            </select>
          )}
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center text-xs font-semibold">
              {initials(profile?.name)}
            </span>
            <span className="hidden sm:inline text-neutral-200">{profile?.name ?? 'Guest'}</span>
          </div>
          {!isDemoMode && (
            <button
              onClick={signOut}
              className="text-neutral-300 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors"
              aria-label="Sign out"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </header>
      <div className="flex">
        <nav className="w-60 shrink-0 border-r border-neutral-200/70 bg-white min-h-[calc(100vh-56px)] px-3 py-6">
          {groups.map((group, i) => (
            <div key={group.label} className={i === 0 ? '' : 'mt-6'}>
              <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                {group.label}
              </p>
              {group.links.map((link) => {
                const Icon = link.icon
                return (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium mb-0.5 transition-colors ${
                        isActive
                          ? 'bg-neutral-900 text-white'
                          : 'text-neutral-600 hover:bg-neutral-100'
                      }`
                    }
                  >
                    <Icon size={16} strokeWidth={2} />
                    {link.label}
                  </NavLink>
                )
              })}
            </div>
          ))}
        </nav>
        <main className="flex-1 p-8">
          <div className="max-w-6xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
