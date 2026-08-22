import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import { useAuth } from './auth/useAuth'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Patients from './pages/Patients'
import PatientProfile from './pages/PatientProfile'
import Appointments from './pages/Appointments'
import Consultation from './pages/Consultation'
import Billing from './pages/Billing'
import Analytics from './pages/Analytics'
import Engagement from './pages/Engagement'
import Pharmacy from './pages/Pharmacy'
import Laboratory from './pages/Laboratory'
import Inventory from './pages/Inventory'
import Procedures from './pages/Procedures'
import Addons from './pages/Addons'

function Splash() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-surface-50">
      <img src="/favicon.png" alt="Jioplix" className="h-12 w-auto animate-pulse" />
      <p className="text-[13px] font-medium text-surface-400">Loading your clinic…</p>
    </div>
  )
}

function ProtectedRoute() {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <Splash />
  if (status === 'anonymous') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return <Layout />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/patients" element={<Patients />} />
        <Route path="/patients/:id" element={<PatientProfile />} />
        <Route path="/appointments" element={<Appointments />} />
        <Route path="/consultation" element={<Consultation />} />
        <Route path="/encounters/:id" element={<Consultation />} />
        <Route path="/billing" element={<Billing />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/engagement" element={<Engagement />} />
        <Route path="/pharmacy" element={<Pharmacy />} />
        <Route path="/laboratory" element={<Laboratory />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/procedures" element={<Procedures />} />
        <Route path="/addons" element={<Addons />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}
