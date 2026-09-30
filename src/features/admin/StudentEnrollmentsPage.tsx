import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth'
import {
  createStudentEnrollment,
  deleteStudentEnrollment,
  listEnrollmentBatches,
  listEnrollmentCourses,
  listStudentEnrollments,
  listStudents,
  updateStudentEnrollment,
  type EnrollmentBatch,
  type EnrollmentCourse,
  type EnrollmentStatus,
  type ManagedEnrollment,
  type ManagedStudent,
} from './enrollmentAdminService'

const enrollmentStatuses: EnrollmentStatus[] = ['active', 'completed', 'cancelled', 'expired']

function humanize(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function messageFrom(error: unknown) {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error && 'message' in error && typeof error.message === 'string') {
    return error.message
  }
  return 'Something went wrong. Please try again.'
}

export function StudentEnrollmentsPage() {
  const { identity } = useAuth()
  const [students, setStudents] = useState<ManagedStudent[]>([])
  const [courses, setCourses] = useState<EnrollmentCourse[]>([])
  const [batches, setBatches] = useState<EnrollmentBatch[]>([])
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const [enrollments, setEnrollments] = useState<ManagedEnrollment[]>([])
  const [search, setSearch] = useState('')
  const [selectedCourseId, setSelectedCourseId] = useState('')
  const [selectedBatchId, setSelectedBatchId] = useState('')
  const [accessEndsAt, setAccessEndsAt] = useState('')
  const [loading, setLoading] = useState(true)
  const [enrollmentsLoading, setEnrollmentsLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    Promise.all([listStudents(), listEnrollmentCourses(), listEnrollmentBatches()])
      .then(([studentRows, courseRows, batchRows]) => {
        if (!active) return
        setStudents(studentRows)
        setCourses(courseRows)
        setBatches(batchRows)
        setSelectedStudentId(studentRows[0]?.id ?? null)
        setSelectedCourseId(courseRows[0]?.id ?? '')
        setLoading(false)
      })
      .catch((cause) => {
        if (!active) return
        setError(messageFrom(cause))
        setLoading(false)
      })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!selectedStudentId) {
      setEnrollments([])
      return
    }
    let active = true
    setEnrollmentsLoading(true)
    void listStudentEnrollments(selectedStudentId)
      .then((rows) => {
        if (active) {
          setEnrollments(rows)
          setError(null)
        }
      })
      .catch((cause) => {
        if (active) setError(messageFrom(cause))
      })
      .finally(() => {
        if (active) setEnrollmentsLoading(false)
      })
    return () => { active = false }
  }, [selectedStudentId])

  const selectedStudent = useMemo(
    () => students.find((student) => student.id === selectedStudentId) ?? null,
    [students, selectedStudentId],
  )

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return students
    return students.filter((student) =>
      [student.fullName, student.email, student.phone]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(query)),
    )
  }, [students, search])

  const availableBatches = useMemo(
    () => batches.filter((batch) => batch.courseId === selectedCourseId),
    [batches, selectedCourseId],
  )

  useEffect(() => {
    if (availableBatches.some((batch) => batch.id === selectedBatchId)) return
    setSelectedBatchId(availableBatches[0]?.id ?? '')
  }, [availableBatches, selectedBatchId])

  async function refreshEnrollments() {
    if (!selectedStudentId) return
    setEnrollments(await listStudentEnrollments(selectedStudentId))
  }

  async function enrollStudent() {
    if (!selectedStudent || !selectedBatchId || !identity?.userId) return
    if (enrollments.some((enrollment) => enrollment.batch?.id === selectedBatchId)) {
      setError('This student already has an enrollment record for the selected batch.')
      return
    }

    setSaving(true)
    setError(null)
    setNotice(null)
    try {
      await createStudentEnrollment({
        studentId: selectedStudent.id,
        batchId: selectedBatchId,
        grantedBy: identity.userId,
        accessEndsAt: accessEndsAt ? new Date(`${accessEndsAt}T23:59:59`).toISOString() : null,
      })
      await refreshEnrollments()
      setAccessEndsAt('')
      setNotice('Student enrolled successfully.')
    } catch (cause) {
      setError(messageFrom(cause))
    } finally {
      setSaving(false)
    }
  }

  async function changeStatus(enrollment: ManagedEnrollment, status: EnrollmentStatus) {
    setSaving(true)
    setError(null)
    setNotice(null)
    try {
      await updateStudentEnrollment(enrollment.id, { status, accessEndsAt: enrollment.accessEndsAt })
      await refreshEnrollments()
      setNotice('Enrollment updated.')
    } catch (cause) {
      setError(messageFrom(cause))
    } finally {
      setSaving(false)
    }
  }

  async function removeEnrollment(enrollment: ManagedEnrollment) {
    if (!window.confirm('Remove this enrollment record?')) return
    setSaving(true)
    setError(null)
    setNotice(null)
    try {
      await deleteStudentEnrollment(enrollment.id)
      await refreshEnrollments()
      setNotice('Enrollment removed.')
    } catch (cause) {
      setError(messageFrom(cause))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="admin-page enrollment-admin-page">
      <div className="container admin-shell">
        <nav className="admin-subnav" aria-label="Admin sections">
          <Link to="/admin/academics">Courses & Batches</Link>
          <Link className="is-active" to="/admin/enrollments">Students & Enrollments</Link>
        </nav>

        <header className="admin-page-heading">
          <div>
            <span className="eyebrow">Owner & admin workspace</span>
            <h1>Students & Enrollments</h1>
            <p>Find registered students, assign batch access, and manage enrollment status from one place.</p>
          </div>
        </header>

        {error && <div className="admin-alert admin-alert-error" role="alert">{error}</div>}
        {notice && <div className="admin-alert admin-alert-success" role="status">{notice}</div>}

        <div className="enrollment-admin-grid">
          <aside className="admin-panel student-directory-panel">
            <div className="admin-panel-heading">
              <div><span>Directory</span><h2>Students</h2></div>
              <strong className="admin-count-badge">{students.length}</strong>
            </div>
            <label className="form-field student-search-field">
              <span>Search students</span>
              <input
                type="search"
                placeholder="Name, email or phone"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>

            {loading && <p className="admin-empty">Loading students…</p>}
            {!loading && filteredStudents.length === 0 && <p className="admin-empty">No matching students found.</p>}

            <div className="student-directory-list">
              {filteredStudents.map((student) => (
                <button
                  type="button"
                  key={student.id}
                  className={`student-directory-row ${student.id === selectedStudentId ? 'is-selected' : ''}`}
                  onClick={() => {
                    setSelectedStudentId(student.id)
                    setNotice(null)
                    setError(null)
                  }}
                >
                  <span className="student-avatar">{(student.fullName || student.email || '?').slice(0, 1).toUpperCase()}</span>
                  <span className="student-directory-copy">
                    <strong>{student.fullName || 'Unnamed student'}</strong>
                    <small>{student.email || 'No email'}</small>
                  </span>
                  <span className={`admin-status admin-status-${student.accountStatus === 'active' ? 'published' : 'archived'}`}>
                    {humanize(student.accountStatus)}
                  </span>
                </button>
              ))}
            </div>
          </aside>

          <main className="admin-panel enrollment-detail-panel">
            {!selectedStudent ? (
              <div className="admin-empty-state"><strong>Select a student</strong><p>Choose a student from the directory to manage batch access.</p></div>
            ) : (
              <>
                <div className="selected-student-header">
                  <div>
                    <span className="eyebrow">Selected student</span>
                    <h2>{selectedStudent.fullName || 'Unnamed student'}</h2>
                    <p>{selectedStudent.email || 'No email'}{selectedStudent.phone ? ` · ${selectedStudent.phone}` : ''}</p>
                  </div>
                  <span className={`admin-status admin-status-${selectedStudent.accountStatus === 'active' ? 'published' : 'archived'}`}>
                    {humanize(selectedStudent.accountStatus)}
                  </span>
                </div>

                <section className="enrollment-create-card">
                  <div className="admin-panel-heading compact">
                    <div><span>Assign access</span><h3>Enroll in a batch</h3></div>
                  </div>
                  <div className="admin-form-grid enrollment-form-grid">
                    <label className="form-field">
                      <span>Course</span>
                      <select value={selectedCourseId} onChange={(event) => setSelectedCourseId(event.target.value)}>
                        {courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}
                      </select>
                    </label>
                    <label className="form-field">
                      <span>Batch</span>
                      <select value={selectedBatchId} onChange={(event) => setSelectedBatchId(event.target.value)} disabled={availableBatches.length === 0}>
                        {availableBatches.length === 0 && <option value="">No batches in this course</option>}
                        {availableBatches.map((batch) => (
                          <option key={batch.id} value={batch.id}>{batch.title}{batch.code ? ` (${batch.code})` : ''}</option>
                        ))}
                      </select>
                    </label>
                    <label className="form-field">
                      <span>Access ends on (optional)</span>
                      <input type="date" value={accessEndsAt} onChange={(event) => setAccessEndsAt(event.target.value)} />
                    </label>
                    <div className="enrollment-submit-cell">
                      <button className="button" type="button" onClick={() => void enrollStudent()} disabled={saving || !selectedBatchId || selectedStudent.accountStatus !== 'active'}>
                        {saving ? 'Saving…' : 'Enroll student'}
                      </button>
                    </div>
                  </div>
                </section>

                <section className="student-enrollments-section">
                  <div className="admin-panel-heading compact">
                    <div><span>Access records</span><h3>Current enrollments</h3></div>
                    <strong className="admin-count-badge">{enrollments.length}</strong>
                  </div>

                  {enrollmentsLoading && <p className="admin-empty">Loading enrollments…</p>}
                  {!enrollmentsLoading && enrollments.length === 0 && <p className="admin-empty">This student has no batch enrollments yet.</p>}

                  <div className="student-enrollment-list">
                    {enrollments.map((enrollment) => (
                      <article className="student-enrollment-row" key={enrollment.id}>
                        <div className="student-enrollment-main">
                          <span className={`admin-status admin-status-${enrollment.status === 'active' ? 'active' : enrollment.status === 'completed' ? 'completed' : 'archived'}`}>
                            {humanize(enrollment.status)}
                          </span>
                          <strong>{enrollment.batch?.course?.title || 'Course unavailable'}</strong>
                          <span>{enrollment.batch?.title || 'Batch unavailable'}{enrollment.batch?.code ? ` · ${enrollment.batch.code}` : ''}</span>
                          <small>Enrolled {new Date(enrollment.enrolledAt).toLocaleDateString()}</small>
                        </div>
                        <div className="student-enrollment-actions">
                          <select
                            aria-label="Enrollment status"
                            value={enrollment.status}
                            disabled={saving}
                            onChange={(event) => void changeStatus(enrollment, event.target.value as EnrollmentStatus)}
                          >
                            {enrollmentStatuses.map((status) => <option key={status} value={status}>{humanize(status)}</option>)}
                          </select>
                          <button className="admin-danger-button" type="button" disabled={saving} onClick={() => void removeEnrollment(enrollment)}>Remove</button>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              </>
            )}
          </main>
        </div>
      </div>
    </section>
  )
}
