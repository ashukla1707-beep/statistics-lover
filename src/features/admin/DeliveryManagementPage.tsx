import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BackLink } from '../../components/ui/BackLink'
import { useAuth } from '../auth'
import { listManagedBatches, listManagedCourses, type ManagedBatch, type ManagedCourse } from './academicAdminService'
import { AdminSubnav } from './AdminSubnav'
import {
  listManagedLectures,
  listManagedModules,
  listManagedSubjects,
  type ManagedLecture,
  type ManagedModule,
  type ManagedSubject,
} from './contentAdminService'
import {
  deleteManagedDeliverySource,
  listManagedDeliverySources,
  saveManagedDeliverySource,
  type DeliveryActionKind,
  type DeliveryProvider,
  type ManagedDeliverySource,
} from './deliveryAdminService'

type SourceForm = {
  provider: DeliveryProvider
  url: string
  label: string
  availableFrom: string
  availableUntil: string
}

const emptyJoin: SourceForm = { provider: 'google_meet', url: '', label: 'Join live class', availableFrom: '', availableUntil: '' }
const emptyWatch: SourceForm = { provider: 'google_drive', url: '', label: 'Watch recording', availableFrom: '', availableUntil: '' }

function humanize(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error && 'message' in error && typeof error.message === 'string') return error.message
  return 'Something went wrong. Please try again.'
}

