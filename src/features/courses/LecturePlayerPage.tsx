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

type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null
  webkitFullscreenEnabled?: boolean
  webkitExitFullscreen?: () => Promise<void> | void
}

type FullscreenStage = HTMLDivElement & {
  webkitRequestFullscreen?: () => Promise<void> | void
}

function getFullscreenElement() {
  const fullscreenDocument = document as FullscreenDocument
  return document.fullscreenElement ?? fullscreenDocument.webkitFullscreenElement ?? null
}

function canUseFullscreen(stage: FullscreenStage | null) {
  if (!stage) return false
  return typeof stage.requestFullscreen === 'function' || typeof stage.webkitRequestFullscreen === 'function'
}

export function LecturePlayerPage() {
  const { batchId = '', lectureId = '' } = useParams()
  const { identity } = useAuth()
  const stageRef = useRef<HTMLDivElement>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [canFullscreen, setCanFullscreen] = useState(false)
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
    const viewport = document.querySelector<HTMLMetaElement>('meta[name="viewport"]')
    const previousViewport = viewport?.getAttribute('content') ?? null

    if (viewport) {
      viewport.setAttribute('content', 'width=1024')
    }

    document.documentElement.classList.add('lecture-player-desktop-viewport')
    document.body.classList.add('lecture-player-desktop-viewport')

    return () => {
      if (viewport) {
        if (previousViewport === null) {
          viewport.removeAttribute('content')
        } else {
          viewport.setAttribute('content', previousViewport)
        }
      }

      document.documentElement.classList.remove('lecture-player-desktop-viewport')
      document.body.classList.remove('lecture-player-desktop-viewport')
    }
  }, [])

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return

    const handleFullscreenChange = () => {
      setIsFullscreen(getFullscreenElement() === stage)
    }

    setCanFullscreen(canUseFullscreen(stage))
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange)

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
    }
  }, [state.loaded])

  const backPath = useMemo(() => `/learn/${batchId}`, [batchId])

  const toggleFullscreen = async () => {
    const stage = stageRef.current as FullscreenStage | null
    if (!stage || !canUseFullscreen(stage)) return

    const fullscreenDocument = document as FullscreenDocument

    try {
      if (getFullscreenElement() === stage) {
        if (typeof document.exitFullscreen === 'function') {
          await document.exitFullscreen()
        } else {
          await fullscreenDocument.webkitExitFullscreen?.()
        }
        return
      }

      if (typeof stage.requestFullscreen === 'function') {
        await stage.requestFullscreen({ navigationUI: 'hide' })
      } else {
        await stage.webkitRequestFullscreen?.()
      }
    } catch {
      // Keep inline playback available when the browser refuses fullscreen.
    }
  }

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
              {canFullscreen && (
                <button
                  type="button"
                  className="lecture-player-fullscreen"
                  onClick={toggleFullscreen}
                  aria-label={isFullscreen ? 'Exit full screen' : 'Enter full screen'}
                  title={isFullscreen ? 'Exit full screen' : 'Full screen'}
                >
                  {isFullscreen ? (
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M9 3v6H3M15 3v6h6M9 21v-6H3M15 21v-6h6" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M9 3H3v6M15 3h6v6M9 21H3v-6M15 21h6v-6" />
                    </svg>
                  )}
                </button>
              )}

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
