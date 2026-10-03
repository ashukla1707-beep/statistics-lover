import { useEffect, useMemo, useRef, useState } from 'react'
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

type NavigatorWithUserAgentData = Navigator & {
  userAgentData?: {
    mobile?: boolean
  }
}

function isMobileBrowserMode() {
  if (typeof navigator === 'undefined') return false

  const mobileFlag = (navigator as NavigatorWithUserAgentData).userAgentData?.mobile
  if (typeof mobileFlag === 'boolean') return mobileFlag

  return /Android|Mobi|iPhone|iPad|iPod/i.test(navigator.userAgent)
}

const DRIVE_DESKTOP_WIDTH = 1024
const DRIVE_DESKTOP_HEIGHT = 576

function isTouchDevice() {
  return typeof window !== 'undefined' && window.matchMedia('(hover: none) and (pointer: coarse)').matches
}

function syncTouchPlayerScale(stage: HTMLDivElement | null) {
  if (!stage) return

  if (!isTouchDevice()) {
    stage.style.removeProperty('--drive-player-scale')
    return
  }

  const rect = stage.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) return

  const scale = Math.min(rect.width / DRIVE_DESKTOP_WIDTH, rect.height / DRIVE_DESKTOP_HEIGHT)
  stage.style.setProperty('--drive-player-scale', String(Math.max(scale, 0.1)))
}

function queuePlayerScaleSync(stage: HTMLDivElement | null) {
  window.requestAnimationFrame(() => {
    syncTouchPlayerScale(stage)
    window.requestAnimationFrame(() => syncTouchPlayerScale(stage))
  })
}

export function LecturePlayerPage() {
  const { batchId = '', lectureId = '' } = useParams()
  const { identity } = useAuth()
  const stageRef = useRef<HTMLDivElement>(null)
  const requiresDesktopSite = isMobileBrowserMode()
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

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return

    const handleViewportChange = () => queuePlayerScaleSync(stage)
    const resizeObserver = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(handleViewportChange)

    resizeObserver?.observe(stage)
    window.addEventListener('resize', handleViewportChange)
    window.visualViewport?.addEventListener('resize', handleViewportChange)
    screen.orientation?.addEventListener('change', handleViewportChange)
    queuePlayerScaleSync(stage)

    return () => {
      resizeObserver?.disconnect()
      window.removeEventListener('resize', handleViewportChange)
      window.visualViewport?.removeEventListener('resize', handleViewportChange)
      screen.orientation?.removeEventListener('change', handleViewportChange)
      stage.style.removeProperty('--drive-player-scale')
    }
  }, [state.loaded])

  const backPath = useMemo(() => `/learn/${batchId}`, [batchId])

  if (!state.loaded) return <div className="lecture-player-loading">Loading recording…</div>

  if (state.error || !state.enrollment || !state.lecture || !state.action) {
    return (
      <main className="lecture-player-page">
        <div className="lecture-player-shell lecture-player-shell-error">
          <Link className="lecture-player-back" to={backPath}>← Back to course</Link>
          <div className="lecture-player-error">
            <h1>Recording unavailable</h1>
            <p>{state.error}</p>
          </div>
        </div>
      </main>
    )
  }

  if (requiresDesktopSite) {
    return (
      <main className="lecture-player-page">
        <div className="lecture-player-shell lecture-player-shell-error">
          <Link className="lecture-player-back" to={backPath}>← Back to course</Link>

          <section className="lecture-player-desktop-gate" aria-labelledby="desktop-playback-title">
            <span className="lecture-player-kicker">Desktop playback required</span>
            <h1 id="desktop-playback-title">{state.lecture.title}</h1>
            <p>
              Open your browser menu and enable <strong>Desktop site</strong>
              {' '}or <strong>Request Desktop Website</strong>. The page will reload with the desktop Google Drive player.
            </p>
            <button type="button" onClick={() => window.location.reload()}>
              Reload after enabling Desktop site
            </button>
          </section>
        </div>
      </main>
    )
  }

  return (
    <main className="lecture-player-page">
      <div className="lecture-player-shell">
        <div className="lecture-player-toolbar">
          <Link className="lecture-player-back" to={backPath}>← Back to course</Link>
          <span className="lecture-player-brand">Statistics Lover</span>
        </div>

        <header className="lecture-player-heading">
          <div>
            <span className="lecture-player-kicker">Recorded lecture</span>
            <h1>{state.lecture.title}</h1>
            <p>{state.subjectTitle} · {state.moduleTitle}</p>
          </div>
          {state.lecture.durationMinutes && <span className="lecture-player-duration">{state.lecture.durationMinutes} min</span>}
        </header>

        <div
          ref={stageRef}
          className="lecture-player-stage"
          role="region"
          aria-label={`${state.lecture.title} recording`}
        >
          <div className="lecture-player-media">
            <iframe
              src={state.action.actionUrl}
              title={`${state.lecture.title} recording`}
              allow="autoplay; fullscreen"
              allowFullScreen
              referrerPolicy="no-referrer"
            />
          </div>

          <div className="lecture-player-overlay">
            <div className="lecture-player-corner-controls">
              <span className="lecture-player-drive-brand-blocker" aria-hidden="true">
                <img
                  src="/brand/statistics-lover-logo.jpg"
                  alt=""
                  draggable={false}
                />
              </span>
            </div>
          </div>
        </div>

        <div className="lecture-player-meta">
          <div>
            <strong>{state.enrollment.course.title}</strong>
            <span>{state.enrollment.batch.title}</span>
          </div>
          <small>Access verified for your enrollment · Google Drive</small>
        </div>
      </div>
    </main>
  )
}
