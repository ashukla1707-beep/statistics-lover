import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { Footer } from './components/layout/Footer'
import { Header } from './components/layout/Header'
import { AcademicManagementPage } from './features/admin/AcademicManagementPage'
import { AttendanceManagementPage } from './features/admin/AttendanceManagementPage'
import { AssignmentManagementPage } from './features/admin/AssignmentManagementPage'
import { ContentManagementPage } from './features/admin/ContentManagementPage'
import { DeliveryManagementPage } from './features/admin/DeliveryManagementPage'
import { ResourceManagementPage } from './features/admin/ResourceManagementPage'
import { QuestionBankPage } from './features/admin/QuestionBankPage'
import { TestBuilderPage } from './features/admin/TestBuilderPage'
import { TestSchedulePage } from './features/admin/TestSchedulePage'
import { AssessmentAnalyticsPage } from './features/admin/AssessmentAnalyticsPage'
import { CommerceManagementPage } from './features/admin/CommerceManagementPage'
import { StaffManagementPage } from './features/admin/StaffManagementPage'
import { StudentEnrollmentsPage } from './features/admin/StudentEnrollmentsPage'
import {
  AuthPage,
  ForgotPasswordPage,
  RequireAuth,
  ResetPasswordPage,
  SuspendedPage,
} from './features/auth'
import { LearningPage } from './features/courses/LearningPage'
import { StudentAssignmentsPage } from './features/courses/StudentAssignmentsPage'
import { StudentTestsPage } from './features/courses/StudentTestsPage'
import { StudentPerformancePage } from './features/courses/StudentPerformancePage'
import { StudentTestAttemptPage } from './features/courses/StudentTestAttemptPage'
import { LecturePlayerPage } from './features/courses/LecturePlayerPage'
import { DashboardPage } from './features/dashboard/DashboardPage'
import { HomePage } from './features/home/HomePage'
import { StorePage } from './features/commerce/StorePage'
import { MyOrdersPage } from './features/commerce/MyOrdersPage'
import { TeacherWorkspacePage } from './features/teacher/TeacherWorkspacePage'

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
        <Route path="store" element={<StorePage />} />
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
