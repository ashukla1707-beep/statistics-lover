import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../auth'
import { loadMyBatchAttendance, type StudentAttendanceRecord } from '../admin/attendanceService'
import { loadStudentCourseEnrollments, type StudentCourseEnrollment } from './courseService'
import {
  loadBatchDeliveryActions,
  loadBatchLearningContent,
  loadBatchLearningResources,
  type LectureDeliveryAction,
  type StudentLearningResource,
  type StudentSubject,
} from './learningService'

type LearningState = {
  enrollment: StudentCourseEnrollment | null
  subjects: StudentSubject[]
  deliveryActions: LectureDeliveryAction[]
  resources: StudentLearningResource[]
  attendance: StudentAttendanceRecord[]
  error: string | null
  loaded: boolean
}

function humanize(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function ResourceLinks({ resources, title = 'Study material' }: { resources: StudentLearningResource[]; title?: string }) {
  if (resources.length === 0) return null
  return (
    <div className="learning-resource-block">
      <span className="learning-resource-block-title">{title}</span>
      <div className="learning-resource-list">
        {resources.map((resource) => (
          <a className="learning-resource-link" href={resource.actionUrl} target="_blank" rel="noreferrer" key={resource.id}>
            <strong>{resource.title}</strong>
            <span>{resource.actionLabel}</span>
            <small>{humanize(resource.kind)} · {humanize(resource.provider)}{resource.fileName ? ` · ${resource.fileName}` : ''}</small>
          </a>
        ))}
      </div>
    </div>
  )
}

export function LearningPage() {
  const { batchId = '' } = useParams()
  const { identity } = useAuth()
  const [state, setState] = useState<LearningState>({ enrollment: null, subjects: [], deliveryActions: [], resources: [], attendance: [], error: null, loaded: false })

  useEffect(() => {
    if (!identity?.userId || !batchId) return
    let active = true
    void loadStudentCourseEnrollments(identity.userId)
      .then(async (enrollments) => {
        const enrollment = enrollments.find((item) => item.batch.id === batchId) ?? null
        if (!enrollment) {
          if (active) setState({ enrollment: null, subjects: [], deliveryActions: [], resources: [], attendance: [], error: 'This batch is not assigned to your account.', loaded: true })
          return
        }
        const [subjects, deliveryActions, resources, attendance] = await Promise.all([
          loadBatchLearningContent(batchId),
          loadBatchDeliveryActions(batchId),
          loadBatchLearningResources(batchId),
          loadMyBatchAttendance(batchId),
        ])
        if (active) setState({ enrollment, subjects, deliveryActions, resources, attendance, error: null, loaded: true })
      })
      .catch(() => {
        if (active) setState({ enrollment: null, subjects: [], deliveryActions: [], resources: [], attendance: [], error: 'We could not load this learning space right now.', loaded: true })
      })
    return () => { active = false }
  }, [batchId, identity?.userId])

  const actionsByLecture = useMemo(() => {
    const map = new Map<string, LectureDeliveryAction[]>()
    for (const action of state.deliveryActions) map.set(action.lectureId, [...(map.get(action.lectureId) ?? []), action])
    return map
  }, [state.deliveryActions])

  const resourcesByScope = useMemo(() => {
    const map = new Map<string, StudentLearningResource[]>()
    for (const resource of state.resources) {
      const targetId = resource.scope === 'batch' ? batchId : resource.scope === 'subject' ? resource.subjectId : resource.scope === 'module' ? resource.moduleId : resource.lectureId
      if (!targetId) continue
      const key = `${resource.scope}:${targetId}`
      map.set(key, [...(map.get(key) ?? []), resource])
    }
    return map
  }, [batchId, state.resources])

  if (!state.loaded) return <div className="auth-state">Loading your learning space…</div>
  if (state.error || !state.enrollment) {
    return <section className="learning-page"><div className="container learning-shell"><div className="learning-empty-card"><h1>Learning space unavailable</h1><p>{state.error}</p><Link className="button button-small" to="/dashboard">Back to dashboard</Link></div></div></section>
  }

  const { enrollment } = state
  const batchResources = resourcesByScope.get(`batch:${batchId}`) ?? []
  const countedAttendance = state.attendance.filter((record) => record.status !== 'excused')
  const attendedCount = countedAttendance.filter((record) => record.status === 'present' || record.status === 'late').length
  const attendanceRate = countedAttendance.length > 0 ? Math.round((attendedCount / countedAttendance.length) * 100) : null

  return (
    <section className="learning-page">
      <div className="container learning-shell">
        <Link className="learning-back-link" to="/dashboard">← Dashboard</Link>
        <header className="learning-hero">
          <span className="eyebrow">My course</span><h1>{enrollment.course.title}</h1><p>{enrollment.batch.title}</p>
          <div className="learning-meta-row">
            <span>{humanize(enrollment.batch.status)}</span>
            {enrollment.batch.startsOn && <span>Starts {new Date(`${enrollment.batch.startsOn}T00:00:00`).toLocaleDateString()}</span>}
            {enrollment.batch.endsOn && <span>Ends {new Date(`${enrollment.batch.endsOn}T00:00:00`).toLocaleDateString()}</span>}
          </div>
        </header>

        {batchResources.length > 0 && <section className="learning-batch-resources"><ResourceLinks resources={batchResources} title="Batch resources" /></section>}

        {state.attendance.length > 0 && (
          <section className="student-attendance-card">
            <div className="student-attendance-heading">
              <div>
                <span className="eyebrow">My attendance</span>
                <h2>Lecture attendance</h2>
              </div>
              {attendanceRate !== null && <div className="student-attendance-rate">{attendanceRate}%</div>}
            </div>
            <div className="student-attendance-list">
              {state.attendance.slice(0, 6).map((record) => (
                <div className="student-attendance-row" key={record.lectureId}>
                  <div>
                    <strong>{record.lectureTitle}</strong>
                    <small>{record.subjectTitle} · {record.moduleTitle}{record.scheduledAt ? ` · ${new Date(record.scheduledAt).toLocaleDateString()}` : ''}</small>
                  </div>
                  <span className={`student-attendance-status student-attendance-status-${record.status}`}>{humanize(record.status)}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {state.subjects.length === 0 ? (
          <div className="learning-empty-card"><h2>Content is being prepared</h2><p>No published subjects are available in this batch yet.</p></div>
        ) : (
          <div className="learning-subject-list">
            {state.subjects.map((subject, subjectIndex) => {
              const subjectResources = resourcesByScope.get(`subject:${subject.id}`) ?? []
              return <section className="learning-subject-card" key={subject.id}>
                <header><div><span className="learning-number">{String(subjectIndex + 1).padStart(2, '0')}</span><h2>{subject.title}</h2>{subject.code && <small>{subject.code}</small>}</div><span className="learning-count">{subject.modules.length} {subject.modules.length === 1 ? 'module' : 'modules'}</span></header>
                {subject.description && <p className="learning-description">{subject.description}</p>}
                <ResourceLinks resources={subjectResources} title="Subject resources" />
                {subject.modules.length === 0 ? <p className="learning-muted">No published modules yet.</p> : (
                  <div className="learning-module-list">{subject.modules.map((module) => {
                    const moduleResources = resourcesByScope.get(`module:${module.id}`) ?? []
                    return <details className="learning-module" key={module.id} open={subject.modules.length === 1}>
                      <summary><div><strong>{module.title}</strong><span>{module.lectures.length} {module.lectures.length === 1 ? 'lecture' : 'lectures'}</span></div></summary>
                      {module.description && <p>{module.description}</p>}
                      {moduleResources.length > 0 && <div className="learning-module-resource-wrap"><ResourceLinks resources={moduleResources} title="Module resources" /></div>}
                      {module.lectures.length === 0 ? <p className="learning-muted">No available lectures yet.</p> : (
                        <div className="learning-lecture-list">{module.lectures.map((lecture) => {
                          const deliveryActions = actionsByLecture.get(lecture.id) ?? []
                          const lectureResources = resourcesByScope.get(`lecture:${lecture.id}`) ?? []
                          return <article className="learning-lecture" key={lecture.id}>
                            <div className="learning-lecture-index">{lecture.position + 1}</div>
                            <div className="learning-lecture-copy">
                              <div className="learning-lecture-title-row"><strong>{lecture.title}</strong><span className={`learning-status learning-status-${lecture.status}`}>{humanize(lecture.status)}</span></div>
                              <span>{humanize(lecture.deliveryMode)}{lecture.durationMinutes ? ` · ${lecture.durationMinutes} min` : ''}</span>
                              {lecture.scheduledAt && <small>{new Date(lecture.scheduledAt).toLocaleString()}</small>}
                              {lecture.description && <p>{lecture.description}</p>}
                              {deliveryActions.length > 0 && <div className="learning-delivery-actions">{deliveryActions.map((action) => action.provider === 'google_drive' && action.actionKind === 'watch' ? (
                                <Link className="button button-small" to={`/learn/${batchId}/lecture/${lecture.id}`} key={`${action.lectureId}-${action.actionKind}`}>{action.label}</Link>
                              ) : (
                                <a className="button button-small" href={action.actionUrl} target="_blank" rel="noreferrer" key={`${action.lectureId}-${action.actionKind}`}>{action.label}</a>
                              ))}</div>}
                              <ResourceLinks resources={lectureResources} title="Lecture resources" />
                              {deliveryActions.length > 0 && <small className="learning-provider-note">Access verified for your enrollment · {deliveryActions.map((action) => humanize(action.provider)).join(' / ')}</small>}
                            </div>
                          </article>
                        })}</div>
                      )}
                    </details>
                  })}</div>
                )}
              </section>
            })}
          </div>
        )}
      </div>
    </section>
  )
}
