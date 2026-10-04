import { lazy,Suspense,useEffect } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { Footer } from './components/layout/Footer'
import { Header } from './components/layout/Header'
import { RouteFocus } from './components/layout/RouteFocus'
import { NotFoundPage } from './features/system/NotFoundPage'
import {
  AuthPage,
  ForgotPasswordPage,
  RequireAuth,
  ResetPasswordPage,
  SuspendedPage,
  useAuth,
} from './features/auth'
import { HomePage } from './features/home/HomePage'
import { isStatisticsLoverNativeShell } from './lib/runtime'


const AcademicManagementPage=lazy(()=>import('./features/admin/AcademicManagementPage').then((module)=>({default:module.AcademicManagementPage})))
const AttendanceManagementPage=lazy(()=>import('./features/admin/AttendanceManagementPage').then((module)=>({default:module.AttendanceManagementPage})))
const AssignmentManagementPage=lazy(()=>import('./features/admin/AssignmentManagementPage').then((module)=>({default:module.AssignmentManagementPage})))
const ContentManagementPage=lazy(()=>import('./features/admin/ContentManagementPage').then((module)=>({default:module.ContentManagementPage})))
const DeliveryManagementPage=lazy(()=>import('./features/admin/DeliveryManagementPage').then((module)=>({default:module.DeliveryManagementPage})))
const ResourceManagementPage=lazy(()=>import('./features/admin/ResourceManagementPage').then((module)=>({default:module.ResourceManagementPage})))
const QuestionBankPage=lazy(()=>import('./features/admin/QuestionBankPage').then((module)=>({default:module.QuestionBankPage})))
const TestBuilderPage=lazy(()=>import('./features/admin/TestBuilderPage').then((module)=>({default:module.TestBuilderPage})))
const TestSchedulePage=lazy(()=>import('./features/admin/TestSchedulePage').then((module)=>({default:module.TestSchedulePage})))
const AssessmentAnalyticsPage=lazy(()=>import('./features/admin/AssessmentAnalyticsPage').then((module)=>({default:module.AssessmentAnalyticsPage})))
const CommerceManagementPage=lazy(()=>import('./features/admin/CommerceManagementPage').then((module)=>({default:module.CommerceManagementPage})))
const AdminOverviewPage=lazy(()=>import('./features/admin/AdminOverviewPage').then((module)=>({default:module.AdminOverviewPage})))
const AdminAuditPage=lazy(()=>import('./features/admin/AdminAuditPage').then((module)=>({default:module.AdminAuditPage})))
const AdminSettingsPage=lazy(()=>import('./features/admin/AdminSettingsPage').then((module)=>({default:module.AdminSettingsPage})))
const AnnouncementManagementPage=lazy(()=>import('./features/admin/AnnouncementManagementPage').then((module)=>({default:module.AnnouncementManagementPage})))
const StaffManagementPage=lazy(()=>import('./features/admin/StaffManagementPage').then((module)=>({default:module.StaffManagementPage})))
const StudentEnrollmentsPage=lazy(()=>import('./features/admin/StudentEnrollmentsPage').then((module)=>({default:module.StudentEnrollmentsPage})))
const LearningPage=lazy(()=>import('./features/courses/LearningPage').then((module)=>({default:module.LearningPage})))
const StudentAssignmentsPage=lazy(()=>import('./features/courses/StudentAssignmentsPage').then((module)=>({default:module.StudentAssignmentsPage})))
const StudentTestsPage=lazy(()=>import('./features/courses/StudentTestsPage').then((module)=>({default:module.StudentTestsPage})))
const StudentPerformancePage=lazy(()=>import('./features/courses/StudentPerformancePage').then((module)=>({default:module.StudentPerformancePage})))
const StudentTestAttemptPage=lazy(()=>import('./features/courses/StudentTestAttemptPage').then((module)=>({default:module.StudentTestAttemptPage})))
const LecturePlayerPage=lazy(()=>import('./features/courses/LecturePlayerPage').then((module)=>({default:module.LecturePlayerPage})))
const DashboardPage=lazy(()=>import('./features/dashboard/DashboardPage').then((module)=>({default:module.DashboardPage})))
const StorePage=lazy(()=>import('./features/commerce/StorePage').then((module)=>({default:module.StorePage})))
const MyOrdersPage=lazy(()=>import('./features/commerce/MyOrdersPage').then((module)=>({default:module.MyOrdersPage})))
const NotificationsPage=lazy(()=>import('./features/communications/NotificationsPage').then((module)=>({default:module.NotificationsPage})))
const TeacherWorkspacePage=lazy(()=>import('./features/teacher/TeacherWorkspacePage').then((module)=>({default:module.TeacherWorkspacePage})))

