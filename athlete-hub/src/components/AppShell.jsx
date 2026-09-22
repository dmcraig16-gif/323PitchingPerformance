import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../lib/useAuth.js'
import { FACILITY_NAME } from '../lib/facilityConfig.js'

const athleteLinks = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/check-in', label: 'Daily Check-In' },
  { to: '/program', label: 'My Program' },
  { to: '/command', label: 'Command Training' },
  { to: '/journal', label: 'Journal' },
  { to: '/devotionals', label: 'Devotionals' },
  { to: '/habits', label: 'Habits' },
  { to: '/mental-game', label: 'Mental Game' },
]

const coachLinks = [
  { to: '/coach/roster', label: 'Athletes' },
  { to: '/coach/programs', label: 'Program Builder' },
  { to: '/coach/content', label: 'Content Library' },
]

export default function AppShell() {
  const { profile, role, signOut, isDemoMode, demoProfiles, switchDemoProfile } = useAuth()
  const links = role === 'coach' ? [...athleteLinks, ...coachLinks] : athleteLinks

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
        <span className="font-semibold text-lg">{FACILITY_NAME}</span>
        <div className="flex items-center gap-4 text-sm">
          {isDemoMode && (
            <select
              value={profile?.id ?? ''}
              onChange={(e) => switchDemoProfile(e.target.value)}
              className="bg-slate-800 text-white text-xs rounded-md px-2 py-1 border border-slate-700"
            >
              {demoProfiles.map((p) => (
                <option key={p.id} value={p.id}>
                  Preview as: {p.name} ({p.role})
                </option>
              ))}
            </select>
          )}
          <span>{profile?.name ?? 'Guest'}</span>
          {!isDemoMode && (
            <button onClick={signOut} className="text-slate-300 hover:text-white">
              Sign out
            </button>
          )}
        </div>
      </header>
      <div className="flex">
        <nav className="w-56 shrink-0 border-r border-slate-200 bg-white min-h-[calc(100vh-64px)] p-4">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `block rounded-md px-3 py-2 text-sm font-medium mb-1 ${
                  isActive ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        <main className="flex-1 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
