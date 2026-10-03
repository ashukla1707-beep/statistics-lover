import { Link } from 'react-router-dom'
import { useAuth } from '../auth'

type AdminSection = 'overview' | 'academics' | 'content' | 'delivery' | 'resources' | 'questions' | 'tests' | 'schedules' | 'analytics' | 'assignments' | 'attendance' | 'announcements' | 'commerce' | 'staff' | 'enrollments'

export function AdminSubnav({ active }: { active: AdminSection }) {
  const { hasAnyRole } = useAuth()
  const canManageEnrollments = hasAnyRole(['admin', 'owner'])
  const canManageStaff = hasAnyRole(['admin', 'owner'])

  return (
    <nav className="admin-subnav" aria-label="Admin sections">
      <Link className={active === 'academics' ? 'is-active' : undefined} to="/admin/academics">
        Courses & Batches
      </Link>
      <Link className={active === 'content' ? 'is-active' : undefined} to="/admin/content">
        Subjects & Lectures
      </Link>
      <Link className={active === 'delivery' ? 'is-active' : undefined} to="/admin/delivery">
        Live & Recorded Access
      </Link>
      <Link className={active === 'resources' ? 'is-active' : undefined} to="/admin/resources">
        Study Material
      </Link>
      <Link className={active === 'questions' ? 'is-active' : undefined} to="/admin/questions">
        Question Bank
      </Link>
      <Link className={active === 'tests' ? 'is-active' : undefined} to="/admin/tests">
        Tests
      </Link>
      <Link className={active === 'schedules' ? 'is-active' : undefined} to="/admin/test-schedules">
        Test Scheduling
      </Link>
      <Link className={active === 'analytics' ? 'is-active' : undefined} to="/admin/test-analytics">
        Test Analytics
      </Link>
      <Link className={active === 'assignments' ? 'is-active' : undefined} to="/admin/assignments">
        Assignments
      </Link>
      {canManageStaff && (
        <Link className={active === 'attendance' ? 'is-active' : undefined} to="/admin/attendance">
          Attendance
        </Link>
      )}
      <Link className={active === 'announcements' ? 'is-active' : undefined} to="/admin/announcements">
        Announcements
      </Link>
      {canManageStaff && (
        <Link className={active === 'commerce' ? 'is-active' : undefined} to="/admin/commerce">
          Commerce
        </Link>
      )}
      {canManageStaff && (
        <Link className={active === 'staff' ? 'is-active' : undefined} to="/admin/staff">
          Staff & Teachers
        </Link>
      )}
      {canManageEnrollments && (
        <Link className={active === 'enrollments' ? 'is-active' : undefined} to="/admin/enrollments">
          Students & Enrollments
        </Link>
      )}
    </nav>
  )
}