function toLocalDateTime(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

function sourceForm(source: ManagedDeliverySource, fallbackLabel: string): SourceForm {
  return {
    provider: source.provider,
    url: source.providerReference,
    label: source.label ?? fallbackLabel,
    availableFrom: toLocalDateTime(source.availableFrom),
    availableUntil: toLocalDateTime(source.availableUntil),
  }
}

function defaultLiveWindow(lecture: ManagedLecture | null): Pick<SourceForm, 'availableFrom' | 'availableUntil'> {
  if (!lecture?.scheduledAt) return { availableFrom: '', availableUntil: '' }
  const scheduled = new Date(lecture.scheduledAt)
  const start = new Date(scheduled.getTime() - 15 * 60_000)
  const duration = lecture.durationMinutes ?? 60
  const end = new Date(scheduled.getTime() + (duration + 30) * 60_000)
  return { availableFrom: toLocalDateTime(start.toISOString()), availableUntil: toLocalDateTime(end.toISOString()) }
}

export function DeliveryManagementPage({ teacherMode = false }: { teacherMode?: boolean }) {
  const { identity } = useAuth()
  const canDelete = identity?.roles.some((role) => role === 'admin' || role === 'owner') ?? false

  const [courses, setCourses] = useState<ManagedCourse[]>([])
  const [batches, setBatches] = useState<ManagedBatch[]>([])
  const [subjects, setSubjects] = useState<ManagedSubject[]>([])
  const [modules, setModules] = useState<ManagedModule[]>([])
  const [lectures, setLectures] = useState<ManagedLecture[]>([])
  const [courseId, setCourseId] = useState('')
  const [batchId, setBatchId] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [moduleId, setModuleId] = useState('')
  const [lectureId, setLectureId] = useState('')
  const [joinForm, setJoinForm] = useState<SourceForm>(emptyJoin)
  const [watchForm, setWatchForm] = useState<SourceForm>(emptyWatch)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const selectedLecture = useMemo(
    () => lectures.find((lecture) => lecture.id === lectureId) ?? null,
    [lectures, lectureId],
  )

  async function loadSources(targetLectureId: string, lecture: ManagedLecture | null = selectedLecture) {
    const liveWindow = defaultLiveWindow(lecture)
    setJoinForm({ ...emptyJoin, ...liveWindow })
    setWatchForm(emptyWatch)
    if (!targetLectureId) return
    const sources = await listManagedDeliverySources(targetLectureId)
    const join = sources.find((source) => source.actionKind === 'join')
    const watch = sources.find((source) => source.actionKind === 'watch')
    if (join) setJoinForm(sourceForm(join, 'Join live class'))
    if (watch) setWatchForm(sourceForm(watch, 'Watch recording'))
  }

  async function chooseLecture(targetLectureId: string, knownLectures = lectures) {
    setLectures(knownLectures)
    setLectureId(targetLectureId)
    setError(null)
    const lecture = knownLectures.find((item) => item.id === targetLectureId) ?? null
    await loadSources(targetLectureId, lecture)
  }

  async function chooseModule(targetModuleId: string, knownModules = modules) {
    setModules(knownModules)
    setModuleId(targetModuleId)
    setLectureId('')
    setJoinForm(emptyJoin)
    setWatchForm(emptyWatch)
    const rows = await listManagedLectures(targetModuleId)
    setLectures(rows)
    if (rows[0]) await chooseLecture(rows[0].id, rows)
  }

  async function chooseSubject(targetSubjectId: string, knownSubjects = subjects) {
    setSubjects(knownSubjects)
    setSubjectId(targetSubjectId)
    setModuleId('')
    setLectureId('')
    setLectures([])
    const rows = await listManagedModules(targetSubjectId)
    setModules(rows)
    if (rows[0]) await chooseModule(rows[0].id, rows)
  }

  async function chooseBatch(targetBatchId: string, knownBatches = batches) {
    setBatches(knownBatches)
    setBatchId(targetBatchId)
    setSubjectId('')
    setModuleId('')
    setLectureId('')
    setModules([])
    setLectures([])
    const rows = await listManagedSubjects(targetBatchId)
    setSubjects(rows)
    if (rows[0]) await chooseSubject(rows[0].id, rows)
  }

  async function chooseCourse(targetCourseId: string, knownCourses = courses) {
    setCourses(knownCourses)
    setCourseId(targetCourseId)
    setBatchId('')
    setSubjectId('')
    setModuleId('')
    setLectureId('')
    setSubjects([])
    setModules([])
    setLectures([])
    const rows = await listManagedBatches(targetCourseId)
    setBatches(rows)
    if (rows[0]) await chooseBatch(rows[0].id, rows)
  }

  useEffect(() => {
    let active = true
    void listManagedCourses()
      .then(async (rows) => {
        if (!active) return
        setCourses(rows)
        if (rows[0]) await chooseCourse(rows[0].id, rows)
      })
      .catch((cause) => { if (active) setError(errorMessage(cause)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  async function saveSource(actionKind: DeliveryActionKind, form: SourceForm) {
    if (!selectedLecture) return
    const url = form.url.trim()
    if (!url.startsWith('https://')) {
      setError('Provider links must use HTTPS.')
      return
    }

    const availableFrom = form.availableFrom ? new Date(form.availableFrom).toISOString() : null
    const availableUntil = form.availableUntil ? new Date(form.availableUntil).toISOString() : null
    if (availableFrom && availableUntil && new Date(availableFrom) > new Date(availableUntil)) {
      setError('Available until must be after available from.')
      return
    }

    setSaving(true)
    setError(null)
    setNotice(null)
    try {
      await saveManagedDeliverySource({
        lectureId: selectedLecture.id,
        actionKind,
        provider: form.provider,
        providerReference: url,
        label: form.label,
        availableFrom,
        availableUntil,
      })
      await loadSources(selectedLecture.id, selectedLecture)
      setNotice(actionKind === 'join' ? 'Live-class access saved.' : 'Recording access saved.')
    } catch (cause) {
      setError(errorMessage(cause))
    } finally {
      setSaving(false)
    }
  }

  async function removeSource(actionKind: DeliveryActionKind) {
    if (!selectedLecture || !canDelete || !window.confirm('Remove this protected delivery source?')) return
    setSaving(true)
    setError(null)
    setNotice(null)
    try {
      await deleteManagedDeliverySource(selectedLecture.id, actionKind)
      await loadSources(selectedLecture.id, selectedLecture)
      setNotice('Delivery source removed.')
    } catch (cause) {
      setError(errorMessage(cause))
    } finally {
      setSaving(false)
    }
  }

  const canJoin = selectedLecture?.deliveryMode === 'live' || selectedLecture?.deliveryMode === 'hybrid'
  const canWatch = selectedLecture?.deliveryMode === 'recorded' || selectedLecture?.deliveryMode === 'hybrid'

  const availabilityFields = (form: SourceForm, setForm: (value: SourceForm) => void) => (
    <div className="delivery-window-grid">
      <label className="form-field">
        <span>Available from</span>
        <input type="datetime-local" value={form.availableFrom} onChange={(event) => setForm({ ...form, availableFrom: event.target.value })} />
      </label>
      <label className="form-field">
        <span>Available until</span>
        <input type="datetime-local" value={form.availableUntil} onChange={(event) => setForm({ ...form, availableUntil: event.target.value })} />
      </label>
    </div>
  )

  return (
    <section className="admin-page delivery-admin-page">
      <div className="container admin-shell">
        {teacherMode ? (
          <div className="teacher-mode-nav">
            <BackLink to="/teacher">Teacher workspace</BackLink>
            <span>Assignment-scoped access</span>
          </div>
        ) : (
          <AdminSubnav active="delivery" />
        )}

        <header className="admin-page-heading">
          <div>
            <span className="eyebrow">Protected delivery workspace</span>
            <h1>Live & Recorded Access</h1>
            <p>Attach protected provider access and control exactly when enrolled students can join or watch each lecture.</p>
          </div>
        </header>

        {error && <div className="admin-alert admin-alert-error" role="alert">{error}</div>}
        {notice && <div className="admin-alert admin-alert-success" role="status">{notice}</div>}

        <div className="delivery-context-grid">
          <label className="form-field"><span>Course</span><select value={courseId} disabled={loading || courses.length === 0} onChange={(event) => void chooseCourse(event.target.value)}>{courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}</select></label>
          <label className="form-field"><span>Batch</span><select value={batchId} disabled={batches.length === 0} onChange={(event) => void chooseBatch(event.target.value)}>{batches.map((batch) => <option key={batch.id} value={batch.id}>{batch.title}</option>)}</select></label>
          <label className="form-field"><span>Subject</span><select value={subjectId} disabled={subjects.length === 0} onChange={(event) => void chooseSubject(event.target.value)}>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.title}</option>)}</select></label>
          <label className="form-field"><span>Module</span><select value={moduleId} disabled={modules.length === 0} onChange={(event) => void chooseModule(event.target.value)}>{modules.map((module) => <option key={module.id} value={module.id}>{module.title}</option>)}</select></label>
          <label className="form-field delivery-lecture-field"><span>Lecture</span><select value={lectureId} disabled={lectures.length === 0} onChange={(event) => void chooseLecture(event.target.value)}>{lectures.map((lecture) => <option key={lecture.id} value={lecture.id}>{lecture.title}</option>)}</select></label>
        </div>

        {!selectedLecture ? (
          <div className="admin-panel delivery-empty"><strong>No lecture selected</strong><p>Create a lecture in Subjects & Lectures first, then return here to attach protected delivery.</p></div>
        ) : (
          <>
            <section className="admin-panel delivery-lecture-summary">
              <div>
                <span className="eyebrow">Selected lecture</span>
                <h2>{selectedLecture.title}</h2>
                <p>{humanize(selectedLecture.deliveryMode)} · {humanize(selectedLecture.status)}{selectedLecture.scheduledAt ? ` · ${new Date(selectedLecture.scheduledAt).toLocaleString()}` : ''}{selectedLecture.durationMinutes ? ` · ${selectedLecture.durationMinutes} min` : ''}</p>
              </div>
              <p className="delivery-security-note">Links stay in the protected source table. Students receive them only after enrollment, release and availability-window checks pass.</p>
            </section>

            <div className="delivery-source-grid">
              <section className={`admin-panel delivery-source-card ${canJoin ? '' : 'is-disabled'}`}>
                <div className="admin-panel-heading compact"><div><span>Live adapter</span><h2>Join live class</h2></div></div>
                {!canJoin && <p className="admin-empty">Change this lecture to Live or Hybrid before attaching a live-class source.</p>}
                {canJoin && (
                  <div className="admin-form delivery-source-form">
                    <label className="form-field"><span>Provider</span><select value={joinForm.provider} onChange={(event) => setJoinForm((current) => ({ ...current, provider: event.target.value as DeliveryProvider }))}><option value="google_meet">Google Meet</option><option value="external">External provider</option></select></label>
                    <label className="form-field"><span>Protected HTTPS link</span><input type="url" inputMode="url" placeholder="https://meet.google.com/..." value={joinForm.url} onChange={(event) => setJoinForm((current) => ({ ...current, url: event.target.value }))} /></label>
                    <label className="form-field"><span>Student button label</span><input maxLength={120} value={joinForm.label} onChange={(event) => setJoinForm((current) => ({ ...current, label: event.target.value }))} /></label>
                    {availabilityFields(joinForm, setJoinForm)}
                    <p className="delivery-window-note">For scheduled classes the default window opens 15 minutes before class and closes 30 minutes after the planned duration. You can change it.</p>
                    <div className="admin-form-actions"><button className="button button-small" type="button" disabled={saving || !joinForm.url.trim()} onClick={() => void saveSource('join', joinForm)}>{saving ? 'Saving…' : 'Save live access'}</button>{canDelete && joinForm.url && <button className="admin-danger-button" type="button" disabled={saving} onClick={() => void removeSource('join')}>Remove</button>}</div>
                  </div>
                )}
              </section>

              <section className={`admin-panel delivery-source-card ${canWatch ? '' : 'is-disabled'}`}>
                <div className="admin-panel-heading compact"><div><span>Recording adapter</span><h2>Watch recording</h2></div></div>
                {!canWatch && <p className="admin-empty">Change this lecture to Recorded or Hybrid before attaching a recording source.</p>}
                {canWatch && (
                  <div className="admin-form delivery-source-form">
                    <label className="form-field"><span>Provider</span><select value={watchForm.provider} onChange={(event) => setWatchForm((current) => ({ ...current, provider: event.target.value as DeliveryProvider }))}><option value="google_drive">Google Drive</option><option value="cloudflare_stream">Cloudflare Stream</option><option value="external">External provider</option></select></label>
                    <label className="form-field"><span>Protected HTTPS link</span><input type="url" inputMode="url" placeholder="https://drive.google.com/..." value={watchForm.url} onChange={(event) => setWatchForm((current) => ({ ...current, url: event.target.value }))} /></label>
                    <label className="form-field"><span>Student button label</span><input maxLength={120} value={watchForm.label} onChange={(event) => setWatchForm((current) => ({ ...current, label: event.target.value }))} /></label>
                    {availabilityFields(watchForm, setWatchForm)}
                    <p className="delivery-window-note">Leave the window blank for normal published-recording access, or use it for temporary availability.</p>
                    <div className="admin-form-actions"><button className="button button-small" type="button" disabled={saving || !watchForm.url.trim()} onClick={() => void saveSource('watch', watchForm)}>{saving ? 'Saving…' : 'Save recording access'}</button>{canDelete && watchForm.url && <button className="admin-danger-button" type="button" disabled={saving} onClick={() => void removeSource('watch')}>Remove</button>}</div>
                  </div>
                )}
              </section>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