function StartupLandingPage() {
  const { status } = useAuth()

  // /app-start is an APK-only cold-start route. Normal Home navigation always
  // uses "/" and therefore never redirects a signed-in user back to Dashboard.
  if (!isStatisticsLoverNativeShell()) {
    return <Navigate to="/" replace />
  }

  // Keep the native splash overlay visible while Supabase restores the session.
  if (status === 'booting') return null

  if (status === 'authenticated') {
    return <Navigate to="/dashboard" replace />
  }

  if (status === 'suspended') {
    return <Navigate to="/account-suspended" replace />
  }

  return <Navigate to="/" replace />
}

function NativeReadySignal() {
  const { status } = useAuth()
  const location = useLocation()

  useEffect(() => {
    if (!isStatisticsLoverNativeShell()) return
    if (status === 'booting' || location.pathname === '/app-start') return

    const bridge = (window as Window & {
      StatisticsLoverNative?: { appReady?: () => void }
    }).StatisticsLoverNative

    let secondFrame = 0
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => bridge?.appReady?.())
    })

    return () => {
      window.cancelAnimationFrame(firstFrame)
      if (secondFrame) window.cancelAnimationFrame(secondFrame)
    }
  }, [location.pathname, status])

  return null
}

function SiteLayout() {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <Header/>
      <RouteFocus />
      <main id="main-content" tabIndex={-1}>
        <Outlet />
      </main>
      <Footer/>
    </div>
  )
}

