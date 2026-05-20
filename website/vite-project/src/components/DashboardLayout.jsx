import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { roleModules } from '../lib/permissions'
import { ROLE_LABELS } from '../lib/constants'
import RouteErrorBoundary from './RouteErrorBoundary'

const moduleLinks = [
  { key: 'admin-management', label: 'Admin Management', path: '/admin-management' },
  { key: 'notices', label: 'Notices', path: '/notices' },
  { key: 'placements', label: 'Placements', path: '/placements' },
  { key: 'events', label: 'Events', path: '/events' },
  { key: 'timetable', label: 'Timetable', path: '/timetable' },
]

function DashboardLayout() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const availableModules = roleModules[user.role] ?? []

  const onLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200/80 bg-white/95 px-4 py-4 shadow-sm backdrop-blur md:px-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <img src="/image/LOGO.png" alt="College logo" className="h-12 w-12 shrink-0 object-contain" />
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">College Admin Panel</p>
              <h1 className="text-2xl font-semibold text-slate-900">Admin Dashboard</h1>
              <p className="text-sm text-slate-500">Signed in as {ROLE_LABELS[user.role]}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="hidden rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-600 md:inline-flex">
              {user.email}
            </span>
            <button
              onClick={onLogout}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl grid-cols-12 gap-6 px-4 py-6 md:px-6">
        <aside className="col-span-12 md:col-span-3">
          <div className="sticky top-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 rounded-xl bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Navigation</p>
              <p className="mt-1 text-sm text-slate-600">Switch modules without losing context.</p>
            </div>

            <nav className="space-y-2">
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `block rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
            >
              Dashboard
            </NavLink>
            {moduleLinks
              .filter((module) => availableModules.includes(module.key))
              .map((module) => (
                <NavLink
                  key={module.key}
                  to={module.path}
                  className={({ isActive }) =>
                    `block rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                    }`
                  }
                >
                  {module.label}
                </NavLink>
              ))}
            </nav>
          </div>
        </aside>

        <main className="col-span-12 md:col-span-9">
          <RouteErrorBoundary>
            <Outlet />
          </RouteErrorBoundary>
        </main>
      </div>

      <footer className="border-t border-slate-200 bg-white/90 px-4 py-3 md:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between text-xs text-slate-500">
          <span>SCTR&apos;s Pune Institute of Computer Technology</span>
          <span>Admin Portal</span>
        </div>
      </footer>
    </div>
  )
}

export default DashboardLayout
