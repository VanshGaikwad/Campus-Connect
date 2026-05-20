import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ASSIGNABLE_ADMIN_ROLES, ROLE_LABELS } from '../lib/constants'
import { subscribeUsers, updateDocument, deleteDocument } from '../services/firestoreService'

function AdminManagementPage() {
  const [users, setUsers] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    const unsubscribe = subscribeUsers((items) => {
      setUsers(items.filter((item) => item.role !== 'superadmin'))
    })
    return () => unsubscribe()
  }, [])

  const onRoleChange = async (uid, nextRole) => {
    try {
      await updateDocument('users', uid, { role: nextRole })
    } catch (updateError) {
      setError(updateError.message)
    }
  }

  const onDelete = async (uid) => {
    const confirmed = window.confirm('Delete this admin user document?')
    if (!confirmed) {
      return
    }

    try {
      await deleteDocument('users', uid)
    } catch (deleteError) {
      setError(deleteError.message)
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">College Admin Panel</p>
            <h2 className="text-2xl font-semibold text-slate-900">Admin Management</h2>
            <p className="text-sm leading-6 text-slate-600">Create, update role, and delete admin users.</p>
          </div>
          <img src="/image/LOGO.png" alt="College logo" className="h-12 w-12 shrink-0 object-contain" />
        </div>
        <Link
          to="/create-admin"
          className="mt-5 inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800"
        >
          Create Admin
        </Link>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {error ? <p className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
        <table className="min-w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-3 py-2 font-medium text-slate-700">Name</th>
              <th className="px-3 py-2 font-medium text-slate-700">Email</th>
              <th className="px-3 py-2 font-medium text-slate-700">Role</th>
              <th className="px-3 py-2 font-medium text-slate-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((admin) => (
              <tr key={admin.id} className="border-b border-slate-100">
                <td className="px-3 py-2">{admin.name}</td>
                <td className="px-3 py-2">{admin.email}</td>
                <td className="px-3 py-2">
                  <select
                    value={admin.role}
                    onChange={(event) => onRoleChange(admin.id, event.target.value)}
                    className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm shadow-sm transition focus:border-slate-400 focus:outline-none"
                  >
                    {ASSIGNABLE_ADMIN_ROLES.map((role) => (
                      <option key={role} value={role}>
                        {ROLE_LABELS[role]}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => onDelete(admin.id)}
                    className="rounded-lg bg-red-600 px-2 py-1 text-xs text-white shadow-sm transition-colors hover:bg-red-700"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-slate-500">
                  No admins found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500 shadow-sm">
        SCTR&apos;s Pune Institute of Computer Technology • Admin Portal
      </div>
    </div>
  )
}

export default AdminManagementPage