export default function App() {
  return (
    <Suspense fallback={<div className="route-loading" role="status" aria-live="polite">Loading page…</div>}>
      <NativeReadySignal />
      <Routes>
      <Route
        path="learn/:batchId/test/:scheduleId"
        element={
          <RequireAuth
            loadingFallback={<div className="assessment-runner-loading">Loading secure test…</div>}
            anonymousFallback={<Navigate to="/login" replace />}
            suspendedFallback={<Navigate to="/account-suspended" replace />}
          >
            <StudentTestAttemptPage />
          </RequireAuth>
        }
      />

      <Route
        path="learn/:batchId/lecture/:lectureId"
        element={
          <RequireAuth
            loadingFallback={<div className="lecture-player-loading">Loading recording…</div>}
            anonymousFallback={<Navigate to="/login" replace />}
            suspendedFallback={<Navigate to="/account-suspended" replace />}
          >
            <LecturePlayerPage />
          </RequireAuth>
        }
      />

      <Route element={<SiteLayout />}>
        <Route index element={<HomePage />} />
        <Route path="app-start" element={<StartupLandingPage />} />
        <Route path="store" element={<StorePage />} />
        <Route
          path="notifications"
          element={
            <RequireAuth
              loadingFallback={<div className="auth-state">Loading notifications…</div>}
              anonymousFallback={<Navigate to="/login" replace />}
              suspendedFallback={<Navigate to="/account-suspended" replace />}
            >
              <NotificationsPage />
            </RequireAuth>
          }
        />
        <Route path="login" element={<AuthPage mode="login" />} />
        <Route path="register" element={<AuthPage mode="register" />} />
        <Route path="forgot-password" element={<ForgotPasswordPage />} />
        <Route path="reset-password" element={<ResetPasswordPage />} />
        <Route path="account-suspended" element={<SuspendedPage />} />
        <Route
          path="orders"
          element={
            <RequireAuth
              loadingFallback={<div className="auth-state">Loading orders…</div>}
              anonymousFallback={<Navigate to="/login" replace />}
              suspendedFallback={<Navigate to="/account-suspended" replace />}
            >
              <MyOrdersPage />
            </RequireAuth>
          }
        />
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
          path="learn/:batchId/tests"
          element={
            <RequireAuth
              loadingFallback={<div className="auth-state">Loading tests…</div>}
              anonymousFallback={<Navigate to="/login" replace />}
              suspendedFallback={<Navigate to="/account-suspended" replace />}
            >
              <StudentTestsPage />
            </RequireAuth>
          }
        />
        <Route
          path="learn/:batchId/performance"
          element={
            <RequireAuth
              loadingFallback={<div className="auth-state">Loading performance…</div>}
              anonymousFallback={<Navigate to="/login" replace />}
              suspendedFallback={<Navigate to="/account-suspended" replace />}
            >
              <StudentPerformancePage />
            </RequireAuth>
          }
        />
        <Route
          path="learn/:batchId/assignments"
          element={
            <RequireAuth
              loadingFallback={<div className="auth-state">Loading assignments…</div>}
              anonymousFallback={<Navigate to="/login" replace />}
              suspendedFallback={<Navigate to="/account-suspended" replace />}
            >
              <StudentAssignmentsPage />
            </RequireAuth>
          }
        />
        <Route
          path="admin/overview"
          element={
            <RequireAuth
              roles={['content_manager', 'admin', 'owner']}
              loadingFallback={<div className="auth-state">Loading admin overview…</div>}
              anonymousFallback={<Navigate to="/login" replace />}
              unauthorizedFallback={<Navigate to="/dashboard" replace />}
              suspendedFallback={<Navigate to="/account-suspended" replace />}
            >
              <AdminOverviewPage />
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
          path="admin/resources"
          element={
            <RequireAuth
              roles={['content_manager', 'admin', 'owner']}
              loadingFallback={<div className="auth-state">Loading resource workspace…</div>}
              anonymousFallback={<Navigate to="/login" replace />}
              unauthorizedFallback={<Navigate to="/dashboard" replace />}
              suspendedFallback={<Navigate to="/account-suspended" replace />}
            >
              <ResourceManagementPage />
            </RequireAuth>
          }
        />
        <Route
          path="admin/questions"
          element={
            <RequireAuth
              roles={['content_manager', 'admin', 'owner']}
              loadingFallback={<div className="auth-state">Loading question bank…</div>}
              anonymousFallback={<Navigate to="/login" replace />}
              unauthorizedFallback={<Navigate to="/dashboard" replace />}
              suspendedFallback={<Navigate to="/account-suspended" replace />}
            >
              <QuestionBankPage />
            </RequireAuth>
          }
        />
        <Route
          path="admin/tests"
          element={
            <RequireAuth
              roles={['content_manager', 'admin', 'owner']}
              loadingFallback={<div className="auth-state">Loading test builder…</div>}
              anonymousFallback={<Navigate to="/login" replace />}
              unauthorizedFallback={<Navigate to="/dashboard" replace />}
              suspendedFallback={<Navigate to="/account-suspended" replace />}
            >
              <TestBuilderPage />
            </RequireAuth>
          }
        />
        <Route
          path="admin/test-schedules"
          element={
            <RequireAuth
              roles={['content_manager', 'admin', 'owner']}
              loadingFallback={<div className="auth-state">Loading test schedules…</div>}
              anonymousFallback={<Navigate to="/login" replace />}
              unauthorizedFallback={<Navigate to="/dashboard" replace />}
              suspendedFallback={<Navigate to="/account-suspended" replace />}
            >
              <TestSchedulePage />
            </RequireAuth>
          }
        />
        <Route
          path="admin/test-analytics"
          element={
            <RequireAuth
              roles={['content_manager', 'admin', 'owner']}
              loadingFallback={<div className="auth-state">Loading assessment analytics…</div>}
              anonymousFallback={<Navigate to="/login" replace />}
              unauthorizedFallback={<Navigate to="/dashboard" replace />}
              suspendedFallback={<Navigate to="/account-suspended" replace />}
            >
              <AssessmentAnalyticsPage />
            </RequireAuth>
          }
        />
        <Route
          path="admin/assignments"
          element={
            <RequireAuth
              roles={['content_manager', 'admin', 'owner']}
              loadingFallback={<div className="auth-state">Loading assignment workspace…</div>}
              anonymousFallback={<Navigate to="/login" replace />}
              unauthorizedFallback={<Navigate to="/dashboard" replace />}
              suspendedFallback={<Navigate to="/account-suspended" replace />}
            >
              <AssignmentManagementPage />
            </RequireAuth>
          }
        />
        <Route
          path="admin/attendance"
          element={
            <RequireAuth
              roles={['admin', 'owner']}
              loadingFallback={<div className="auth-state">Loading attendance workspace…</div>}
              anonymousFallback={<Navigate to="/login" replace />}
              unauthorizedFallback={<Navigate to="/dashboard" replace />}
              suspendedFallback={<Navigate to="/account-suspended" replace />}
            >
              <AttendanceManagementPage />
            </RequireAuth>
          }
        />
        <Route
          path="admin/announcements"
          element={
            <RequireAuth
              roles={['content_manager', 'admin', 'owner']}
              loadingFallback={<div className="auth-state">Loading announcements…</div>}
              anonymousFallback={<Navigate to="/login" replace />}
              unauthorizedFallback={<Navigate to="/dashboard" replace />}
              suspendedFallback={<Navigate to="/account-suspended" replace />}
            >
              <AnnouncementManagementPage />
            </RequireAuth>
          }
        />
        <Route
          path="admin/commerce"
          element={
            <RequireAuth
              roles={['admin', 'owner']}
              loadingFallback={<div className="auth-state">Loading commerce…</div>}
              anonymousFallback={<Navigate to="/login" replace />}
              unauthorizedFallback={<Navigate to="/dashboard" replace />}
              suspendedFallback={<Navigate to="/account-suspended" replace />}
            >
              <CommerceManagementPage />
            </RequireAuth>
          }
        />
        <Route
          path="admin/audit"
          element={
            <RequireAuth roles={['admin','owner']} loadingFallback={<div className="auth-state">Loading audit log…</div>} anonymousFallback={<Navigate to="/login" replace />} unauthorizedFallback={<Navigate to="/dashboard" replace />} suspendedFallback={<Navigate to="/account-suspended" replace />}>
              <AdminAuditPage />
            </RequireAuth>
          }
        />
        <Route
          path="admin/settings"
          element={
            <RequireAuth roles={['admin','owner']} loadingFallback={<div className="auth-state">Loading settings…</div>} anonymousFallback={<Navigate to="/login" replace />} unauthorizedFallback={<Navigate to="/dashboard" replace />} suspendedFallback={<Navigate to="/account-suspended" replace />}>
              <AdminSettingsPage />
            </RequireAuth>
          }
        />
        <Route
          path="admin/staff"
          element={
            <RequireAuth
              roles={['admin', 'owner']}
              loadingFallback={<div className="auth-state">Loading staff workspace…</div>}
              anonymousFallback={<Navigate to="/login" replace />}
              unauthorizedFallback={<Navigate to="/dashboard" replace />}
              suspendedFallback={<Navigate to="/account-suspended" replace />}
            >
              <StaffManagementPage />
            </RequireAuth>
          }
        />
        <Route
          path="teacher"
          element={
            <RequireAuth
              roles={['teacher']}
              loadingFallback={<div className="auth-state">Loading teacher workspace…</div>}
              anonymousFallback={<Navigate to="/login" replace />}
              unauthorizedFallback={<Navigate to="/dashboard" replace />}
              suspendedFallback={<Navigate to="/account-suspended" replace />}
            >
              <TeacherWorkspacePage />
            </RequireAuth>
          }
        />
        <Route
          path="teacher/announcements"
          element={
            <RequireAuth
              roles={['teacher']}
              loadingFallback={<div className="auth-state">Loading announcements…</div>}
              anonymousFallback={<Navigate to="/login" replace />}
              unauthorizedFallback={<Navigate to="/dashboard" replace />}
              suspendedFallback={<Navigate to="/account-suspended" replace />}
            >
              <AnnouncementManagementPage teacherMode />
            </RequireAuth>
          }
        />
        <Route
          path="teacher/delivery"
          element={
            <RequireAuth
              roles={['teacher']}
              loadingFallback={<div className="auth-state">Loading teaching delivery…</div>}
              anonymousFallback={<Navigate to="/login" replace />}
              unauthorizedFallback={<Navigate to="/dashboard" replace />}
              suspendedFallback={<Navigate to="/account-suspended" replace />}
            >
              <DeliveryManagementPage teacherMode />
            </RequireAuth>
          }
        />
        <Route
          path="teacher/test-analytics"
          element={
            <RequireAuth
              roles={['teacher']}
              loadingFallback={<div className="auth-state">Loading assessment analytics…</div>}
              anonymousFallback={<Navigate to="/login" replace />}
              unauthorizedFallback={<Navigate to="/dashboard" replace />}
              suspendedFallback={<Navigate to="/account-suspended" replace />}
            >
              <AssessmentAnalyticsPage teacherMode />
            </RequireAuth>
          }
        />
        <Route
          path="teacher/test-schedules"
          element={
            <RequireAuth
              roles={['teacher']}
              loadingFallback={<div className="auth-state">Loading test schedules…</div>}
              anonymousFallback={<Navigate to="/login" replace />}
              unauthorizedFallback={<Navigate to="/dashboard" replace />}
              suspendedFallback={<Navigate to="/account-suspended" replace />}
            >
              <TestSchedulePage teacherMode />
            </RequireAuth>
          }
        />
        <Route
          path="teacher/tests"
          element={
            <RequireAuth
              roles={['teacher']}
              loadingFallback={<div className="auth-state">Loading test builder…</div>}
              anonymousFallback={<Navigate to="/login" replace />}
              unauthorizedFallback={<Navigate to="/dashboard" replace />}
              suspendedFallback={<Navigate to="/account-suspended" replace />}
            >
              <TestBuilderPage teacherMode />
            </RequireAuth>
          }
        />
        <Route
          path="teacher/questions"
          element={
            <RequireAuth
              roles={['teacher']}
              loadingFallback={<div className="auth-state">Loading question bank…</div>}
              anonymousFallback={<Navigate to="/login" replace />}
              unauthorizedFallback={<Navigate to="/dashboard" replace />}
              suspendedFallback={<Navigate to="/account-suspended" replace />}
            >
              <QuestionBankPage teacherMode />
            </RequireAuth>
          }
        />
        <Route
          path="teacher/assignments"
          element={
            <RequireAuth
              roles={['teacher']}
              loadingFallback={<div className="auth-state">Loading assignment workspace…</div>}
              anonymousFallback={<Navigate to="/login" replace />}
              unauthorizedFallback={<Navigate to="/dashboard" replace />}
              suspendedFallback={<Navigate to="/account-suspended" replace />}
            >
              <AssignmentManagementPage teacherMode />
            </RequireAuth>
          }
        />
        <Route
          path="teacher/attendance"
          element={
            <RequireAuth
              roles={['teacher']}
              loadingFallback={<div className="auth-state">Loading attendance workspace…</div>}
              anonymousFallback={<Navigate to="/login" replace />}
              unauthorizedFallback={<Navigate to="/dashboard" replace />}
              suspendedFallback={<Navigate to="/account-suspended" replace />}
            >
              <AttendanceManagementPage teacherMode />
            </RequireAuth>
          }
        />
        <Route
          path="teacher/resources"
          element={
            <RequireAuth
              roles={['teacher']}
              loadingFallback={<div className="auth-state">Loading teaching resources…</div>}
              anonymousFallback={<Navigate to="/login" replace />}
              unauthorizedFallback={<Navigate to="/dashboard" replace />}
              suspendedFallback={<Navigate to="/account-suspended" replace />}
            >
              <ResourceManagementPage teacherMode />
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
        <Route path="*" element={<NotFoundPage />} />
      </Route>
      </Routes>
    </Suspense>
  )
}
