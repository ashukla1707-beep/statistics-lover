import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { Footer } from './components/layout/Footer'
import { Header } from './components/layout/Header'
import { AcademicManagementPage } from './features/admin/AcademicManagementPage'
import { ContentManagementPage } from './features/admin/ContentManagementPage'
import { DeliveryManagementPage } from './features/admin/DeliveryManagementPage'
import { StudentEnrollmentsPage } from './features/admin/StudentEnrollmentsPage'
import {
  AuthPage,
  ForgotPasswordPage,
  RequireAuth,
  ResetPasswordPage,
  SuspendedPage,
} from './features/auth'
import { LearningPage } from './features/courses/LearningPage'
import { LecturePlayerPage } from './features/courses/LecturePlayerPage'
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
        <Route path="forgot-password" element={<ForgotPasswordPage />} />
        <Route path="reset-password" element={<ResetPasswordPage />} />
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
        <Route
          path="learn/:batchId"
          element={
            <RequireAuth
              loadingFallback={<div className="auth-state">Loading your learning space…</div>}
              anonymousFallback={<Navigate to="/login" replace />}
              suspendedFallback={<Navigate to="/account-suspended" replace />}
            >
              <LearningPage />
            </RequireAuth>
          }
        />
        <Route
          path="learn/:batchId/lecture/:lectureId"
          element={
            <RequireAuth
              loadingFallback={<div className="auth-state">Loading recording…</div>}
              anonymousFallback={<Navigate to="/login" replace />}
              suspendedFallback={<Navigate to="/account-suspended" replace />}
            >
              <LecturePlayerPage />
            </RequireAuth>
          }
        />
        <Route
          path="admin/academics"
          element={
            <RequireAuth
              roles={['content_manager', 'admin', 'owner']}
              loadingFallback={<div className="auth-state">Loading academic workspace…</div>}
              anonymousFallback={<Navigate to="/login" replace />}
              unauthorizedFallback={<Navigate to="/dashboard" replace />}
              suspendedFallback={<Navigate to="/account-suspended" replace />}
            >
              <AcademicManagementPage />
            </RequireAuth>
          }
        />
        <Route
          path="admin/content"
          element={
            <RequireAuth
              roles={['content_manager', 'admin', 'owner']}
              loadingFallback={<div className="auth-state">Loading content workspace…</div>}
              anonymousFallback={<Navigate to="/login" replace />}
              unauthorizedFallback={<Navigate to="/dashboard" replace />}
              suspendedFallback={<Navigate to="/account-suspended" replace />}
            >
              <ContentManagementPage />
            </RequireAuth>
          }
        />
        <Route
          path="admin/delivery"
          element={
            <RequireAuth
              roles={['content_manager', 'admin', 'owner']}
              loadingFallback={<div className="auth-state">Loading delivery workspace…</div>}
              anonymousFallback={<Navigate to="/login" replace />}
              unauthorizedFallback={<Navigate to="/dashboard" replace />}
              suspendedFallback={<Navigate to="/account-suspended" replace />}
            >
              <DeliveryManagementPage />
            </RequireAuth>
          }
        />
        <Route
          path="admin/enrollments"
          element={
            <RequireAuth
              roles={['admin', 'owner']}
              loadingFallback={<div className="auth-state">Loading enrollment workspace…</div>}
              anonymousFallback={<Navigate to="/login" replace />}
              unauthorizedFallback={<Navigate to="/dashboard" replace />}
              suspendedFallback={<Navigate to="/account-suspended" replace />}
            >
              <StudentEnrollmentsPage />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
