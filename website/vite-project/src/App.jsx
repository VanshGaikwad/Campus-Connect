import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import DashboardLayout from './components/DashboardLayout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import AdminManagementPage from './pages/AdminManagementPage'
import CreateAdminPage from './pages/CreateAdminPage'
import NoticesPage from './pages/NoticesPage'
import PlacementsPage from './pages/PlacementsPage'
import EventsPage from './pages/EventsPage'
import TimetablePage from './pages/TimetablePage'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route
            path="/admin-management"
            element={
              <ProtectedRoute allowedRoles={['superadmin']}>
                <AdminManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/create-admin"
            element={
              <ProtectedRoute allowedRoles={['superadmin']}>
                <CreateAdminPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notices"
            element={
              <ProtectedRoute allowedRoles={['superadmin', 'notice_admin']}>
                <NoticesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/placements"
            element={
              <ProtectedRoute allowedRoles={['superadmin', 'tnp_admin']}>
                <PlacementsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/events"
            element={
              <ProtectedRoute allowedRoles={['superadmin', 'event_admin']}>
                <EventsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/timetable"
            element={
              <ProtectedRoute allowedRoles={['superadmin', 'timetable_admin']}>
                <TimetablePage />
              </ProtectedRoute>
            }
          />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default App
