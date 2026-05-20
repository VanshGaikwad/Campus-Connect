import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { roleHomeRoute } from '../lib/permissions'

function LoginPage() {
  const navigate = useNavigate()
  const { login, refreshProfile, isAuthenticated, user } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isAuthenticated && user?.role) {
      navigate(roleHomeRoute[user.role] ?? '/dashboard', { replace: true })
    }
  }, [isAuthenticated, navigate, user])

  const onChange = (event) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }))
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      await login(form.email, form.password)
      const profile = await refreshProfile()
      const nextRoute = profile?.role ? roleHomeRoute[profile.role] : '/dashboard'
      navigate(nextRoute ?? '/dashboard', { replace: true })
    } catch (loginError) {
      setError(loginError.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="grid w-full max-w-5xl grid-cols-1 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl md:grid-cols-2">
        <div className="hidden bg-slate-900 p-8 text-slate-100 md:block">
          <div className="flex h-full flex-col justify-between">
            <div>
              <img src="/image/LOGO.png" alt="College logo" className="h-14 w-14 object-contain" />
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">College Admin Panel</p>
              <h2 className="mt-3 text-3xl font-semibold leading-tight">Simple controls for campus operations</h2>
              <p className="mt-4 text-sm leading-6 text-slate-300">
                Secure access for college admins to manage notices, placements, events, and timetable updates.
              </p>
            </div>

            <ul className="space-y-3 text-sm text-slate-200">
              <li>• Super Admin → Full dashboard access</li>
              <li>• Notice Admin → Notices module</li>
              <li>• TNP Admin → Placements module</li>
              <li>• Event Admin → Events module</li>
              <li>• Timetable Admin → Timetable module</li>
            </ul>
          </div>
        </div>

        <div className="p-6 md:p-8">
          <img src="/image/LOGO.png" alt="College logo" className="mb-4 h-14 w-14 object-contain md:hidden" />
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Welcome back</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">Admin Login</h1>
          <p className="mb-6 mt-2 text-sm leading-6 text-slate-500">Login to access your assigned dashboard.</p>

          <form onSubmit={onSubmit} className="space-y-4">
            <label className="block text-sm font-medium text-slate-700">
              Email
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={onChange}
                required
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none ring-slate-200 transition focus:border-slate-400 focus:ring"
                placeholder="admin@college.com"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Password
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={onChange}
                required
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none ring-slate-200 transition focus:border-slate-400 focus:ring"
                placeholder="Enter password"
              />
            </label>

            {error ? <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p> : null}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800 disabled:opacity-60"
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
