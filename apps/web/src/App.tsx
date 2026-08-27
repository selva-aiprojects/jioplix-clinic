import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import { useAuth } from './auth/useAuth'
import Layout from './components/Layout'
import OfflineBanner from './components/OfflineBanner'
import Login from './pages/Login'
import Register from './pages/Register'
import PlatformAdmin from './pages/PlatformAdmin'
import AdminSettings from './pages/AdminSettings'
import Suspended from './pages/Suspended'
import Dashboard from './pages/Dashboard'
import Patients from './pages/Patients'
import PatientProfile from './pages/PatientProfile'
import Appointments from './pages/Appointments'
import Consultation from './pages/Consultation'
import ConsultationPicker from './pages/ConsultationPicker'
import Billing from './pages/Billing'
import Analytics from './pages/Analytics'
import Engagement from './pages/Engagement'
import Pharmacy from './pages/Pharmacy'
import Laboratory from './pages/Laboratory'
import Inventory from './pages/Inventory'
import Procedures from './pages/Procedures'
import Addons from './pages/Addons'
import Landing from './pages/Landing'
import UserManagement from './pages/UserManagement'
import Teleconsultation from './pages/Teleconsultation'
import Campaigns from './pages/Campaigns'
import OnlineBooking from './pages/OnlineBooking'
import ABDMIntegration from './pages/ABDMIntegration'
import Onboarding from './pages/Onboarding'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import SupportPage from './pages/SupportPage'
import BillingPage from './pages/BillingPage'
import PlatformTickets from './pages/PlatformTickets'

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

  const onboardingCompleted = localStorage.getItem('jioplix.onboarding.completed')
  if (onboardingCompleted !== 'true') {
    return <Onboarding />
  }

  return <Layout />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/admin" element={<PlatformAdmin />} />
      <Route path="/admin/settings" element={<AdminSettings />} />
      <Route path="/admin/tickets" element={<PlatformTickets />} />
      <Route path="/suspended" element={<Suspended />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/patients" element={<Patients />} />
        <Route path="/patients/:id" element={<PatientProfile />} />
        <Route path="/appointments" element={<Appointments />} />
        <Route path="/consultation" element={<ConsultationPicker />} />
        <Route path="/encounters/:id" element={<Consultation />} />
        <Route path="/billing" element={<Billing />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/engagement" element={<Engagement />} />
        <Route path="/pharmacy" element={<Pharmacy />} />
        <Route path="/laboratory" element={<Laboratory />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/procedures" element={<Procedures />} />
        <Route path="/addons" element={<Addons />} />
        <Route path="/users" element={<UserManagement />} />
        <Route path="/teleconsultation" element={<Teleconsultation />} />
        <Route path="/campaigns" element={<Campaigns />} />
        <Route path="/online-booking" element={<OnlineBooking />} />
        <Route path="/abdm" element={<ABDMIntegration />} />
        <Route path="/support" element={<SupportPage />} />
        <Route path="/plans" element={<BillingPage />} />
      </Route>
      <Route path="/" element={<Landing />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <AppRoutes />
        <OfflineBanner />
      </HashRouter>
    </AuthProvider>
  )
}
