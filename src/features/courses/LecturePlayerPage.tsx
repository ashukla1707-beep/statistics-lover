import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../auth'
import { loadStudentCourseEnrollments, type StudentCourseEnrollment } from './courseService'
import {
  loadBatchDeliveryActions,
  loadBatchLearningContent,
  type LectureDeliveryAction,
  type StudentLecture,
  type StudentSubject,
} from './learningService'

type PlayerContext = {
  enrollment: StudentCourseEnrollment | null
  lecture: StudentLecture | null
  subjectTitle: string
  moduleTitle: string
  action: LectureDeliveryAction | null
  error: string | null
  loaded: boolean
}

export function LecturePlayerPage() {
  const { batchId = '', lectureId = '' } = useParams()
  const { identity } = useAuth()
  const [state, setState] = useState<PlayerContext>({
    enrollment: null,
    lecture: null,
    subjectTitle: '',
    moduleTitle: '',
    action: null,
    error: null,
    loaded: false,
  })

  useEffect(() => {
    if (!identity?.userId || !batchId || !lectureId) return
    let active = true

    void loadStudentCourseEnrollments(identity.userId)
      .then(async (enrollments) => {
        const enrollment = enrollments.find((item) => item.batch.id === batchId) ?? null
        if (!enrollment) {
          if (active) setState((current) => ({ ...current, error: 'This batch is not assigned to your account.', loaded: true }))
          return
        }

        const [subjects, actions] = await Promise.all([
          loadBatchLearningContent(batchId),
          loadBatchDeliveryActions(batchId),
        ])

        let lecture: StudentLecture | null = null
        let subjectTitle = ''
        let moduleTitle = ''

        for (const subject of subjects as StudentSubject[]) {
          for (const module of subject.modules) {
            const match = module.lectures.find((item) => item.id === lectureId)
            if (match) {
              lecture = match
              subjectTitle = subject.title
              moduleTitle = module.title
              break
            }
          }
          if (lecture) break
        }

        const action = actions.find(
          (item) => item.lectureId === lectureId && item.actionKind === 'watch' && item.provider === 'google_drive',
        ) ?? null

        if (!lecture || !action) {
          if (active) {
            setState({
              enrollment,
              lecture,
              subjectTitle,
              moduleTitle,
              action: null,
              error: 'This recording is not available for your account right now.',
              loaded: true,
            })
          }
          return
        }

        if (active) {
          setState({ enrollment, lecture, subjectTitle, moduleTitle, action, error: null, loaded: true })
        }
      })
      .catch(() => {
        if (active) setState((current) => ({ ...current, error: 'We could not load this recording right now.', loaded: true }))
      })

    return () => { active = false }
  }, [batchId, identity?.userId, lectureId])

  const backPath = useMemo(() => `/learn/${batchId}`, [batchId])

  if (!state.loaded) return <div className="auth-state">Loading recording…</div>

  if (state.error || !state.enrollment || !state.lecture || !state.action) {
    return (
      <section className="lecture-player-page">
        <div className="container lecture-player-shell">
          <Link className="learning-back-link" to={backPath}>← Back to course</Link>
          <div className="learning-empty-card">
            <h1>Recording unavailable</h1>
            <p>{state.error}</p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="lecture-player-page">
      <div className="container lecture-player-shell">
        <Link className="learning-back-link" to={backPath}>← Back to course</Link>

        <header className="lecture-player-heading">
          <div>
            <span className="eyebrow">Recorded lecture</span>
            <h1>{state.lecture.title}</h1>
            <p>{state.subjectTitle} · {state.moduleTitle}</p>
          </div>
          {state.lecture.durationMinutes && <span className="lecture-player-duration">{state.lecture.durationMinutes} min</span>}
        </header>

        <div className="lecture-player-stage" role="region" aria-label={`${state.lecture.title} recording`}>
          <iframe
            src={state.action.actionUrl}
            title={`${state.lecture.title} recording`}
            allow="autoplay; fullscreen"
            allowFullScreen
            referrerPolicy="no-referrer"
          />
        </div>

        <div className="lecture-player-meta">
          <strong>{state.enrollment.course.title}</strong>
          <span>{state.enrollment.batch.title}</span>
          <small>Access verified for your enrollment · Google Drive</small>
        </div>
      </div>
    </section>
  )
}
