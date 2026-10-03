import { useEffect, useMemo, useState } from 'react'
import { BackLink } from '../../components/ui/BackLink'
import { listManagedBatches, listManagedCourses, type ManagedBatch, type ManagedCourse } from './academicAdminService'
import { AdminSubnav } from './AdminSubnav'
import { listManagedLectures, listManagedModules, listManagedSubjects, type ManagedLecture, type ManagedModule, type ManagedSubject } from './contentAdminService'
import { loadAttendanceRoster, saveLectureAttendance, type AttendanceRosterRow, type AttendanceStatus } from './attendanceService'

type EditableRow=AttendanceRosterRow&{draftStatus:AttendanceStatus|'';draftNote:string}
const statuses:AttendanceStatus[]=['present','absent','late','excused']
const humanize=(value:string)=>value.replaceAll('_',' ').replace(/\b\w/g,(letter)=>letter.toUpperCase())
const errorMessage=(error:unknown)=>error instanceof Error?error.message:'Something went wrong. Please try again.'

export function AttendanceManagementPage({teacherMode=false}:{teacherMode?:boolean}){
  const [courses,setCourses]=useState<ManagedCourse[]>([]);const [batches,setBatches]=useState<ManagedBatch[]>([])
  const [subjects,setSubjects]=useState<ManagedSubject[]>([]);const [modules,setModules]=useState<ManagedModule[]>([])
  const [lectures,setLectures]=useState<ManagedLecture[]>([]);const [rows,setRows]=useState<EditableRow[]>([])
  const [courseId,setCourseId]=useState('');const [batchId,setBatchId]=useState('');const [subjectId,setSubjectId]=useState('')
  const [moduleId,setModuleId]=useState('');const [lectureId,setLectureId]=useState('')
  const [loading,setLoading]=useState(true);const [saving,setSaving]=useState(false)
  const [error,setError]=useState<string|null>(null);const [notice,setNotice]=useState<string|null>(null)

  const selectedLecture=useMemo(()=>lectures.find((lecture)=>lecture.id===lectureId)??null,[lectures,lectureId])
  const counts=useMemo(()=>rows.reduce((acc,row)=>{if(row.draftStatus)acc[row.draftStatus]+=1;else acc.unmarked+=1;return acc},{present:0,absent:0,late:0,excused:0,unmarked:0}),[rows])

  async function loadRoster(id:string){
    setRows([])
    if(!id)return
    const roster=await loadAttendanceRoster(id)
    setRows(roster.map((row)=>({...row,draftStatus:row.status??'',draftNote:row.note})))
  }
  async function chooseLecture(id:string,known=lectures){setLectures(known);setLectureId(id);setError(null);setNotice(null);await loadRoster(id)}
  async function chooseModule(id:string,known=modules){setModules(known);setModuleId(id);setLectureId('');setRows([]);const data=await listManagedLectures(id);setLectures(data);if(data[0])await chooseLecture(data[0].id,data)}
  async function chooseSubject(id:string,known=subjects){setSubjects(known);setSubjectId(id);setModuleId('');setLectureId('');setLectures([]);setRows([]);const data=await listManagedModules(id);setModules(data);if(data[0])await chooseModule(data[0].id,data)}
  async function chooseBatch(id:string,known=batches){setBatches(known);setBatchId(id);setSubjectId('');setModuleId('');setLectureId('');setModules([]);setLectures([]);setRows([]);const data=await listManagedSubjects(id);setSubjects(data);if(data[0])await chooseSubject(data[0].id,data)}
  async function chooseCourse(id:string,known=courses){setCourses(known);setCourseId(id);setBatchId('');setSubjectId('');setModuleId('');setLectureId('');setSubjects([]);setModules([]);setLectures([]);setRows([]);const data=await listManagedBatches(id);setBatches(data);if(data[0])await chooseBatch(data[0].id,data)}

  useEffect(()=>{let active=true;void listManagedCourses().then(async(data)=>{if(!active)return;setCourses(data);if(data[0])await chooseCourse(data[0].id,data)}).catch((cause)=>active&&setError(errorMessage(cause))).finally(()=>active&&setLoading(false));return()=>{active=false}},[])

  function markAll(status:AttendanceStatus){setRows((current)=>current.map((row)=>({...row,draftStatus:status})))}
  function updateRow(enrollmentId:string,patch:Partial<Pick<EditableRow,'draftStatus'|'draftNote'>>){setRows((current)=>current.map((row)=>row.enrollmentId===enrollmentId?{...row,...patch}:row))}
  async function save(){
    if(!selectedLecture)return
    const marked=rows.filter((row):row is EditableRow&{draftStatus:AttendanceStatus}=>Boolean(row.draftStatus))
    if(!marked.length){setError('Mark at least one student before saving attendance.');return}
    setSaving(true);setError(null);setNotice(null)
    try{
      await saveLectureAttendance(selectedLecture.id,marked.map((row)=>({enrollmentId:row.enrollmentId,status:row.draftStatus,note:row.draftNote})))
      await loadRoster(selectedLecture.id)
      setNotice(`Attendance saved for ${marked.length} student${marked.length===1?'':'s'}.`)
    }catch(cause){setError(errorMessage(cause))}finally{setSaving(false)}
  }

  return <section className="admin-page attendance-admin-page"><div className="container admin-shell">
    {teacherMode?<div className="teacher-mode-nav"><BackLink to="/teacher">Teacher workspace</BackLink><span>Assignment-scoped access</span></div>:<AdminSubnav active="attendance"/>}
    <header className="admin-page-heading"><div><span className="eyebrow">Lecture operations</span><h1>Attendance</h1><p>Mark attendance against the enrolled roster for each lecture. Teachers only see lectures inside their assigned teaching scope.</p></div></header>
    {error&&<div className="admin-alert admin-alert-error" role="alert">{error}</div>}{notice&&<div className="admin-alert admin-alert-success" role="status">{notice}</div>}
    <div className="attendance-context-grid">
      <label className="form-field"><span>Course</span><select value={courseId} disabled={loading||!courses.length} onChange={(e)=>void chooseCourse(e.target.value)}>{courses.map((c)=><option value={c.id} key={c.id}>{c.title}</option>)}</select></label>
      <label className="form-field"><span>Batch</span><select value={batchId} disabled={!batches.length} onChange={(e)=>void chooseBatch(e.target.value)}>{batches.map((b)=><option value={b.id} key={b.id}>{b.title}</option>)}</select></label>
      <label className="form-field"><span>Subject</span><select value={subjectId} disabled={!subjects.length} onChange={(e)=>void chooseSubject(e.target.value)}>{subjects.map((s)=><option value={s.id} key={s.id}>{s.title}</option>)}</select></label>
      <label className="form-field"><span>Module</span><select value={moduleId} disabled={!modules.length} onChange={(e)=>void chooseModule(e.target.value)}>{modules.map((m)=><option value={m.id} key={m.id}>{m.title}</option>)}</select></label>
      <label className="form-field attendance-lecture-field"><span>Lecture</span><select value={lectureId} disabled={!lectures.length} onChange={(e)=>void chooseLecture(e.target.value)}>{lectures.map((l)=><option value={l.id} key={l.id}>{l.title}</option>)}</select></label>
    </div>

    {selectedLecture&&<section className="admin-panel attendance-summary"><div><span className="eyebrow">Selected lecture</span><h2>{selectedLecture.title}</h2><p>{selectedLecture.scheduledAt?new Date(selectedLecture.scheduledAt).toLocaleString():'No scheduled time'}{selectedLecture.durationMinutes?` · ${selectedLecture.durationMinutes} min`:''}</p></div><div className="attendance-counts"><span><strong>{counts.present}</strong> Present</span><span><strong>{counts.late}</strong> Late</span><span><strong>{counts.absent}</strong> Absent</span><span><strong>{counts.excused}</strong> Excused</span><span><strong>{counts.unmarked}</strong> Unmarked</span></div></section>}

    <section className="admin-panel attendance-roster-panel">
      <div className="admin-panel-heading compact"><div><span>Enrolled roster</span><h2>{rows.length} students</h2></div><div className="attendance-bulk-actions"><button className="admin-text-button" type="button" disabled={!rows.length} onClick={()=>markAll('present')}>Mark all present</button><button className="button button-small" type="button" disabled={saving||!rows.length} onClick={()=>void save()}>{saving?'Saving…':'Save attendance'}</button></div></div>
      {!selectedLecture&&<p className="admin-empty">Select a lecture to load its attendance roster.</p>}
      {selectedLecture&&!rows.length&&<p className="admin-empty">No eligible enrolled students were found for this lecture.</p>}
      <div className="attendance-roster">{rows.map((row)=><article className="attendance-row" key={row.enrollmentId}><div className="attendance-student"><strong>{row.fullName||row.email||'Student'}</strong><small>{row.email}</small>{row.markedAt&&<span>Last marked {new Date(row.markedAt).toLocaleString()}</span>}</div><label className="form-field"><span>Status</span><select value={row.draftStatus} onChange={(e)=>updateRow(row.enrollmentId,{draftStatus:e.target.value as AttendanceStatus|''})}><option value="">Not marked</option>{statuses.map((status)=><option value={status} key={status}>{humanize(status)}</option>)}</select></label><label className="form-field attendance-note"><span>Note</span><input maxLength={500} placeholder="Optional note" value={row.draftNote} onChange={(e)=>updateRow(row.enrollmentId,{draftNote:e.target.value})}/></label></article>)}</div>
    </section>
  </div></section>
}
