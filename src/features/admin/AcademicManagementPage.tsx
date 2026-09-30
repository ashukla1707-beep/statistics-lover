import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { useAuth } from '../auth'
import {
  createManagedBatch,
  createManagedCourse,
  deleteManagedBatch,
  deleteManagedCourse,
  listManagedBatches,
  listManagedCourses,
  updateManagedBatch,
  updateManagedCourse,
  type BatchStatus,
  type CourseStatus,
  type ManagedBatch,
  type ManagedCourse,
} from './academicAdminService'

const courseStatuses: CourseStatus[] = ['draft', 'published', 'archived']
const batchStatuses: BatchStatus[] = ['draft', 'scheduled', 'active', 'completed', 'archived']

type CourseFormState = {
  id: string | null
  title: string
  slug: string
  code: string
  shortDescription: string
  description: string
  status: CourseStatus
  publishedAt: string | null
}

type BatchFormState = {
  id: string | null
  title: string
  slug: string
  code: string
  description: string
  status: BatchStatus
  startsOn: string
  endsOn: string
}

const emptyCourseForm: CourseFormState = {
  id: null,
  title: '',
  slug: '',
  code: '',
  shortDescription: '',
  description: '',
  status: 'draft',
  publishedAt: null,
}

const emptyBatchForm: BatchFormState = {
  id: null,
  title: '',
  slug: '',
  code: '',
  description: '',
  status: 'draft',
  startsOn: '',
  endsOn: '',
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function humanize(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error && 'message' in error && typeof error.message === 'string') {
    return error.message
  }
  return 'Something went wrong. Please try again.'
}

function courseToForm(course: ManagedCourse): CourseFormState {
  return {
    id: course.id,
    title: course.title,
    slug: course.slug,
    code: course.code ?? '',
    shortDescription: course.shortDescription ?? '',
    description: course.description ?? '',
    status: course.status,
    publishedAt: course.publishedAt,
  }
}

function batchToForm(batch: ManagedBatch): BatchFormState {
  return {
    id: batch.id,
    title: batch.title,
    slug: batch.slug,
    code: batch.code ?? '',
    description: batch.description ?? '',
    status: batch.status,
    startsOn: batch.startsOn ?? '',
    endsOn: batch.endsOn ?? '',
  }
}

