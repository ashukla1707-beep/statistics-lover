import { Link } from 'react-router-dom'
import { useAuth } from '../auth'

type AdminSection = 'academics' | 'content' | 'delivery' | 'resources' | 'assignments' | 'attendance' | 'staff' | 'enrollments'

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
      <Link className={active === 'assignments' ? 'is-active' : undefined} to="/admin/assignments">
        Assignments
      </Link>
      {canManageStaff && (
        <Link className={active === 'attendance' ? 'is-active' : undefined} to="/admin/attendance">
          Attendance
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
