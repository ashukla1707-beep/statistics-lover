import { useEffect, useMemo, useState } from 'react'
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
  deleteManagedRecordingArchive,
  getManagedRecordingArchive,
  listManagedDeliverySources,
  saveManagedDeliverySource,
  saveManagedRecordingArchive,
  type DeliveryActionKind,
  type DeliveryProvider,
} from './deliveryAdminService'
import {
  getStreamUploadStatus,
  uploadLectureToStream,
  waitForStreamReady,
  type StreamUploadStatus,
} from './streamUploadService'

type SourceForm = {
  provider: DeliveryProvider
  url: string
  label: string
}

type ArchiveForm = {
  url: string
}

const emptyJoin: SourceForm = { provider: 'google_meet', url: '', label: 'Join live class' }
const emptyWatch: SourceForm = { provider: 'cloudflare_stream', url: '', label: 'Watch recording' }
const emptyArchive: ArchiveForm = { url: '' }

function humanize(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error && 'message' in error && typeof error.message === 'string') return error.message
  return 'Something went wrong. Please try again.'
}

function recordingPlaceholder(provider: DeliveryProvider) {
  if (provider === 'cloudflare_stream') return 'https://customer-xxxx.cloudflarestream.com/VIDEO_UID/iframe'
  if (provider === 'google_drive') return 'https://drive.google.com/file/d/.../view'
  return 'https://...'
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(bytes >= 100 * 1024 * 1024 ? 0 : 1)} MB`
}

export function DeliveryManagementPage() {
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
  const [archiveForm, setArchiveForm] = useState<ArchiveForm>(emptyArchive)
  const [recordingFile, setRecordingFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [streamStatus, setStreamStatus] = useState<StreamUploadStatus | null>(null)
  const [streamBusy, setStreamBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const selectedLecture = useMemo(
    () => lectures.find((lecture) => lecture.id === lectureId) ?? null,
    [lectures, lectureId],
  )

  async function loadSources(targetLectureId: string) {
    setJoinForm(emptyJoin)
    setWatchForm(emptyWatch)
    setArchiveForm(emptyArchive)
    setRecordingFile(null)
    setUploadProgress(null)
    setStreamStatus(null)
    if (!targetLectureId) return

    const [sources, archive, currentStreamStatus] = await Promise.all([
      listManagedDeliverySources(targetLectureId),
      getManagedRecordingArchive(targetLectureId),
      getStreamUploadStatus(targetLectureId).catch(() => null),
    ])
    const join = sources.find((source) => source.actionKind === 'join')
    const watch = sources.find((source) => source.actionKind === 'watch')
    if (join) setJoinForm({ provider: join.provider, url: join.providerReference, label: join.label ?? 'Join live class' })
    if (watch) setWatchForm({ provider: watch.provider, url: watch.providerReference, label: watch.label ?? 'Watch recording' })
    if (archive) setArchiveForm({ url: archive.providerReference })
    if (currentStreamStatus) setStreamStatus(currentStreamStatus)
  }

  async function chooseLecture(targetLectureId: string, knownLectures = lectures) {
    setLectures(knownLectures)
    setLectureId(targetLectureId)
    setError(null)
    await loadSources(targetLectureId)
  }

  async function chooseModule(targetModuleId: string, knownModules = modules) {
    setModules(knownModules)
    setModuleId(targetModuleId)
    setLectureId('')
    setJoinForm(emptyJoin)
    setWatchForm(emptyWatch)
    setArchiveForm(emptyArchive)
    setStreamStatus(null)
    setRecordingFile(null)
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
      })
      await loadSources(selectedLecture.id)
      setNotice(actionKind === 'join' ? 'Live-class access saved.' : 'Student playback delivery saved.')
    } catch (cause) {
      setError(errorMessage(cause))
    } finally {
      setSaving(false)
    }
  }

  async function saveArchive() {
    if (!selectedLecture) return
    const url = archiveForm.url.trim()
    if (!url.startsWith('https://')) {
      setError('Archive links must use HTTPS.')
      return
    }
    setSaving(true)
    setError(null)
    setNotice(null)
    try {
      await saveManagedRecordingArchive({
        lectureId: selectedLecture.id,
        provider: 'google_drive',
        providerReference: url,
      })
      await loadSources(selectedLecture.id)
      setNotice('Google Drive archive source saved. Students cannot read this archive link directly.')
    } catch (cause) {
      setError(errorMessage(cause))
    } finally {
      setSaving(false)
    }
  }

  async function uploadRecording() {
    if (!selectedLecture || !recordingFile) return
    setStreamBusy(true)
    setError(null)
    setNotice(null)
    setUploadProgress(0)
    try {
      const expectedSeconds = (selectedLecture.durationMinutes ?? 180) * 60
      const maxDurationSeconds = Math.min(36000, Math.max(900, expectedSeconds + 900))
      await uploadLectureToStream({
        lectureId: selectedLecture.id,
        file: recordingFile,
        maxDurationSeconds,
        onProgress: setUploadProgress,
      })
      setNotice('Upload complete. Cloudflare is processing the recording; student playback will activate automatically when it is ready.')
      const finalStatus = await waitForStreamReady(selectedLecture.id, setStreamStatus)
      if (finalStatus.ready) {
        await loadSources(selectedLecture.id)
        setNotice('Recording is ready. Protected Cloudflare Stream playback is now active for enrolled students.')
      } else if (finalStatus.state === 'error') {
        setError(finalStatus.error || 'Cloudflare could not process this recording.')
      } else if (finalStatus.error) {
        setNotice(finalStatus.error)
      }
    } catch (cause) {
      setError(errorMessage(cause))
    } finally {
      setStreamBusy(false)
    }
  }

  async function checkStreamProcessing() {
    if (!selectedLecture) return
    setStreamBusy(true)
    setError(null)
    try {
      const status = await getStreamUploadStatus(selectedLecture.id)
      setStreamStatus(status)
      if (status.ready) {
        await loadSources(selectedLecture.id)
        setNotice('Recording is ready and student playback is active.')
      } else if (status.state === 'error') {
        setError(status.error || 'Cloudflare could not process this recording.')
      } else {
        setNotice(status.state === 'none' ? 'No automatic Stream upload exists for this lecture yet.' : 'Recording is still processing.')
      }
    } catch (cause) {
      setError(errorMessage(cause))
    } finally {
      setStreamBusy(false)
    }
  }

  async function removeSource(actionKind: DeliveryActionKind) {
    if (!selectedLecture || !canDelete || !window.confirm('Remove this protected delivery source?')) return
    setSaving(true)
    setError(null)
    setNotice(null)
    try {
      await deleteManagedDeliverySource(selectedLecture.id, actionKind)
      await loadSources(selectedLecture.id)
      setNotice('Delivery source removed.')
    } catch (cause) {
      setError(errorMessage(cause))
    } finally {
      setSaving(false)
    }
  }

  async function removeArchive() {
    if (!selectedLecture || !canDelete || !window.confirm('Remove this archive reference? The Drive file itself will not be deleted.')) return
    setSaving(true)
    setError(null)
    setNotice(null)
    try {
      await deleteManagedRecordingArchive(selectedLecture.id)
      await loadSources(selectedLecture.id)
      setNotice('Archive reference removed. The original Drive file was not changed.')
    } catch (cause) {
      setError(errorMessage(cause))
    } finally {
      setSaving(false)
    }
  }

  const canJoin = selectedLecture?.deliveryMode === 'live' || selectedLecture?.deliveryMode === 'hybrid'
  const canWatch = selectedLecture?.deliveryMode === 'recorded' || selectedLecture?.deliveryMode === 'hybrid'
  const managedStreamPlayback = watchForm.provider === 'cloudflare_stream' && watchForm.url.startsWith('stream://')

  return (
    <section className="admin-page delivery-admin-page">
      <div className="container admin-shell">
        <AdminSubnav active="delivery" />

        <header className="admin-page-heading">
          <div>
            <span className="eyebrow">Protected delivery workspace</span>
            <h1>Live & Recorded Access</h1>
            <p>Keep original recordings archived on Google Drive and upload the student playback copy to Cloudflare Stream directly from Statistics Lover.</p>
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
                <p>{humanize(selectedLecture.deliveryMode)} · {humanize(selectedLecture.status)}{selectedLecture.durationMinutes ? ` · ${selectedLecture.durationMinutes} min` : ''}</p>
              </div>
              <p className="delivery-security-note">Archive links remain staff-only. Stream videos are private and students receive a signed player only after enrollment is verified.</p>
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
                    <div className="admin-form-actions"><button className="button button-small" type="button" disabled={saving || !joinForm.url.trim()} onClick={() => void saveSource('join', joinForm)}>{saving ? 'Saving…' : 'Save live access'}</button>{canDelete && joinForm.url && <button className="admin-danger-button" type="button" disabled={saving} onClick={() => void removeSource('join')}>Remove</button>}</div>
                  </div>
                )}
              </section>

              <section className={`admin-panel delivery-source-card ${canWatch ? '' : 'is-disabled'}`}>
                <div className="admin-panel-heading compact"><div><span>Recording architecture</span><h2>Archive + automatic playback</h2></div></div>
                {!canWatch && <p className="admin-empty">Change this lecture to Recorded or Hybrid before attaching a recording source.</p>}
                {canWatch && (
                  <div className="admin-form delivery-source-form">
                    <div className="delivery-subsection">
                      <div className="delivery-subsection-heading">
                        <div><span className="eyebrow">Archive source</span><strong>Google Drive original</strong></div>
                        <small>Staff-only. If Google Meet already created the recording in Drive, keep that original here.</small>
                      </div>
                      <label className="form-field"><span>Google Drive file link</span><input type="url" inputMode="url" placeholder="https://drive.google.com/file/d/.../view" value={archiveForm.url} onChange={(event) => setArchiveForm({ url: event.target.value })} /></label>
                      <div className="admin-form-actions"><button className="button button-small button-secondary" type="button" disabled={saving || !archiveForm.url.trim()} onClick={() => void saveArchive()}>{saving ? 'Saving…' : 'Save Drive archive'}</button>{canDelete && archiveForm.url && <button className="admin-danger-button" type="button" disabled={saving} onClick={() => void removeArchive()}>Remove archive reference</button>}</div>
                    </div>

                    <div className="delivery-subsection delivery-stream-upload">
                      <div className="delivery-subsection-heading">
                        <div><span className="eyebrow">Automatic student delivery</span><strong>Upload once to Cloudflare Stream</strong></div>
                        <small>No Cloudflare dashboard or player-link copying is needed.</small>
                      </div>
                      <label className="form-field"><span>Recording file</span><input type="file" accept="video/*,.mp4,.mov,.mkv,.webm,.avi" disabled={streamBusy} onChange={(event) => setRecordingFile(event.target.files?.[0] ?? null)} /></label>
                      {recordingFile && <small className="delivery-file-note">{recordingFile.name} · {formatBytes(recordingFile.size)}</small>}
                      {uploadProgress !== null && (
                        <div className="delivery-upload-progress" aria-label={`Upload ${uploadProgress}% complete`}>
                          <div><span>Uploading</span><strong>{uploadProgress}%</strong></div>
                          <progress max="100" value={uploadProgress}>{uploadProgress}%</progress>
                        </div>
                      )}
                      {streamStatus && streamStatus.state !== 'none' && (
                        <div className={`delivery-stream-status is-${streamStatus.state}`}>
                          <strong>{streamStatus.ready ? 'Ready for students' : humanize(streamStatus.state)}</strong>
                          <span>{streamStatus.processingPct != null ? `${Math.round(streamStatus.processingPct)}% processed` : streamStatus.ready ? 'Signed playback is active.' : 'Cloudflare is preparing adaptive playback.'}</span>
                        </div>
                      )}
                      <div className="admin-form-actions">
                        <button className="button button-small" type="button" disabled={streamBusy || !recordingFile} onClick={() => void uploadRecording()}>{streamBusy ? 'Working…' : managedStreamPlayback ? 'Replace Stream recording' : 'Upload & activate playback'}</button>
                        {(streamStatus?.state === 'processing' || streamStatus?.state === 'uploading') && <button className="button button-small button-secondary" type="button" disabled={streamBusy} onClick={() => void checkStreamProcessing()}>Check processing</button>}
                        {canDelete && managedStreamPlayback && <button className="admin-danger-button" type="button" disabled={streamBusy || saving} onClick={() => void removeSource('watch')}>Disable student playback</button>}
                      </div>
                      <small className="delivery-file-note">Files up to 200 MB work with the Stream binding immediately. Larger lecture files use resumable upload after the one-time Cloudflare API credential is configured.</small>
                    </div>

                    <details className="delivery-manual-fallback">
                      <summary>Manual provider fallback</summary>
                      <div className="delivery-subsection">
                        <div className="delivery-subsection-heading">
                          <div><span className="eyebrow">Recovery option</span><strong>Paste an existing playback link</strong></div>
                          <small>Use this only if automatic upload is unavailable.</small>
                        </div>
                        <label className="form-field"><span>Provider</span><select value={watchForm.provider} onChange={(event) => setWatchForm((current) => ({ ...current, provider: event.target.value as DeliveryProvider, url: '' }))}><option value="cloudflare_stream">Cloudflare Stream</option><option value="google_drive">Google Drive fallback</option><option value="external">External provider</option></select></label>
                        {managedStreamPlayback ? (
                          <div className="delivery-managed-reference">Cloudflare Stream asset is managed automatically.</div>
                        ) : (
                          <label className="form-field"><span>Protected playback link</span><input type="url" inputMode="url" placeholder={recordingPlaceholder(watchForm.provider)} value={watchForm.url} onChange={(event) => setWatchForm((current) => ({ ...current, url: event.target.value }))} /></label>
                        )}
                        <label className="form-field"><span>Student button label</span><input maxLength={120} value={watchForm.label} onChange={(event) => setWatchForm((current) => ({ ...current, label: event.target.value }))} /></label>
                        {!managedStreamPlayback && <div className="admin-form-actions"><button className="button button-small" type="button" disabled={saving || !watchForm.url.trim()} onClick={() => void saveSource('watch', watchForm)}>{saving ? 'Saving…' : 'Save manual playback'}</button>{canDelete && watchForm.url && <button className="admin-danger-button" type="button" disabled={saving} onClick={() => void removeSource('watch')}>Remove playback</button>}</div>}
                      </div>
                    </details>
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
