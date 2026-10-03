import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useAuth } from '../auth'
import { listManagedBatches, listManagedCourses, type ManagedBatch, type ManagedCourse } from './academicAdminService'
import { AdminSubnav } from './AdminSubnav'
import {
  createManagedLecture,
  createManagedModule,
  createManagedSubject,
  deleteManagedLecture,
  deleteManagedModule,
  deleteManagedSubject,
  listManagedLectures,
  listManagedModules,
  listManagedSubjects,
  updateManagedLecture,
  updateManagedModule,
  updateManagedSubject,
  type AcademicContentStatus,
  type LectureDeliveryMode,
  type LectureStatus,
  type ManagedLecture,
  type ManagedModule,
  type ManagedSubject,
} from './contentAdminService'

const contentStatuses: AcademicContentStatus[] = ['draft', 'published', 'archived']
const lectureStatuses: LectureStatus[] = ['draft', 'scheduled', 'live', 'processing', 'recorded', 'published', 'archived']
const deliveryModes: LectureDeliveryMode[] = ['live', 'recorded', 'hybrid']

type SubjectForm = {
  id: string | null
  title: string
  slug: string
  code: string
  description: string
  status: AcademicContentStatus
  position: number
}

type ModuleForm = {
  id: string | null
  title: string
  slug: string
  description: string
  status: AcademicContentStatus
  position: number
}

type LectureForm = {
  id: string | null
  title: string
  slug: string
  description: string
  status: LectureStatus
  deliveryMode: LectureDeliveryMode
  position: number
  scheduledAt: string
  durationMinutes: string
  releaseAt: string
  publishedAt: string | null
}

