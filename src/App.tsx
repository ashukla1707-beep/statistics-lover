import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { Footer } from './components/layout/Footer'
import { Header } from './components/layout/Header'
import { AuthPage, RequireAuth, SuspendedPage } from './features/auth'
import { DashboardPage } from './features/dashboard/DashboardPage'
import { HomePage } from './features/home/HomePage'

function SiteLayout() {
  return (
    <div className="app-shell">
      <Header />
      <main>
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route index element={<HomePage />} />
        <Route path="login" element={<AuthPage mode="login" />} />
        <Route path="register" element={<AuthPage mode="register" />} />
        <Route path="account-suspended" element={<SuspendedPage />} />
        <Route
          path="dashboard"
          element={
            <RequireAuth
              loadingFallback={<div className="auth-state">Loading your account…</div>}
              anonymousFallback={<Navigate to="/login" replace />}
              suspendedFallback={<Navigate to="/account-suspended" replace />}
            >
              <DashboardPage />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
