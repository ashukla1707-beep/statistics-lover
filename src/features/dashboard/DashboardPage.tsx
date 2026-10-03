import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'
import {
  loadStudentCourseEnrollments,
  type StudentCourseEnrollment,
} from '../courses/courseService'

function formatRole(role: string) {
  return role.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

type CourseLoadState = {
  userId: string | null
  enrollments: StudentCourseEnrollment[]
  error: string | null
}

export function DashboardPage() {
  const navigate = useNavigate()
  const { identity, signOut } = useAuth()
  const [busy, setBusy] = useState(false)
  const [courseState, setCourseState] = useState<CourseLoadState>({
    userId: null,
    enrollments: [],
    error: null,
  })

  const studentId = identity?.userId ?? null
  const coursesLoading = Boolean(studentId && courseState.userId !== studentId)
  const enrollments = courseState.userId === studentId ? courseState.enrollments : []
  const coursesError = courseState.userId === studentId ? courseState.error : null

  useEffect(() => {
    if (!studentId) return

    let active = true

    void loadStudentCourseEnrollments(studentId)
      .then((rows) => {
        if (active) {
          setCourseState({ userId: studentId, enrollments: rows, error: null })
        }
      })
      .catch(() => {
        if (active) {
          setCourseState({
            userId: studentId,
            enrollments: [],
            error: 'We could not load your courses right now. Please try again.',
          })
        }
      })

    return () => {
      active = false
    }
  }, [studentId])

  async function handleSignOut() {
    setBusy(true)
    try {
      await signOut()
      navigate('/', { replace: true })
    } finally {
      setBusy(false)
    }
  }

  const displayName = identity?.profile?.fullName || identity?.email || 'Student'
  const isTeacher = identity?.roles.includes('teacher') ?? false
  const canAdmin = identity?.roles.some((role) => role === 'admin' || role === 'owner' || role === 'content_manager') ?? false

  return (
    <section className="portal-page">
      <div className="container portal-shell">
        <div className="portal-welcome">
          <div>
            <span className="eyebrow">My learning space</span>
            <h1>Welcome, {displayName}.</h1>
            <p>Your enrolled batches and upcoming learning activity will appear here as your course access is assigned.</p>
          </div>
          <button className="button button-secondary" type="button" onClick={handleSignOut} disabled={busy}>
            {busy ? 'Signing out…' : 'Sign out'}
          </button>
        </div>

        <div className="portal-role-row" aria-label="Account roles">
          {(identity?.roles ?? []).map((role) => (
            <span className="role-badge" key={role}>{formatRole(role)}</span>
          ))}
        </div>

        {(isTeacher || canAdmin) && (
          <div className="portal-role-actions">
            {isTeacher && <Link className="button button-small" to="/teacher">Open teacher workspace</Link>}
            {canAdmin && <Link className="button button-small button-secondary" to="/admin/academics">Open admin workspace</Link>}
          </div>
        )}

        <div className="portal-grid">
          <article className="portal-card">
            <span>01</span>
            <h2>My Courses</h2>
            {coursesLoading && <p>Loading your enrollments…</p>}
            {!coursesLoading && coursesError && (
              <p className="portal-card-error" role="status">{coursesError}</p>
            )}
            {!coursesLoading && !coursesError && enrollments.length === 0 && (
              <p>No courses have been assigned to your account yet.</p>
            )}
            {!coursesLoading && !coursesError && enrollments.length > 0 && (
              <ul className="portal-course-list">
                {enrollments.slice(0, 3).map((enrollment) => (
                  <li key={enrollment.enrollmentId}>
                    <Link className="portal-course-link" to={`/learn/${enrollment.batch.id}`}>
                      <strong>{enrollment.course.title}</strong>
                      <span>{enrollment.batch.title}</span>
                    </Link>
                  </li>
                ))}
                {enrollments.length > 3 && (
                  <li className="portal-course-more">
                    +{enrollments.length - 3} more enrolled {enrollments.length - 3 === 1 ? 'batch' : 'batches'}
                  </li>
                )}
              </ul>
            )}
          </article>
          <article className="portal-card">
            <span>02</span>
            <h2>Live Classes</h2>
            <p>Upcoming classes and provider-authorized join actions will appear here.</p>
          </article>
          <article className="portal-card">
            <span>03</span>
            <h2>Tests & Results</h2>
            <p>Attempts, scores and topic-level performance will appear here.</p>
          </article>
          <article className="portal-card">
            <span>04</span>
            <h2>Study Material</h2>
            <p>Authorized notes, PYQs and downloadable resources will appear here.</p>
          </article>
        </div>
      </div>
    </section>
  )
}
