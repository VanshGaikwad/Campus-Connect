import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { roleHomeRoute } from '../lib/permissions'

function ProtectedRoute({ allowedRoles, children }) {
  const { isLoading, isAuthenticated, user } = useAuth()

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles?.length && !allowedRoles.includes(user.role)) {
    return <Navigate to={roleHomeRoute[user.role] ?? '/dashboard'} replace />
  }

  return children || <Outlet />
}

export default ProtectedRoute
