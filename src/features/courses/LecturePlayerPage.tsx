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

type NavigatorWithUserAgentData = Navigator & {
  userAgentData?: {
    mobile?: boolean
  }
}

function isStatisticsLoverAndroidApp() {
  if (typeof navigator === 'undefined') return false
  return /StatisticsLoverAndroid\//i.test(navigator.userAgent)
}

type StatisticsLoverNativeBridge = {
  enterFullscreen?: () => void
  exitFullscreen?: () => void
}

function getStatisticsLoverNativeBridge() {
  return (window as Window & { StatisticsLoverNative?: StatisticsLoverNativeBridge }).StatisticsLoverNative
}

function isMobileBrowserMode() {
  if (typeof navigator === 'undefined') return false

  // The Android APK intentionally renders the responsive web UI inside a WebView,
  // but its recording route provides a desktop-style UA to Google Drive.
  // Android WebView may still report userAgentData.mobile=true, so app mode must
  // take precedence over browser mobile detection.
  if (isStatisticsLoverAndroidApp()) return false

  const mobileFlag = (navigator as NavigatorWithUserAgentData).userAgentData?.mobile
  if (typeof mobileFlag === 'boolean') return mobileFlag

  return /Android|Mobi|iPhone|iPad|iPod/i.test(navigator.userAgent)
}

const DRIVE_DESKTOP_WIDTH = 1024
const DRIVE_DESKTOP_HEIGHT = 576

function isTouchDevice() {
  return typeof window !== 'undefined' && window.matchMedia('(hover: none) and (pointer: coarse)').matches
}

function shouldShowPhoneFullscreen() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false

  // The Android APK intentionally keeps the Statistics Lover custom fullscreen
  // control. Android-specific fullscreen CSS lets the Drive iframe occupy the
  // real fullscreen viewport instead of scaling the old 1024x576 workaround.
  if (isStatisticsLoverAndroidApp()) return true

  return navigator.maxTouchPoints > 0
    && window.matchMedia('(hover: none) and (pointer: coarse)').matches
}

type LockableScreenOrientation = ScreenOrientation & {
  lock?: (orientation: 'landscape') => Promise<void>
  unlock?: () => void
}

async function lockLandscapeOrientation() {
  // The Android APK owns fullscreen orientation natively. Letting both the
  // webpage and Activity lock orientation can recreate/reload the WebView.
  if (isStatisticsLoverAndroidApp()) return

  const orientation = screen.orientation as LockableScreenOrientation | undefined
  if (!orientation?.lock) return

  try {
    await orientation.lock('landscape')
  } catch {
    // Some mobile browsers do not permit programmatic orientation locking.
  }
}

function unlockOrientation() {
  if (isStatisticsLoverAndroidApp()) return

  const orientation = screen.orientation as LockableScreenOrientation | undefined
  try {
    orientation?.unlock?.()
  } catch {
    // Ignore browsers that do not support unlocking orientation.
  }
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
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [canFullscreen, setCanFullscreen] = useState(false)
  const requiresDesktopSite = isMobileBrowserMode()
  const showCustomFullscreen = isStatisticsLoverAndroidApp()
    || (canFullscreen && shouldShowPhoneFullscreen())
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
    const handleFullscreenChange = () => {
      const active = getFullscreenElement() === stage
      setIsFullscreen(active)

      if (!active) {
        unlockOrientation()
      }

      queuePlayerScaleSync(stage)
      window.setTimeout(() => queuePlayerScaleSync(stage), 180)
      window.setTimeout(() => queuePlayerScaleSync(stage), 420)
    }

    const resizeObserver = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(handleViewportChange)

    setCanFullscreen(canUseFullscreen(stage))
    resizeObserver?.observe(stage)
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
    window.addEventListener('resize', handleViewportChange)
    window.visualViewport?.addEventListener('resize', handleViewportChange)
    screen.orientation?.addEventListener('change', handleViewportChange)
    queuePlayerScaleSync(stage)

    return () => {
      resizeObserver?.disconnect()
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
      window.removeEventListener('resize', handleViewportChange)
      window.visualViewport?.removeEventListener('resize', handleViewportChange)
      screen.orientation?.removeEventListener('change', handleViewportChange)
      stage.style.removeProperty('--drive-player-scale')
    }
  }, [state.loaded])

  useEffect(() => {
    if (!isStatisticsLoverAndroidApp()) return

    const handleNativeExit = () => setIsFullscreen(false)
    window.addEventListener('statisticslover:exit-fullscreen', handleNativeExit)

    if (isFullscreen) {
      const previousHtmlOverflow = document.documentElement.style.overflow
      const previousBodyOverflow = document.body.style.overflow
      document.documentElement.style.overflow = 'hidden'
      document.body.style.overflow = 'hidden'

      return () => {
        document.documentElement.style.overflow = previousHtmlOverflow
        document.body.style.overflow = previousBodyOverflow
        window.removeEventListener('statisticslover:exit-fullscreen', handleNativeExit)
      }
    }

    return () => window.removeEventListener('statisticslover:exit-fullscreen', handleNativeExit)
  }, [isFullscreen])

  const backPath = useMemo(() => `/learn/${batchId}`, [batchId])

  const toggleFullscreen = async () => {
    const stage = stageRef.current as FullscreenStage | null
    if (!stage) return

    if (isStatisticsLoverAndroidApp()) {
      const bridge = getStatisticsLoverNativeBridge()

      if (isFullscreen) {
        setIsFullscreen(false)
        bridge?.exitFullscreen?.()
      } else {
        setIsFullscreen(true)
        bridge?.enterFullscreen?.()
      }
      return
    }

    if (!canUseFullscreen(stage)) return
    const fullscreenDocument = document as FullscreenDocument

    try {
      if (getFullscreenElement() === stage) {
        unlockOrientation()

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

      await lockLandscapeOrientation()
      queuePlayerScaleSync(stage)
      window.setTimeout(() => queuePlayerScaleSync(stage), 180)
      window.setTimeout(() => queuePlayerScaleSync(stage), 420)
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
          className={`lecture-player-stage${isStatisticsLoverAndroidApp() ? ' lecture-player-stage-android' : ''}${isStatisticsLoverAndroidApp() && isFullscreen ? ' lecture-player-stage-app-fullscreen' : ''}`}
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
              {showCustomFullscreen && (
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
                  src="/brand/statistics-lover-logo.jpg?v=20261004-4"
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
