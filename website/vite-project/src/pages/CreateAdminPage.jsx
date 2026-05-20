import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ASSIGNABLE_ADMIN_ROLES, ROLE_LABELS } from '../lib/constants'
import { createAdminWithCredentials } from '../services/authService'

function CreateAdminPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: ASSIGNABLE_ADMIN_ROLES[0],
  })
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const onChange = (event) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }))
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setIsSaving(true)

    try {
      await createAdminWithCredentials({
        ...form,
        createdBy: user.uid,
      })
      navigate('/admin-management', { replace: true })
    } catch (createError) {
      setError(createError.message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">College Admin Panel</p>
            <h2 className="text-2xl font-semibold text-slate-900">Create Admin</h2>
            <p className="text-sm leading-6 text-slate-600">Create login credentials and assign one role.</p>
          </div>
          <img src="/image/LOGO.png" alt="College logo" className="h-12 w-12 shrink-0 object-contain" />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="text-sm font-medium text-slate-700">
          Name
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={onChange}
            required
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-slate-400 focus:outline-none"
          />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Email
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={onChange}
            required
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-slate-400 focus:outline-none"
          />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Temporary Password
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={onChange}
            required
            minLength={8}
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-slate-400 focus:outline-none"
          />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Role
          <select
            name="role"
            value={form.role}
            onChange={onChange}
            required
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-slate-400 focus:outline-none"
          >
            {ASSIGNABLE_ADMIN_ROLES.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </select>
        </label>

        {error ? <p className="md:col-span-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

        <div className="md:col-span-2 flex gap-2">
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800 disabled:opacity-60"
          >
            {isSaving ? 'Creating...' : 'Create Admin'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/admin-management')}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      </form>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500 shadow-sm">
        SCTR&apos;s Pune Institute of Computer Technology • Admin Portal
      </div>
    </div>
  )
}

export default CreateAdminPage
