import { Suspense, lazy } from 'react'
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import { useAuth } from './auth/useAuth'
import Layout from './components/Layout'
import OfflineBanner from './components/OfflineBanner'

const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const PlatformAdmin = lazy(() => import('./pages/PlatformAdmin'))
const AdminSettings = lazy(() => import('./pages/AdminSettings'))
const Suspended = lazy(() => import('./pages/Suspended'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Patients = lazy(() => import('./pages/Patients'))
const PatientProfile = lazy(() => import('./pages/PatientProfile'))
const Appointments = lazy(() => import('./pages/Appointments'))
const Consultation = lazy(() => import('./pages/Consultation'))
const ConsultationPicker = lazy(() => import('./pages/ConsultationPicker'))
const Billing = lazy(() => import('./pages/Billing'))
const Analytics = lazy(() => import('./pages/Analytics'))
const Engagement = lazy(() => import('./pages/Engagement'))
const Pharmacy = lazy(() => import('./pages/Pharmacy'))
const Laboratory = lazy(() => import('./pages/Laboratory'))
const Inventory = lazy(() => import('./pages/Inventory'))
const Procedures = lazy(() => import('./pages/Procedures'))
const Addons = lazy(() => import('./pages/Addons'))
const Landing = lazy(() => import('./pages/Landing'))
const UserManagement = lazy(() => import('./pages/UserManagement'))
const Teleconsultation = lazy(() => import('./pages/Teleconsultation'))
const Campaigns = lazy(() => import('./pages/Campaigns'))
const OnlineBooking = lazy(() => import('./pages/OnlineBooking'))
const ABDMIntegration = lazy(() => import('./pages/ABDMIntegration'))
const Onboarding = lazy(() => import('./pages/Onboarding'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))
const SupportPage = lazy(() => import('./pages/SupportPage'))
const BillingPage = lazy(() => import('./pages/BillingPage'))
const PlatformTickets = lazy(() => import('./pages/PlatformTickets'))

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
    <Suspense fallback={<Splash />}>
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
    </Suspense>
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
