import { useEffect, type ReactNode } from 'react'
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom'

import { ErrorBoundary } from './components/ErrorBoundary'
import { AuthProvider, useAuth } from './context/AuthContext'
import { SocketProvider } from './context/SocketContext'
import { ToastProvider } from './context/ToastContext'
import { CampusPage } from './pages/CampusPage'
import { CountdownsView } from './pages/CountdownsView'
import { Dashboard } from './pages/Dashboard'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { GuideView } from './pages/GuideView'
import { LandingPage } from './pages/LandingPage'
import { LoginPage } from './pages/LoginPage'
import { ModuleFilesView } from './pages/ModuleFilesView'
import { NotFoundPage } from './pages/NotFoundPage'
import { PetView } from './pages/PetView'
import { ProfilePage } from './pages/ProfilePage'
import { RegisterPage } from './pages/RegisterPage'
import { ScheduleView } from './pages/ScheduleView'
import { SettingsPage } from './pages/SettingsPage'
import { ServerErrorPage } from './pages/ServerErrorPage'
import { StudyRoom } from './pages/StudyRoom'
import { TimerView } from './pages/TimerView'
import './App.css'

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return <main className="route-loading min-h-screen dark:bg-slate-900 dark:text-white"><code>restoring auth/session...</code></main>
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/500" element={<ServerErrorPage />} />
      <Route path="/logout" element={<LogoutRoute />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/campus"
        element={
          <ProtectedRoute>
            <CampusPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/institutions"
        element={
          <ProtectedRoute>
            <CampusPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/files"
        element={
          <ProtectedRoute>
            <ModuleFilesView />
          </ProtectedRoute>
        }
      />
      <Route
        path="/assets"
        element={
          <ProtectedRoute>
            <ModuleFilesView />
          </ProtectedRoute>
        }
      />
      <Route
        path="/schedule"
        element={
          <ProtectedRoute>
            <ScheduleView />
          </ProtectedRoute>
        }
      />
      <Route
        path="/timetable"
        element={
          <ProtectedRoute>
            <ScheduleView />
          </ProtectedRoute>
        }
      />
      <Route
        path="/countdowns"
        element={
          <ProtectedRoute>
            <CountdownsView />
          </ProtectedRoute>
        }
      />
      <Route
        path="/timer"
        element={
          <ProtectedRoute>
            <TimerView />
          </ProtectedRoute>
        }
      />
      <Route
        path="/study-room"
        element={
          <ProtectedRoute>
            <StudyRoom />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pet"
        element={
          <ProtectedRoute>
            <PetView />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/guide"
        element={
          <ProtectedRoute>
            <GuideView />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

function LogoutRoute() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    void logout().finally(() => navigate('/', { replace: true }))
  }, [logout, navigate])

  return <main className="route-loading min-h-screen dark:bg-slate-900 dark:text-slate-100"><code>closing auth/session...</code></main>
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <RouteTree />
      </AuthProvider>
    </BrowserRouter>
  )
}

function RouteTree() {
  const location = useLocation()

  return (
    <ErrorBoundary key={location.key}>
      <ToastProvider>
        <SocketProvider>
          <AppRoutes />
        </SocketProvider>
      </ToastProvider>
    </ErrorBoundary>
  )
}

export default App
