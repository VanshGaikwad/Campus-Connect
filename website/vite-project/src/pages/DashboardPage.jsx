import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { roleHomeRoute } from '../lib/permissions'

function DashboardPage() {
  const { user } = useAuth()

  if (!user) {
    return null
  }

  if (user.role !== 'superadmin') {
    return <Navigate to={roleHomeRoute[user.role]} replace />
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="max-w-3xl space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Overview</p>
          <h2 className="text-2xl font-semibold text-slate-900">Super Admin Dashboard</h2>
          <p className="text-sm leading-6 text-slate-600">
            A simple control panel for managing admins, module access, and college-wide updates.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
          <div className="mb-3 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
            Admin Controls
          </div>
          <p className="text-sm leading-6 text-slate-600">
            Create, edit, and remove role-based admins from the admin management area.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
          <div className="mb-3 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
            Module Access
          </div>
          <p className="text-sm leading-6 text-slate-600">
            Manage notices, placements, events, and timetable access using role permissions.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md md:col-span-2 xl:col-span-1">
          <div className="mb-3 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
            Clean Workflow
          </div>
          <p className="text-sm leading-6 text-slate-600">
            Keep the interface lightweight so admins can navigate quickly without extra clutter.
          </p>
        </div>
      </div>
    </div>
  )
}

export default DashboardPage
