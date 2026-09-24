import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import {
  Home,
  ClipboardCheck,
  Calendar,
  Target,
  TrendingUp,
  BookOpen,
  Sunrise,
  Repeat2,
  Brain,
  Users,
  ClipboardList,
  Video,
  LogOut,
  Menu,
  X,
} from 'lucide-react'
import { useAuth } from '../lib/useAuth.js'
import { FACILITY_NAME, LOGO_CIRCLE } from '../lib/facilityConfig.js'

const athleteGroups = [
  {
    label: 'Today',
    links: [
      { to: '/dashboard', label: 'Dashboard', icon: Home },
      { to: '/check-in', label: 'Readiness', icon: ClipboardCheck },
    ],
  },
  {
    label: 'Training',
    links: [
      { to: '/program', label: 'Calendar', icon: Calendar },
      { to: '/command', label: 'Command Tracker', icon: Target },
      { to: '/progress', label: 'Progress', icon: TrendingUp },
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
    { to: '/coach/exercises', label: 'Item Library', icon: Video },
    { to: '/coach/content', label: 'Content Library', icon: BookOpen },
  ],
}

// The bottom tab bar (phones, athletes only — coaches stay desktop-first)
// only has room for a handful of thumb-reachable destinations. The four
// busiest athlete screens go straight on the bar; everything else — the
// "Growth" group — sits one tap away behind "More".
const athletePrimaryLinks = [
  { to: '/dashboard', label: 'Home', icon: Home },
  { to: '/check-in', label: 'Readiness', icon: ClipboardCheck },
  { to: '/program', label: 'Calendar', icon: Calendar },
  { to: '/command', label: 'Command', icon: Target },
]
// Everything not thumb-reachable on the primary bar surfaces here,
// grouped the same way the desktop sidebar groups it — Progress rides
// along with Training's overflow since Calendar/Command already have
// their own primary tabs.
const primaryPaths = new Set(athletePrimaryLinks.map((l) => l.to))
const athleteMoreGroups = [
  { label: 'Training', links: athleteGroups[1].links.filter((l) => !primaryPaths.has(l.to)) },
  { label: 'Growth', links: athleteGroups[2].links },
]

function initials(name) {
  if (!name) return '?'
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function SidebarLinks({ groups, onNavigate }) {
  return (
    <>
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
                onClick={onNavigate}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 rounded-xl px-3 py-2.5 md:py-2 text-sm font-medium mb-0.5 transition-colors ${
                    isActive ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-100'
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
    </>
  )
}

// Slide-up sheet for the phone nav's "More" tab and (on small screens) the
// hamburger menu — same link set as the desktop sidebar, just presented as
// a full-width overlay instead of a fixed column.
function NavSheet({ title, groups, onClose }) {
  return (
    <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute bottom-0 inset-x-0 bg-white rounded-t-3xl shadow-elevated max-h-[80vh] overflow-y-auto pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <p className="text-sm font-semibold text-neutral-900">{title}</p>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-neutral-400 hover:bg-neutral-100"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-3 pb-4">
          <SidebarLinks groups={groups} onNavigate={onClose} />
        </div>
      </div>
    </div>
  )
}

function MobileTabBar({ role, onMore }) {
  const primaryLinks = role === 'coach' ? coachGroup.links : athletePrimaryLinks
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-xl border-t border-neutral-200/70 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-stretch">
        {primaryLinks.map((link) => {
          const Icon = link.icon
          return (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium ${
                  isActive ? 'text-accent' : 'text-neutral-400'
                }`
              }
            >
              <Icon size={20} strokeWidth={2} />
              {link.label}
            </NavLink>
          )
        })}
        {role !== 'coach' && (
          <button
            onClick={onMore}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium text-neutral-400"
          >
            <Menu size={20} strokeWidth={2} />
            More
          </button>
        )}
      </div>
    </nav>
  )
}

export default function AppShell() {
  const { profile, role, signOut, isDemoMode, demoProfiles, switchDemoProfile } = useAuth()
  const [moreOpen, setMoreOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  // Coaches get a dedicated coaching workspace — not the athlete's own
  // check-in/program nav, which would otherwise point at the coach's own
  // (empty) athlete-style data and just be noise.
  const groups = role === 'coach' ? [coachGroup] : athleteGroups

  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-20 h-14 px-4 md:px-6 flex items-center justify-between bg-neutral-900/90 backdrop-blur-xl text-white border-b border-white/10">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => setDrawerOpen(true)}
            className="md:hidden -ml-1 p-1.5 rounded-full hover:bg-white/10 transition-colors shrink-0"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <img src={LOGO_CIRCLE} alt={FACILITY_NAME} className="w-8 h-8 shrink-0" />
          <span className="font-semibold text-[15px] tracking-tight tabular-nums opacity-95 truncate">
            {FACILITY_NAME}
          </span>
        </div>
        <div className="flex items-center gap-2 md:gap-3 text-sm shrink-0">
          {isDemoMode && (
            <select
              value={profile?.id ?? ''}
              onChange={(e) => switchDemoProfile(e.target.value)}
              className="bg-white/10 text-white text-xs rounded-full px-2 md:px-3 py-1.5 border border-white/10 focus:outline-none focus:ring-1 focus:ring-white/30 max-w-[9rem] md:max-w-none"
            >
              {demoProfiles.map((p) => (
                <option key={p.id} value={p.id} className="text-neutral-900">
                  Preview as: {p.name} ({p.role})
                </option>
              ))}
            </select>
          )}
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center text-xs font-semibold shrink-0">
              {initials(profile?.name)}
            </span>
            <span className="hidden lg:inline text-neutral-200">{profile?.name ?? 'Guest'}</span>
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
        <nav className="hidden md:block w-60 shrink-0 border-r border-neutral-200/70 bg-white min-h-[calc(100vh-56px)] px-3 py-6">
          <SidebarLinks groups={groups} />
        </nav>
        <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8">
          <div className="max-w-6xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      <MobileTabBar role={role} onMore={() => setMoreOpen(true)} />
      {moreOpen && (
        <NavSheet title="More" groups={athleteMoreGroups} onClose={() => setMoreOpen(false)} />
      )}
      {drawerOpen && <NavSheet title={FACILITY_NAME} groups={groups} onClose={() => setDrawerOpen(false)} />}
    </div>
  )
}
