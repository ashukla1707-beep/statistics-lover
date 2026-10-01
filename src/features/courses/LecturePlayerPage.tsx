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
import { resolveStreamPlayback } from './streamPlaybackService'

type PlayerContext = {
  enrollment: StudentCourseEnrollment | null
  lecture: StudentLecture | null
  subjectTitle: string
  moduleTitle: string
  action: LectureDeliveryAction | null
  error: string | null
  loaded: boolean
}

type ResolvedStreamPlayback = {
  key: string
  url: string | null
  error: string | null
}

const DRIVE_DESKTOP_WIDTH = 1024
const DRIVE_DESKTOP_HEIGHT = 576

function isTouchDevice() {
  return typeof window !== 'undefined' && window.matchMedia('(hover: none) and (pointer: coarse)').matches
}

function humanize(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function unlockOrientation() {
  const orientation = screen.orientation as typeof screen.orientation & { unlock?: () => void }
  try {
    orientation.unlock?.()
  } catch {
    // Orientation locking is optional and browser-dependent.
  }
}

async function lockLandscapeIfSupported() {
  const orientation = screen.orientation as typeof screen.orientation & {
    lock?: (orientation: string) => Promise<void>
  }
  try {
    await orientation.lock?.('landscape')
  } catch {
    // Mobile browsers may reject orientation locking; playback still works.
  }
}

function syncTouchPlayerScale(stage: HTMLDivElement | null, isDrivePlayback: boolean) {
  if (!stage || !isDrivePlayback || !isTouchDevice()) {
    stage?.style.removeProperty('--drive-player-scale')
    return
  }

  const rect = stage.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) return

  const scale = Math.min(rect.width / DRIVE_DESKTOP_WIDTH, rect.height / DRIVE_DESKTOP_HEIGHT)
  stage.style.setProperty('--drive-player-scale', String(Math.max(scale, 0.1)))
}

export function LecturePlayerPage() {
  const { batchId = '', lectureId = '' } = useParams()
  const { identity } = useAuth()
  const stageRef = useRef<HTMLDivElement>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [resolvedStreamPlayback, setResolvedStreamPlayback] = useState<ResolvedStreamPlayback | null>(null)
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
          (item) => item.lectureId === lectureId
            && item.actionKind === 'watch'
            && (item.provider === 'google_drive' || item.provider === 'cloudflare_stream'),
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

  const streamPlaybackKey = `${batchId}:${lectureId}`

  useEffect(() => {
    if (state.action?.provider !== 'cloudflare_stream') return
    let active = true
    void resolveStreamPlayback(batchId, lectureId)
      .then((url) => {
        if (active) setResolvedStreamPlayback({ key: streamPlaybackKey, url, error: null })
      })
      .catch((error: unknown) => {
        if (!active) return
        setResolvedStreamPlayback({
          key: streamPlaybackKey,
          url: null,
          error: error instanceof Error ? error.message : 'Cloudflare Stream playback could not be opened.',
        })
      })
    return () => { active = false }
  }, [batchId, lectureId, state.action?.provider, streamPlaybackKey])

  const isDrivePlayback = state.action?.provider === 'google_drive'
  const playbackUrl = isDrivePlayback
    ? state.action?.actionUrl ?? null
    : resolvedStreamPlayback?.key === streamPlaybackKey ? resolvedStreamPlayback.url : null
  const playbackError = resolvedStreamPlayback?.key === streamPlaybackKey ? resolvedStreamPlayback.error : null

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return

    const handleViewportChange = () => syncTouchPlayerScale(stage, isDrivePlayback)
    const handleFullscreenChange = () => {
      const active = document.fullscreenElement === stage
      setIsFullscreen(active)
      window.requestAnimationFrame(handleViewportChange)
      if (!active) unlockOrientation()
    }

    const resizeObserver = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(handleViewportChange)

    resizeObserver?.observe(stage)
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    window.addEventListener('resize', handleViewportChange)
    window.visualViewport?.addEventListener('resize', handleViewportChange)
    window.requestAnimationFrame(handleViewportChange)

    return () => {
      resizeObserver?.disconnect()
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      window.removeEventListener('resize', handleViewportChange)
      window.visualViewport?.removeEventListener('resize', handleViewportChange)
      stage.style.removeProperty('--drive-player-scale')
      unlockOrientation()
    }
  }, [isDrivePlayback, state.loaded])

  const backPath = useMemo(() => `/learn/${batchId}`, [batchId])

  const toggleFullscreen = async () => {
    if (!stageRef.current || !document.fullscreenEnabled) return

    try {
      if (document.fullscreenElement === stageRef.current) {
        await document.exitFullscreen()
        return
      }

      await stageRef.current.requestFullscreen({ navigationUI: 'hide' })
      if (isTouchDevice()) {
        await lockLandscapeIfSupported()
        window.requestAnimationFrame(() => syncTouchPlayerScale(stageRef.current, isDrivePlayback))
      }
    } catch {
      // Playback remains available inline when fullscreen is unavailable.
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
          data-provider={state.action.provider}
          role="region"
          aria-label={`${state.lecture.title} recording`}
        >
          <div className="lecture-player-media">
            {playbackUrl ? (
              <iframe
                src={playbackUrl}
                title={`${state.lecture.title} recording`}
                allow={state.action.provider === 'cloudflare_stream'
                  ? 'accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture'
                  : 'autoplay'}
                allowFullScreen={state.action.provider === 'cloudflare_stream'}
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="lecture-player-resolving">
                {playbackError ? <span>{playbackError}</span> : <span>Verifying secure playback…</span>}
              </div>
            )}
          </div>
          {isDrivePlayback && document.fullscreenEnabled && (
            <button
              type="button"
              className="lecture-player-fullscreen"
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? 'Exit full screen' : 'Enter full screen'}
              title={isFullscreen ? 'Exit full screen' : 'Full screen'}
            >
              {isFullscreen ? '×' : '⛶'}
            </button>
          )}
        </div>

        <div className="lecture-player-meta">
          <div>
            <strong>{state.enrollment.course.title}</strong>
            <span>{state.enrollment.batch.title}</span>
          </div>
          <small>Access verified for your enrollment · {humanize(state.action.provider)}</small>
        </div>
      </div>
    </main>
  )
}