function slugify(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

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

function toIso(value: string) {
  return value ? new Date(value).toISOString() : ''
}

function subjectFormFrom(subject: ManagedSubject): SubjectForm {
  return {
    id: subject.id,
    title: subject.title,
    slug: subject.slug,
    code: subject.code ?? '',
    description: subject.description ?? '',
    status: subject.status,
    position: subject.position,
  }
}

function moduleFormFrom(module: ManagedModule): ModuleForm {
  return {
    id: module.id,
    title: module.title,
    slug: module.slug,
    description: module.description ?? '',
    status: module.status,
    position: module.position,
  }
}

function lectureFormFrom(lecture: ManagedLecture): LectureForm {
  return {
    id: lecture.id,
    title: lecture.title,
    slug: lecture.slug,
    description: lecture.description ?? '',
    status: lecture.status,
    deliveryMode: lecture.deliveryMode,
    position: lecture.position,
    scheduledAt: toLocalDateTime(lecture.scheduledAt),
    durationMinutes: lecture.durationMinutes?.toString() ?? '',
    releaseAt: toLocalDateTime(lecture.releaseAt),
    publishedAt: lecture.publishedAt,
  }
}

export function ContentManagementPage() {
  const { identity } = useAuth()
  const canDelete = identity?.roles.some((role) => role === 'admin' || role === 'owner') ?? false

  const [courses, setCourses] = useState<ManagedCourse[]>([])
  const [batches, setBatches] = useState<ManagedBatch[]>([])
  const [subjects, setSubjects] = useState<ManagedSubject[]>([])
  const [modules, setModules] = useState<ManagedModule[]>([])
  const [lectures, setLectures] = useState<ManagedLecture[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState('')
  const [selectedBatchId, setSelectedBatchId] = useState('')
  const [selectedSubjectId, setSelectedSubjectId] = useState('')
  const [selectedModuleId, setSelectedModuleId] = useState('')
  const [subjectForm, setSubjectForm] = useState<SubjectForm | null>(null)
  const [moduleForm, setModuleForm] = useState<ModuleForm | null>(null)
  const [lectureForm, setLectureForm] = useState<LectureForm | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const selectedBatch = useMemo(() => batches.find((batch) => batch.id === selectedBatchId) ?? null, [batches, selectedBatchId])
  const selectedSubject = useMemo(() => subjects.find((subject) => subject.id === selectedSubjectId) ?? null, [subjects, selectedSubjectId])
  const selectedModule = useMemo(() => modules.find((module) => module.id === selectedModuleId) ?? null, [modules, selectedModuleId])

  useEffect(() => {
    let active = true

    void listManagedCourses()
      .then(async (courseRows) => {
        if (!active) return
        setCourses(courseRows)
        const firstCourse = courseRows[0]
        if (!firstCourse) return
        setSelectedCourseId(firstCourse.id)
        const batchRows = await listManagedBatches(firstCourse.id)
        if (!active) return
        setBatches(batchRows)
        const firstBatch = batchRows[0]
        if (!firstBatch) return
        setSelectedBatchId(firstBatch.id)
        const subjectRows = await listManagedSubjects(firstBatch.id)
        if (!active) return
        setSubjects(subjectRows)
        const firstSubject = subjectRows[0]
        if (!firstSubject) return
        setSelectedSubjectId(firstSubject.id)
        const moduleRows = await listManagedModules(firstSubject.id)
        if (!active) return
        setModules(moduleRows)
        const firstModule = moduleRows[0]
        if (!firstModule) return
        setSelectedModuleId(firstModule.id)
        setLectures(await listManagedLectures(firstModule.id))
      })
      .catch((cause) => {
        if (active) setError(errorMessage(cause))
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => { active = false }
  }, [])

  async function chooseCourse(courseId: string) {
    setSelectedCourseId(courseId)
    setSelectedBatchId('')
    setSelectedSubjectId('')
    setSelectedModuleId('')
    setSubjects([])
    setModules([])
    setLectures([])
    setSubjectForm(null)
    setModuleForm(null)
    setLectureForm(null)
    setError(null)
    try {
      const rows = await listManagedBatches(courseId)
      setBatches(rows)
      if (rows[0]) await chooseBatch(rows[0].id, rows)
    } catch (cause) {
      setError(errorMessage(cause))
    }
  }

  async function chooseBatch(batchId: string, knownBatches = batches) {
    setBatches(knownBatches)
    setSelectedBatchId(batchId)
    setSelectedSubjectId('')
    setSelectedModuleId('')
    setModules([])
    setLectures([])
    setSubjectForm(null)
    setModuleForm(null)
    setLectureForm(null)
    setError(null)
    try {
      const rows = await listManagedSubjects(batchId)
      setSubjects(rows)
      if (rows[0]) await chooseSubject(rows[0].id, rows)
    } catch (cause) {
      setError(errorMessage(cause))
    }
  }

  async function chooseSubject(subjectId: string, knownSubjects = subjects) {
    setSubjects(knownSubjects)
    setSelectedSubjectId(subjectId)
    setSelectedModuleId('')
    setLectures([])
    setModuleForm(null)
    setLectureForm(null)
    setError(null)
    try {
      const rows = await listManagedModules(subjectId)
      setModules(rows)
      if (rows[0]) await chooseModule(rows[0].id, rows)
    } catch (cause) {
      setError(errorMessage(cause))
    }
  }

  async function chooseModule(moduleId: string, knownModules = modules) {
    setModules(knownModules)
    setSelectedModuleId(moduleId)
    setLectureForm(null)
    setError(null)
    try {
      setLectures(await listManagedLectures(moduleId))
    } catch (cause) {
      setError(errorMessage(cause))
    }
  }

  function newSubject() {
    setSubjectForm({ id: null, title: '', slug: '', code: '', description: '', status: 'draft', position: subjects.length })
    setModuleForm(null)
    setLectureForm(null)
  }

  function newModule() {
    if (!selectedSubject) return
    setModuleForm({ id: null, title: '', slug: '', description: '', status: 'draft', position: modules.length })
    setSubjectForm(null)
    setLectureForm(null)
  }

  function newLecture() {
    if (!selectedModule) return
    setLectureForm({
      id: null,
      title: '',
      slug: '',
      description: '',
      status: 'draft',
      deliveryMode: 'live',
      position: lectures.length,
      scheduledAt: '',
      durationMinutes: '',
      releaseAt: '',
      publishedAt: null,
    })
    setSubjectForm(null)
    setModuleForm(null)
  }

  async function saveSubject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!subjectForm || !selectedBatch) return
    setSaving(true)
    setError(null)
    setNotice(null)
    try {
      const input = {
        batchId: selectedBatch.id,
        title: subjectForm.title,
        slug: subjectForm.slug,
        code: subjectForm.code,
        description: subjectForm.description,
        status: subjectForm.status,
        position: subjectForm.position,
      }
      const saved = subjectForm.id
        ? await updateManagedSubject(subjectForm.id, input)
        : await createManagedSubject(input)
      const rows = await listManagedSubjects(selectedBatch.id)
      setSubjectForm(null)
      setNotice(subjectForm.id ? 'Subject updated.' : 'Subject created.')
      await chooseSubject(saved.id, rows)
    } catch (cause) {
      setError(errorMessage(cause))
    } finally {
      setSaving(false)
    }
  }

  async function saveModule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!moduleForm || !selectedSubject) return
    setSaving(true)
    setError(null)
    setNotice(null)
    try {
      const input = {
        subjectId: selectedSubject.id,
        title: moduleForm.title,
        slug: moduleForm.slug,
        description: moduleForm.description,
        status: moduleForm.status,
        position: moduleForm.position,
      }
      const saved = moduleForm.id
        ? await updateManagedModule(moduleForm.id, input)
        : await createManagedModule(input)
      const rows = await listManagedModules(selectedSubject.id)
      setModuleForm(null)
      setNotice(moduleForm.id ? 'Module updated.' : 'Module created.')
      await chooseModule(saved.id, rows)
    } catch (cause) {
      setError(errorMessage(cause))
    } finally {
      setSaving(false)
    }
  }

  async function saveLecture(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!lectureForm || !selectedModule) return
    setSaving(true)
    setError(null)
    setNotice(null)
    try {
      const input = {
        moduleId: selectedModule.id,
        title: lectureForm.title,
        slug: lectureForm.slug,
        description: lectureForm.description,
        status: lectureForm.status,
        deliveryMode: lectureForm.deliveryMode,
        position: lectureForm.position,
        scheduledAt: toIso(lectureForm.scheduledAt),
        durationMinutes: lectureForm.durationMinutes ? Number(lectureForm.durationMinutes) : null,
        releaseAt: toIso(lectureForm.releaseAt),
      }
      if (lectureForm.id) {
        await updateManagedLecture(lectureForm.id, input, lectureForm.publishedAt)
      } else {
        await createManagedLecture(input)
      }
      setLectures(await listManagedLectures(selectedModule.id))
      setNotice(lectureForm.id ? 'Lecture updated.' : 'Lecture created.')
      setLectureForm(null)
    } catch (cause) {
      setError(errorMessage(cause))
    } finally {
      setSaving(false)
    }
  }

  async function removeSubject() {
    if (!selectedSubject || !canDelete || !window.confirm(`Delete subject “${selectedSubject.title}”? It must have no modules.`)) return
    setSaving(true)
    try {
      await deleteManagedSubject(selectedSubject.id)
      const rows = await listManagedSubjects(selectedBatchId)
      setSubjects(rows)
      setSelectedSubjectId('')
      setModules([])
      setLectures([])
      setSubjectForm(null)
      setNotice('Subject deleted.')
      if (rows[0]) await chooseSubject(rows[0].id, rows)
    } catch (cause) {
      setError(errorMessage(cause))
    } finally {
      setSaving(false)
    }
  }

  async function removeModule() {
    if (!selectedModule || !canDelete || !window.confirm(`Delete module “${selectedModule.title}”? It must have no lectures.`)) return
    setSaving(true)
    try {
      await deleteManagedModule(selectedModule.id)
      const rows = await listManagedModules(selectedSubjectId)
      setModules(rows)
      setSelectedModuleId('')
      setLectures([])
      setModuleForm(null)
      setNotice('Module deleted.')
      if (rows[0]) await chooseModule(rows[0].id, rows)
    } catch (cause) {
      setError(errorMessage(cause))
    } finally {
      setSaving(false)
    }
  }

  async function removeLecture(lecture: ManagedLecture) {
    if (!canDelete || !window.confirm(`Delete lecture “${lecture.title}”?`)) return
    setSaving(true)
    try {
      await deleteManagedLecture(lecture.id)
      setLectures(await listManagedLectures(selectedModuleId))
      setLectureForm(null)
      setNotice('Lecture deleted.')
    } catch (cause) {
      setError(errorMessage(cause))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="admin-page content-admin-page">
      <div className="container admin-shell">
        <AdminSubnav active="content" />

        <header className="admin-page-heading">
          <div>
            <span className="eyebrow">Academic content workspace</span>
            <h1>Subjects, Modules & Lectures</h1>
            <p>Build the teaching structure inside each batch and control exactly what enrolled students can see.</p>
          </div>
        </header>

        {error && <div className="admin-alert admin-alert-error" role="alert">{error}</div>}
        {notice && <div className="admin-alert admin-alert-success" role="status">{notice}</div>}

        <div className="content-context-bar">
          <label className="form-field">
            <span>Course</span>
            <select value={selectedCourseId} onChange={(event) => void chooseCourse(event.target.value)} disabled={loading || courses.length === 0}>
              {courses.length === 0 && <option value="">No courses</option>}
              {courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}
            </select>
          </label>
          <label className="form-field">
            <span>Batch</span>
            <select value={selectedBatchId} onChange={(event) => void chooseBatch(event.target.value)} disabled={batches.length === 0}>
              {batches.length === 0 && <option value="">No batches</option>}
              {batches.map((batch) => <option key={batch.id} value={batch.id}>{batch.title}</option>)}
            </select>
          </label>
        </div>

        <div className="content-hierarchy-grid">
          <section className="admin-panel content-column">
            <div className="admin-panel-heading compact">
              <div><span>Level 1</span><h2>Subjects</h2></div>
              <button className="admin-icon-button" type="button" onClick={newSubject} disabled={!selectedBatch}>+</button>
            </div>
            {subjects.length === 0 && <p className="admin-empty">No subjects in this batch yet.</p>}
            <div className="content-item-list">
              {subjects.map((subject) => (
                <button key={subject.id} type="button" className={`content-item ${subject.id === selectedSubjectId ? 'is-selected' : ''}`} onClick={() => void chooseSubject(subject.id)}>
                  <span className={`admin-status admin-status-${subject.status}`}>{humanize(subject.status)}</span>
                  <strong>{subject.title}</strong>
                  <small>{subject.code || subject.slug}</small>
                </button>
              ))}
            </div>
            {selectedSubject && (
              <div className="content-column-actions">
                <button className="admin-text-button" type="button" onClick={() => setSubjectForm(subjectFormFrom(selectedSubject))}>Edit selected</button>
                {canDelete && <button className="admin-danger-button" type="button" onClick={() => void removeSubject()}>Delete</button>}
              </div>
            )}
          </section>

          <section className="admin-panel content-column">
            <div className="admin-panel-heading compact">
              <div><span>Level 2</span><h2>Modules</h2></div>
              <button className="admin-icon-button" type="button" onClick={newModule} disabled={!selectedSubject}>+</button>
            </div>
            {!selectedSubject && <p className="admin-empty">Select a subject first.</p>}
            {selectedSubject && modules.length === 0 && <p className="admin-empty">No modules in this subject yet.</p>}
            <div className="content-item-list">
              {modules.map((module) => (
                <button key={module.id} type="button" className={`content-item ${module.id === selectedModuleId ? 'is-selected' : ''}`} onClick={() => void chooseModule(module.id)}>
                  <span className={`admin-status admin-status-${module.status}`}>{humanize(module.status)}</span>
                  <strong>{module.title}</strong>
                  <small>{module.slug}</small>
                </button>
              ))}
            </div>
            {selectedModule && (
              <div className="content-column-actions">
                <button className="admin-text-button" type="button" onClick={() => setModuleForm(moduleFormFrom(selectedModule))}>Edit selected</button>
                {canDelete && <button className="admin-danger-button" type="button" onClick={() => void removeModule()}>Delete</button>}
              </div>
            )}
          </section>

          <section className="admin-panel content-column content-lecture-column">
            <div className="admin-panel-heading compact">
              <div><span>Level 3</span><h2>Lectures</h2></div>
              <button className="admin-icon-button" type="button" onClick={newLecture} disabled={!selectedModule}>+</button>
            </div>
            {!selectedModule && <p className="admin-empty">Select a module first.</p>}
            {selectedModule && lectures.length === 0 && <p className="admin-empty">No lectures in this module yet.</p>}
            <div className="lecture-admin-list">
              {lectures.map((lecture) => (
                <article className="lecture-admin-row" key={lecture.id}>
                  <div>
                    <span className={`admin-status admin-status-${lecture.status}`}>{humanize(lecture.status)}</span>
                    <strong>{lecture.title}</strong>
                    <small>{humanize(lecture.deliveryMode)}{lecture.scheduledAt ? ` · ${new Date(lecture.scheduledAt).toLocaleString()}` : ''}</small>
                  </div>
                  <div className="lecture-admin-actions">
                    <button className="admin-text-button" type="button" onClick={() => setLectureForm(lectureFormFrom(lecture))}>Edit</button>
                    {canDelete && <button className="admin-danger-button" type="button" onClick={() => void removeLecture(lecture)}>Delete</button>}
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>

        {subjectForm && (
          <form className="admin-panel content-editor-card admin-form" onSubmit={saveSubject}>
            <div className="admin-panel-heading"><div><span>Subject editor</span><h2>{subjectForm.id ? 'Edit subject' : 'New subject'}</h2></div><button className="admin-text-button" type="button" onClick={() => setSubjectForm(null)}>Cancel</button></div>
            <div className="admin-form-grid">
              <label className="form-field admin-field-wide"><span>Title</span><input required maxLength={160} value={subjectForm.title} onChange={(event) => setSubjectForm((current) => current && ({ ...current, title: event.target.value, slug: current.id || current.slug ? current.slug : slugify(event.target.value) }))} /></label>
              <label className="form-field"><span>Slug</span><input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={subjectForm.slug} onChange={(event) => setSubjectForm((current) => current && ({ ...current, slug: slugify(event.target.value) }))} /></label>
              <label className="form-field"><span>Code</span><input maxLength={64} value={subjectForm.code} onChange={(event) => setSubjectForm((current) => current && ({ ...current, code: event.target.value }))} /></label>
              <label className="form-field"><span>Status</span><select value={subjectForm.status} onChange={(event) => setSubjectForm((current) => current && ({ ...current, status: event.target.value as AcademicContentStatus }))}>{contentStatuses.map((status) => <option key={status} value={status}>{humanize(status)}</option>)}</select></label>
              <label className="form-field"><span>Position</span><input type="number" min={0} value={subjectForm.position} onChange={(event) => setSubjectForm((current) => current && ({ ...current, position: Number(event.target.value) }))} /></label>
              <label className="form-field admin-field-wide"><span>Description</span><textarea rows={4} value={subjectForm.description} onChange={(event) => setSubjectForm((current) => current && ({ ...current, description: event.target.value }))} /></label>
            </div>
            <button className="button" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save subject'}</button>
          </form>
        )}

        {moduleForm && (
          <form className="admin-panel content-editor-card admin-form" onSubmit={saveModule}>
            <div className="admin-panel-heading"><div><span>Module editor</span><h2>{moduleForm.id ? 'Edit module' : 'New module'}</h2></div><button className="admin-text-button" type="button" onClick={() => setModuleForm(null)}>Cancel</button></div>
            <div className="admin-form-grid">
              <label className="form-field admin-field-wide"><span>Title</span><input required maxLength={160} value={moduleForm.title} onChange={(event) => setModuleForm((current) => current && ({ ...current, title: event.target.value, slug: current.id || current.slug ? current.slug : slugify(event.target.value) }))} /></label>
              <label className="form-field"><span>Slug</span><input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={moduleForm.slug} onChange={(event) => setModuleForm((current) => current && ({ ...current, slug: slugify(event.target.value) }))} /></label>
              <label className="form-field"><span>Status</span><select value={moduleForm.status} onChange={(event) => setModuleForm((current) => current && ({ ...current, status: event.target.value as AcademicContentStatus }))}>{contentStatuses.map((status) => <option key={status} value={status}>{humanize(status)}</option>)}</select></label>
              <label className="form-field"><span>Position</span><input type="number" min={0} value={moduleForm.position} onChange={(event) => setModuleForm((current) => current && ({ ...current, position: Number(event.target.value) }))} /></label>
              <label className="form-field admin-field-wide"><span>Description</span><textarea rows={4} value={moduleForm.description} onChange={(event) => setModuleForm((current) => current && ({ ...current, description: event.target.value }))} /></label>
            </div>
            <button className="button" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save module'}</button>
          </form>
        )}

        {lectureForm && (
          <form className="admin-panel content-editor-card admin-form" onSubmit={saveLecture}>
            <div className="admin-panel-heading"><div><span>Lecture editor</span><h2>{lectureForm.id ? 'Edit lecture' : 'New lecture'}</h2></div><button className="admin-text-button" type="button" onClick={() => setLectureForm(null)}>Cancel</button></div>
            <div className="admin-form-grid">
              <label className="form-field admin-field-wide"><span>Title</span><input required maxLength={180} value={lectureForm.title} onChange={(event) => setLectureForm((current) => current && ({ ...current, title: event.target.value, slug: current.id || current.slug ? current.slug : slugify(event.target.value) }))} /></label>
              <label className="form-field"><span>Slug</span><input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={lectureForm.slug} onChange={(event) => setLectureForm((current) => current && ({ ...current, slug: slugify(event.target.value) }))} /></label>
              <label className="form-field"><span>Status</span><select value={lectureForm.status} onChange={(event) => setLectureForm((current) => current && ({ ...current, status: event.target.value as LectureStatus }))}>{lectureStatuses.map((status) => <option key={status} value={status}>{humanize(status)}</option>)}</select></label>
              <label className="form-field"><span>Delivery mode</span><select value={lectureForm.deliveryMode} onChange={(event) => setLectureForm((current) => current && ({ ...current, deliveryMode: event.target.value as LectureDeliveryMode }))}>{deliveryModes.map((mode) => <option key={mode} value={mode}>{humanize(mode)}</option>)}</select></label>
              <label className="form-field"><span>Position</span><input type="number" min={0} value={lectureForm.position} onChange={(event) => setLectureForm((current) => current && ({ ...current, position: Number(event.target.value) }))} /></label>
              <label className="form-field"><span>Duration (minutes)</span><input type="number" min={1} max={1440} value={lectureForm.durationMinutes} onChange={(event) => setLectureForm((current) => current && ({ ...current, durationMinutes: event.target.value }))} /></label>
              <label className="form-field"><span>Scheduled at</span><input type="datetime-local" value={lectureForm.scheduledAt} onChange={(event) => setLectureForm((current) => current && ({ ...current, scheduledAt: event.target.value }))} /></label>
              <label className="form-field"><span>Release at</span><input type="datetime-local" value={lectureForm.releaseAt} onChange={(event) => setLectureForm((current) => current && ({ ...current, releaseAt: event.target.value }))} /></label>
              <label className="form-field admin-field-wide"><span>Description</span><textarea rows={4} value={lectureForm.description} onChange={(event) => setLectureForm((current) => current && ({ ...current, description: event.target.value }))} /></label>
            </div>
            <p className="content-editor-note">Provider links are intentionally not stored here. Live/recording providers will attach through protected provider adapters later.</p>
            <button className="button" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save lecture'}</button>
          </form>
        )}
      </div>
    </section>
  )
}