export function AcademicManagementPage() {
  const { identity } = useAuth()
  const canDelete = identity?.roles.some((role) => role === 'admin' || role === 'owner') ?? false

  const [courses, setCourses] = useState<ManagedCourse[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null)
  const [batches, setBatches] = useState<ManagedBatch[]>([])
  const [courseForm, setCourseForm] = useState<CourseFormState | null>(null)
  const [batchForm, setBatchForm] = useState<BatchFormState | null>(null)
  const [loading, setLoading] = useState(true)
  const [batchesLoading, setBatchesLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [pageError, setPageError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const selectedCourse = useMemo(
    () => courses.find((course) => course.id === selectedCourseId) ?? null,
    [courses, selectedCourseId],
  )

  const refreshCourses = useCallback(async (preferredCourseId?: string | null) => {
    try {
      const rows = await listManagedCourses()
      setCourses(rows)
      setSelectedCourseId((current) => {
        const preferred = preferredCourseId && rows.some((course) => course.id === preferredCourseId)
          ? preferredCourseId
          : null
        if (preferred) return preferred
        if (current && rows.some((course) => course.id === current)) return current
        return rows[0]?.id ?? null
      })
      setPageError(null)
    } catch (error) {
      setPageError(errorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refreshCourses()
  }, [refreshCourses])

  useEffect(() => {
    if (!selectedCourseId) return

    let active = true
    void listManagedBatches(selectedCourseId)
      .then((rows) => {
        if (active) {
          setBatches(rows)
          setPageError(null)
        }
      })
      .catch((error) => {
        if (active) setPageError(errorMessage(error))
      })
      .finally(() => {
        if (active) setBatchesLoading(false)
      })

    return () => {
      active = false
    }
  }, [selectedCourseId])

  function selectCourse(courseId: string) {
    setSelectedCourseId(courseId)
    setBatches([])
    setBatchesLoading(true)
    setBatchForm(null)
    setCourseForm(null)
    setNotice(null)
  }

  function startNewCourse() {
    setCourseForm({ ...emptyCourseForm })
    setNotice(null)
  }

  function startEditCourse(course: ManagedCourse) {
    setCourseForm(courseToForm(course))
    setNotice(null)
  }

  function startNewBatch() {
    if (!selectedCourse) return
    setBatchForm({ ...emptyBatchForm })
    setNotice(null)
  }

  function startEditBatch(batch: ManagedBatch) {
    setBatchForm(batchToForm(batch))
    setNotice(null)
  }

  async function saveCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!courseForm) return

    const title = courseForm.title.trim()
    const slug = courseForm.slug.trim()
    if (title.length < 2 || slug.length < 2) {
      setPageError('Course title and slug must each contain at least 2 characters.')
      return
    }

    setSaving(true)
    setPageError(null)
    setNotice(null)

    try {
      const input = {
        title,
        slug,
        code: courseForm.code,
        shortDescription: courseForm.shortDescription,
        description: courseForm.description,
        status: courseForm.status,
      }
      const wasEdit = Boolean(courseForm.id)
      const saved = courseForm.id
        ? await updateManagedCourse(courseForm.id, input, courseForm.publishedAt)
        : await createManagedCourse(input)

      setCourseForm(null)
      setBatchesLoading(true)
      setNotice(wasEdit ? 'Course updated.' : 'Course created.')
      await refreshCourses(saved.id)
    } catch (error) {
      setPageError(errorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  async function saveBatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!batchForm || !selectedCourse) return

    const title = batchForm.title.trim()
    const slug = batchForm.slug.trim()
    if (title.length < 2 || slug.length < 2) {
      setPageError('Batch title and slug must each contain at least 2 characters.')
      return
    }
    if (batchForm.startsOn && batchForm.endsOn && batchForm.startsOn > batchForm.endsOn) {
      setPageError('Batch end date cannot be earlier than the start date.')
      return
    }

    setSaving(true)
    setPageError(null)
    setNotice(null)

    try {
      const input = {
        courseId: selectedCourse.id,
        title,
        slug,
        code: batchForm.code,
        description: batchForm.description,
        status: batchForm.status,
        startsOn: batchForm.startsOn,
        endsOn: batchForm.endsOn,
      }
      const wasEdit = Boolean(batchForm.id)

      if (batchForm.id) {
        await updateManagedBatch(batchForm.id, input)
      } else {
        await createManagedBatch(input)
      }

      setBatchForm(null)
      setBatches(await listManagedBatches(selectedCourse.id))
      setNotice(wasEdit ? 'Batch updated.' : 'Batch created.')
    } catch (error) {
      setPageError(errorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  async function removeCourse(course: ManagedCourse) {
    if (!canDelete || !window.confirm(`Delete course “${course.title}”? This only works when no batch depends on it.`)) return

    setSaving(true)
    setPageError(null)
    try {
      await deleteManagedCourse(course.id)
      setNotice('Course deleted.')
      setCourseForm(null)
      setBatchForm(null)
      setBatches([])
      await refreshCourses(null)
    } catch (error) {
      setPageError(errorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  async function removeBatch(batch: ManagedBatch) {
    if (!canDelete || !selectedCourse || !window.confirm(`Delete batch “${batch.title}”? This only works when no enrollment depends on it.`)) return

    setSaving(true)
    setPageError(null)
    try {
      await deleteManagedBatch(batch.id)
      setBatches(await listManagedBatches(selectedCourse.id))
      setBatchForm(null)
      setNotice('Batch deleted.')
    } catch (error) {
      setPageError(errorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="admin-page">
      <div className="container admin-shell">
        <header className="admin-page-heading">
          <div>
            <span className="eyebrow">Owner & staff workspace</span>
            <h1>Courses & Batches</h1>
            <p>Create the academic catalog, control publishing states, and manage delivery batches from one place.</p>
          </div>
          <button className="button" type="button" onClick={startNewCourse}>+ New course</button>
        </header>

        {pageError && <div className="admin-alert admin-alert-error" role="alert">{pageError}</div>}
        {notice && <div className="admin-alert admin-alert-success" role="status">{notice}</div>}

        <div className="admin-metrics" aria-label="Academic summary">
          <article><strong>{courses.length}</strong><span>Total courses</span></article>
          <article><strong>{courses.filter((course) => course.status === 'published').length}</strong><span>Published</span></article>
          <article><strong>{batches.length}</strong><span>Batches in selected course</span></article>
        </div>

        <div className="admin-workspace">
          <aside className="admin-panel admin-course-panel">
            <div className="admin-panel-heading">
              <div>
                <span>Catalog</span>
                <h2>Courses</h2>
              </div>
              <button className="admin-icon-button" type="button" onClick={startNewCourse} aria-label="Create course">+</button>
            </div>

            {loading && <p className="admin-empty">Loading courses…</p>}
            {!loading && courses.length === 0 && (
              <div className="admin-empty-state">
                <strong>No courses yet</strong>
                <p>Create your first course. It will start as a draft unless you publish it.</p>
                <button className="button button-small" type="button" onClick={startNewCourse}>Create first course</button>
              </div>
            )}

            <div className="admin-course-list">
              {courses.map((course) => (
                <button
                  className={`admin-course-row ${selectedCourseId === course.id ? 'is-selected' : ''}`}
                  type="button"
                  key={course.id}
                  onClick={() => selectCourse(course.id)}
                >
                  <span className={`admin-status admin-status-${course.status}`}>{humanize(course.status)}</span>
                  <strong>{course.title}</strong>
                  <small>{course.code || course.slug}</small>
                </button>
              ))}
            </div>
          </aside>

          <main className="admin-panel admin-detail-panel">
            {courseForm ? (
              <form className="admin-form" onSubmit={saveCourse}>
                <div className="admin-panel-heading">
                  <div>
                    <span>Course editor</span>
                    <h2>{courseForm.id ? 'Edit course' : 'New course'}</h2>
                  </div>
                  <button className="admin-text-button" type="button" onClick={() => setCourseForm(null)}>Cancel</button>
                </div>

                <div className="admin-form-grid">
                  <label className="form-field admin-field-wide">
                    <span>Course title</span>
                    <input
                      value={courseForm.title}
                      onChange={(event) => setCourseForm((current) => current && ({
                        ...current,
                        title: event.target.value,
                        slug: current.id || current.slug ? current.slug : slugify(event.target.value),
                      }))}
                      required
                      maxLength={160}
                    />
                  </label>
                  <label className="form-field">
                    <span>Slug</span>
                    <input
                      value={courseForm.slug}
                      onChange={(event) => setCourseForm((current) => current && ({ ...current, slug: slugify(event.target.value) }))}
                      placeholder="bsc-statistics"
                      pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                      required
                    />
                  </label>
                  <label className="form-field">
                    <span>Course code</span>
                    <input value={courseForm.code} onChange={(event) => setCourseForm((current) => current && ({ ...current, code: event.target.value }))} maxLength={64} />
                  </label>
                  <label className="form-field">
                    <span>Status</span>
                    <select value={courseForm.status} onChange={(event) => setCourseForm((current) => current && ({ ...current, status: event.target.value as CourseStatus }))}>
                      {courseStatuses.map((status) => <option key={status} value={status}>{humanize(status)}</option>)}
                    </select>
                  </label>
                  <label className="form-field admin-field-wide">
                    <span>Short description</span>
                    <input value={courseForm.shortDescription} onChange={(event) => setCourseForm((current) => current && ({ ...current, shortDescription: event.target.value }))} maxLength={320} />
                  </label>
                  <label className="form-field admin-field-wide">
                    <span>Description</span>
                    <textarea rows={5} value={courseForm.description} onChange={(event) => setCourseForm((current) => current && ({ ...current, description: event.target.value }))} />
                  </label>
                </div>

                <div className="admin-form-actions">
                  <button className="button" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save course'}</button>
                  {courseForm.id && canDelete && (
                    <button
                      className="admin-danger-button"
                      type="button"
                      disabled={saving}
                      onClick={() => {
                        const course = courses.find((item) => item.id === courseForm.id)
                        if (course) void removeCourse(course)
                      }}
                    >
                      Delete course
                    </button>
                  )}
                </div>
              </form>
            ) : selectedCourse ? (
              <>
                <div className="admin-course-summary">
                  <div>
                    <span className={`admin-status admin-status-${selectedCourse.status}`}>{humanize(selectedCourse.status)}</span>
                    <h2>{selectedCourse.title}</h2>
                    <p>{selectedCourse.shortDescription || 'No short description added yet.'}</p>
                  </div>
                  <button className="button button-secondary button-small" type="button" onClick={() => startEditCourse(selectedCourse)}>Edit course</button>
                </div>

                <div className="admin-batch-heading">
                  <div>
                    <span>Delivery</span>
                    <h3>Batches</h3>
                  </div>
                  <button className="button button-small" type="button" onClick={startNewBatch}>+ New batch</button>
                </div>

                {batchForm && (
                  <form className="admin-form admin-batch-form" onSubmit={saveBatch}>
                    <div className="admin-form-subheading">
                      <strong>{batchForm.id ? 'Edit batch' : 'New batch'}</strong>
                      <button className="admin-text-button" type="button" onClick={() => setBatchForm(null)}>Cancel</button>
                    </div>
                    <div className="admin-form-grid">
                      <label className="form-field admin-field-wide">
                        <span>Batch title</span>
                        <input
                          value={batchForm.title}
                          onChange={(event) => setBatchForm((current) => current && ({
                            ...current,
                            title: event.target.value,
                            slug: current.id || current.slug ? current.slug : slugify(event.target.value),
                          }))}
                          required
                          maxLength={160}
                        />
                      </label>
                      <label className="form-field">
                        <span>Slug</span>
                        <input value={batchForm.slug} onChange={(event) => setBatchForm((current) => current && ({ ...current, slug: slugify(event.target.value) }))} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required />
                      </label>
                      <label className="form-field">
                        <span>Batch code</span>
                        <input value={batchForm.code} onChange={(event) => setBatchForm((current) => current && ({ ...current, code: event.target.value }))} maxLength={64} />
                      </label>
                      <label className="form-field">
                        <span>Status</span>
                        <select value={batchForm.status} onChange={(event) => setBatchForm((current) => current && ({ ...current, status: event.target.value as BatchStatus }))}>
                          {batchStatuses.map((status) => <option key={status} value={status}>{humanize(status)}</option>)}
                        </select>
                      </label>
                      <label className="form-field">
                        <span>Starts on</span>
                        <input type="date" value={batchForm.startsOn} onChange={(event) => setBatchForm((current) => current && ({ ...current, startsOn: event.target.value }))} />
                      </label>
                      <label className="form-field">
                        <span>Ends on</span>
                        <input type="date" value={batchForm.endsOn} onChange={(event) => setBatchForm((current) => current && ({ ...current, endsOn: event.target.value }))} />
                      </label>
                      <label className="form-field admin-field-wide">
                        <span>Description</span>
                        <textarea rows={4} value={batchForm.description} onChange={(event) => setBatchForm((current) => current && ({ ...current, description: event.target.value }))} />
                      </label>
                    </div>
                    <div className="admin-form-actions">
                      <button className="button" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save batch'}</button>
                      {batchForm.id && canDelete && (
                        <button
                          className="admin-danger-button"
                          type="button"
                          disabled={saving}
                          onClick={() => {
                            const batch = batches.find((item) => item.id === batchForm.id)
                            if (batch) void removeBatch(batch)
                          }}
                        >
                          Delete batch
                        </button>
                      )}
                    </div>
                  </form>
                )}

                {batchesLoading && <p className="admin-empty">Loading batches…</p>}
                {!batchesLoading && batches.length === 0 && !batchForm && (
                  <div className="admin-empty-state admin-empty-state-inline">
                    <strong>No batches in this course</strong>
                    <p>Create a batch when this course is ready for a student cohort.</p>
                  </div>
                )}

                <div className="admin-batch-list">
                  {batches.map((batch) => (
                    <article className="admin-batch-card" key={batch.id}>
                      <div>
                        <span className={`admin-status admin-status-${batch.status}`}>{humanize(batch.status)}</span>
                        <h4>{batch.title}</h4>
                        <p>{batch.code || batch.slug}</p>
                        {(batch.startsOn || batch.endsOn) && (
                          <small>{batch.startsOn || 'Start TBD'} → {batch.endsOn || 'End TBD'}</small>
                        )}
                      </div>
                      <button className="admin-text-button" type="button" onClick={() => startEditBatch(batch)}>Edit</button>
                    </article>
                  ))}
                </div>
              </>
            ) : (
              <div className="admin-empty-state admin-detail-empty">
                <strong>Create a course to begin</strong>
                <p>Courses contain one or more delivery batches. Draft content stays hidden from students.</p>
              </div>
            )}
          </main>
        </div>
      </div>
    </section>
  )
}
