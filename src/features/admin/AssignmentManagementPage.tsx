import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { BackLink } from '../../components/ui/BackLink'
import { useAuth } from '../auth'
import { listManagedBatches, listManagedCourses, type ManagedBatch, type ManagedCourse } from './academicAdminService'
import { AdminSubnav } from './AdminSubnav'
import { CollectionPager,CollectionToolbar,useCollectionPagination } from './CollectionControls'
import { listManagedLectures, listManagedModules, listManagedSubjects, type ManagedLecture, type ManagedModule, type ManagedSubject } from './contentAdminService'
import {
  createSubmissionSignedUrl,
  deleteManagedAssignment,
  gradeAssignmentSubmission,
  listAssignmentSubmissions,
  listManagedAssignments,
  saveManagedAssignment,
  type AssignmentStatus,
  type AssignmentSubmission,
  type ManagedAssignment,
} from './assignmentService'
import type { LearningResourceScope } from './resourceAdminService'

type FormState={
  id:string|null;batchId:string;scope:LearningResourceScope;subjectId:string|null;moduleId:string|null;lectureId:string|null
  title:string;instructions:string;status:AssignmentStatus;releaseAt:string;dueAt:string;allowLate:boolean;maxScore:string;position:number
}
type GradeDraft={status:'graded'|'returned';score:string;feedback:string}

const scopes:LearningResourceScope[]=['batch','subject','module','lecture']
const statuses:AssignmentStatus[]=['draft','published','archived']
const humanize=(v:string)=>v.replaceAll('_',' ').replace(/\b\w/g,(l)=>l.toUpperCase())
const toLocal=(value:string|null)=>{if(!value)return'';const d=new Date(value);return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16)}
const errorMessage=(e:unknown)=>e instanceof Error?e.message:'Something went wrong.'

function toForm(a:ManagedAssignment):FormState{
  return{id:a.id,batchId:a.batchId,scope:a.scope,subjectId:a.subjectId,moduleId:a.moduleId,lectureId:a.lectureId,title:a.title,
    instructions:a.instructions??'',status:a.status,releaseAt:toLocal(a.releaseAt),dueAt:toLocal(a.dueAt),allowLate:a.allowLate,
    maxScore:a.maxScore?.toString()??'',position:a.position}
}

export function AssignmentManagementPage({teacherMode=false}:{teacherMode?:boolean}){
  const {identity}=useAuth()
  const canDelete=identity?.roles.some((r)=>r==='admin'||r==='owner')??false
  const [courses,setCourses]=useState<ManagedCourse[]>([]),[batches,setBatches]=useState<ManagedBatch[]>([])
  const [subjects,setSubjects]=useState<ManagedSubject[]>([]),[modules,setModules]=useState<ManagedModule[]>([])
  const [lectures,setLectures]=useState<ManagedLecture[]>([]),[assignments,setAssignments]=useState<ManagedAssignment[]>([])
  const [courseId,setCourseId]=useState(''),[batchId,setBatchId]=useState(''),[subjectId,setSubjectId]=useState('')
  const [moduleId,setModuleId]=useState(''),[lectureId,setLectureId]=useState(''),[scope,setScope]=useState<LearningResourceScope>('lecture')
  const [assignmentQuery,setAssignmentQuery]=useState(''),[assignmentStatusFilter,setAssignmentStatusFilter]=useState<'all'|AssignmentStatus>('all')
  const [form,setForm]=useState<FormState|null>(null),[selectedId,setSelectedId]=useState<string|null>(null)
  const [submissions,setSubmissions]=useState<AssignmentSubmission[]>([]),[grades,setGrades]=useState<Record<string,GradeDraft>>({})
  const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState<string|null>(null),[notice,setNotice]=useState<string|null>(null)

  const visible=useMemo(()=>{const query=assignmentQuery.trim().toLowerCase();return assignments.filter((a)=>a.scope===scope&&(scope==='batch'||(scope==='subject'&&a.subjectId===subjectId)||(scope==='module'&&a.moduleId===moduleId)||(scope==='lecture'&&a.lectureId===lectureId))&&(assignmentStatusFilter==='all'||a.status===assignmentStatusFilter)&&(!query||[a.title,a.instructions??'',a.status].some((value)=>value.toLowerCase().includes(query))))},[assignments,scope,subjectId,moduleId,lectureId,assignmentQuery,assignmentStatusFilter])
  const assignmentPager=useCollectionPagination(visible,20,`${batchId}|${scope}|${subjectId}|${moduleId}|${lectureId}|${assignmentQuery}|${assignmentStatusFilter}`)
  const targetReady=scope==='batch'||(scope==='subject'&&!!subjectId)||(scope==='module'&&!!moduleId)||(scope==='lecture'&&!!lectureId)
  const selected=assignments.find((a)=>a.id===selectedId)??null

  async function refresh(id=batchId){setAssignments(id?await listManagedAssignments(id):[])}
  async function chooseLecture(id:string,known=lectures){setLectures(known);setLectureId(id);setForm(null);setSelectedId(null);setSubmissions([])}
  async function chooseModule(id:string,known=modules){setModules(known);setModuleId(id);setLectureId('');setForm(null);setSelectedId(null);setSubmissions([]);if(!id){setLectures([]);return}const rows=await listManagedLectures(id);setLectures(rows);if(rows[0])await chooseLecture(rows[0].id,rows)}
  async function chooseSubject(id:string,known=subjects){setSubjects(known);setSubjectId(id);setModuleId('');setLectureId('');setLectures([]);setForm(null);setSelectedId(null);setSubmissions([]);if(!id){setModules([]);return}const rows=await listManagedModules(id);setModules(rows);if(rows[0])await chooseModule(rows[0].id,rows)}
  async function chooseBatch(id:string,known=batches){setBatches(known);setBatchId(id);setSubjectId('');setModuleId('');setLectureId('');setModules([]);setLectures([]);setForm(null);setSelectedId(null);setSubmissions([]);if(!id){setSubjects([]);setAssignments([]);return}const [s,a]=await Promise.all([listManagedSubjects(id),listManagedAssignments(id)]);setSubjects(s);setAssignments(a);if(s[0])await chooseSubject(s[0].id,s)}
  async function chooseCourse(id:string,known=courses){setCourses(known);setCourseId(id);setBatchId('');setSubjectId('');setModuleId('');setLectureId('');setSubjects([]);setModules([]);setLectures([]);setAssignments([]);if(!id){setBatches([]);return}const rows=await listManagedBatches(id);setBatches(rows);if(rows[0])await chooseBatch(rows[0].id,rows)}

  useEffect(()=>{let active=true;void listManagedCourses().then(async(rows)=>{if(!active)return;setCourses(rows);if(rows[0])await chooseCourse(rows[0].id,rows)}).catch((e)=>active&&setError(errorMessage(e))).finally(()=>active&&setLoading(false));return()=>{active=false}},[])

  function newAssignment(){
    if(!batchId||!targetReady)return
    setForm({id:null,batchId,scope,subjectId:scope==='subject'?subjectId:null,moduleId:scope==='module'?moduleId:null,lectureId:scope==='lecture'?lectureId:null,
      title:'',instructions:'',status:'draft',releaseAt:'',dueAt:'',allowLate:false,maxScore:'100',position:visible.length})
  }

  async function saveAssignment(e:FormEvent){e.preventDefault();if(!form)return;setSaving(true);setError(null)
    try{
      if(form.releaseAt&&form.dueAt&&new Date(form.releaseAt)>new Date(form.dueAt)) throw new Error('Due date must be after release date.')
      await saveManagedAssignment({id:form.id,batchId:form.batchId,scope:form.scope,subjectId:form.subjectId,moduleId:form.moduleId,lectureId:form.lectureId,
        title:form.title,instructions:form.instructions,status:form.status,releaseAt:form.releaseAt?new Date(form.releaseAt).toISOString():null,
        dueAt:form.dueAt?new Date(form.dueAt).toISOString():null,allowLate:form.allowLate,maxScore:form.maxScore?Number(form.maxScore):null,position:form.position})
      await refresh(form.batchId);setForm(null);setNotice('Assignment saved.')
    }catch(e){setError(errorMessage(e))}finally{setSaving(false)}
  }

  async function openSubmissions(a:ManagedAssignment){
    setSelectedId(a.id);setError(null)
    try{
      const rows=await listAssignmentSubmissions(a.id);setSubmissions(rows)
      setGrades(Object.fromEntries(rows.map((s)=>[s.id,{status:(s.status==='returned'?'returned':'graded') as 'graded'|'returned',score:s.score?.toString()??'',feedback:s.feedback??''}])))
    }catch(e){setError(errorMessage(e))}
  }

  async function saveGrade(s:AssignmentSubmission){
    const draft=grades[s.id];if(!draft)return;setSaving(true);setError(null)
    try{
      const score=draft.score===''?null:Number(draft.score)
      if(selected?.maxScore!=null&&score!==null&&score>selected.maxScore) throw new Error(`Score cannot exceed ${selected.maxScore}.`)
      await gradeAssignmentSubmission({submissionId:s.id,status:draft.status,score,feedback:draft.feedback})
      if(selected) await openSubmissions(selected);setNotice('Submission updated.')
    }catch(e){setError(errorMessage(e))}finally{setSaving(false)}
  }

  async function openAttachment(path:string){
    try{window.open(await createSubmissionSignedUrl(path),'_blank','noopener,noreferrer')}catch(e){setError(errorMessage(e))}
  }

  async function remove(a:ManagedAssignment){
    if(!canDelete||!window.confirm(`Delete “${a.title}” and its submissions?`))return
    setSaving(true);try{await deleteManagedAssignment(a.id);await refresh(a.batchId);setSelectedId(null);setSubmissions([]);setNotice('Assignment deleted.')}catch(e){setError(errorMessage(e))}finally{setSaving(false)}
  }

  return <section className="admin-page assignment-admin-page"><div className="container admin-shell">
    {teacherMode?<div className="teacher-mode-nav"><BackLink to="/teacher">Teacher workspace</BackLink><span>Assignment-scoped access</span></div>:<AdminSubnav active="assignments"/>}
    <header className="admin-page-heading"><div><span className="eyebrow">Teaching workflow</span><h1>Assignments & Submissions</h1><p>Publish work, set due dates, review private student submissions and return grades or feedback.</p></div></header>
    {error&&<div className="admin-alert admin-alert-error">{error}</div>}{notice&&<div className="admin-alert admin-alert-success">{notice}</div>}
    <div className="assignment-context-grid">
      <label className="form-field"><span>Course</span><select value={courseId} disabled={loading||!courses.length} onChange={(e)=>void chooseCourse(e.target.value)}>{courses.map((c)=><option key={c.id} value={c.id}>{c.title}</option>)}</select></label>
      <label className="form-field"><span>Batch</span><select value={batchId} disabled={!batches.length} onChange={(e)=>void chooseBatch(e.target.value)}>{batches.map((b)=><option key={b.id} value={b.id}>{b.title}</option>)}</select></label>
      <label className="form-field"><span>Attach to</span><select value={scope} onChange={(e)=>{setScope(e.target.value as LearningResourceScope);setForm(null);setSelectedId(null)}}>{scopes.map((s)=><option key={s} value={s}>{humanize(s)}</option>)}</select></label>
      {scope!=='batch'&&<label className="form-field"><span>Subject</span><select value={subjectId} disabled={!subjects.length} onChange={(e)=>void chooseSubject(e.target.value)}>{subjects.map((s)=><option key={s.id} value={s.id}>{s.title}</option>)}</select></label>}
      {(scope==='module'||scope==='lecture')&&<label className="form-field"><span>Module</span><select value={moduleId} disabled={!modules.length} onChange={(e)=>void chooseModule(e.target.value)}>{modules.map((m)=><option key={m.id} value={m.id}>{m.title}</option>)}</select></label>}
      {scope==='lecture'&&<label className="form-field"><span>Lecture</span><select value={lectureId} disabled={!lectures.length} onChange={(e)=>void chooseLecture(e.target.value)}>{lectures.map((l)=><option key={l.id} value={l.id}>{l.title}</option>)}</select></label>}
    </div>

    <section className="admin-panel assignment-list-panel"><div className="admin-panel-heading compact"><div><span>{humanize(scope)} assignments</span><h2>Published work</h2></div><button className="admin-icon-button" type="button" disabled={!targetReady} onClick={newAssignment}>+</button></div>
      {targetReady&&<CollectionToolbar query={assignmentQuery} onQueryChange={setAssignmentQuery} placeholder="Search assignments" shown={visible.length} total={assignments.filter((a)=>a.scope===scope).length}><select aria-label="Assignment status" value={assignmentStatusFilter} onChange={(e)=>setAssignmentStatusFilter(e.target.value as 'all'|AssignmentStatus)}><option value="all">All statuses</option>{statuses.map((status)=><option key={status} value={status}>{humanize(status)}</option>)}</select></CollectionToolbar>}
      {!targetReady&&<p className="admin-empty">Select the target academic level first.</p>}{targetReady&&!visible.length&&<p className="admin-empty">No assignments attached here yet.</p>}
      <div className="assignment-admin-list">{assignmentPager.pageItems.map((a)=><article key={a.id} className={`assignment-admin-row ${selectedId===a.id?'is-selected':''}`}><div><span className={`admin-status admin-status-${a.status}`}>{humanize(a.status)}</span><strong>{a.title}</strong><small>{a.dueAt?`Due ${new Date(a.dueAt).toLocaleString()}`:'No due date'}{a.maxScore!==null?` · ${a.maxScore} points`:''}{a.allowLate?' · Late allowed':''}</small></div><div className="lecture-admin-actions"><button className="admin-text-button" onClick={()=>setForm(toForm(a))}>Edit</button><button className="admin-text-button" onClick={()=>void openSubmissions(a)}>Submissions</button>{canDelete&&<button className="admin-danger-button" disabled={saving} onClick={()=>void remove(a)}>Delete</button>}</div></article>)}</div>
      <CollectionPager page={assignmentPager.page} totalPages={assignmentPager.totalPages} pageSize={assignmentPager.pageSize} totalItems={visible.length} onPageChange={assignmentPager.setPage} onPageSizeChange={assignmentPager.setPageSize}/>
    </section>

    {form&&<section className="admin-panel assignment-editor"><form className="admin-form" onSubmit={saveAssignment}>
      <div className="admin-form-subheading"><strong>{form.id?'Edit assignment':'New assignment'}</strong><button type="button" className="admin-text-button" onClick={()=>setForm(null)}>Close</button></div>
      <div className="admin-form-grid">
        <label className="form-field admin-field-wide"><span>Title</span><input required minLength={2} maxLength={180} value={form.title} onChange={(e)=>setForm((x)=>x&&({...x,title:e.target.value}))}/></label>
        <label className="form-field"><span>Status</span><select value={form.status} onChange={(e)=>setForm((x)=>x&&({...x,status:e.target.value as AssignmentStatus}))}>{statuses.map((s)=><option key={s} value={s}>{humanize(s)}</option>)}</select></label>
        <label className="form-field"><span>Max score</span><input type="number" min="0.01" step="0.01" value={form.maxScore} onChange={(e)=>setForm((x)=>x&&({...x,maxScore:e.target.value}))}/></label>
        <label className="form-field admin-field-wide"><span>Instructions</span><textarea rows={5} value={form.instructions} onChange={(e)=>setForm((x)=>x&&({...x,instructions:e.target.value}))}/></label>
        <label className="form-field"><span>Release at</span><input type="datetime-local" value={form.releaseAt} onChange={(e)=>setForm((x)=>x&&({...x,releaseAt:e.target.value}))}/></label>
        <label className="form-field"><span>Due at</span><input type="datetime-local" value={form.dueAt} onChange={(e)=>setForm((x)=>x&&({...x,dueAt:e.target.value}))}/></label>
        <label className="form-field"><span>Position</span><input type="number" min={0} value={form.position} onChange={(e)=>setForm((x)=>x&&({...x,position:Number(e.target.value)}))}/></label>
        <label className="staff-check"><input type="checkbox" checked={form.allowLate} onChange={(e)=>setForm((x)=>x&&({...x,allowLate:e.target.checked}))}/><span>Allow late submission</span></label>
      </div><div className="admin-form-actions"><button className="button button-small" disabled={saving}>{saving?'Saving…':'Save assignment'}</button></div>
    </form></section>}

    {selected&&<section className="admin-panel submission-panel"><div className="admin-panel-heading compact"><div><span>Student work</span><h2>{selected.title}</h2></div><span>{submissions.length} submissions</span></div>
      {!submissions.length&&<p className="admin-empty">No submissions yet.</p>}
      <div className="submission-list">{submissions.map((s)=>{const g=grades[s.id]??{status:'graded' as const,score:'',feedback:''};return <article className="submission-row" key={s.id}>
        <div className="submission-copy"><strong>{s.fullName||s.email||'Student'}</strong><small>{humanize(s.status)}{s.submittedAt?` · ${new Date(s.submittedAt).toLocaleString()}`:''}</small>{s.submissionText&&<p>{s.submissionText}</p>}{s.attachmentPath&&<button className="admin-text-button" type="button" onClick={()=>void openAttachment(s.attachmentPath!)}>Open attachment</button>}</div>
        <div className="submission-grade"><label className="form-field"><span>Result</span><select value={g.status} onChange={(e)=>setGrades((x)=>({...x,[s.id]:{...g,status:e.target.value as 'graded'|'returned'}}))}><option value="graded">Graded</option><option value="returned">Returned</option></select></label><label className="form-field"><span>Score{selected.maxScore!==null?` / ${selected.maxScore}`:''}</span><input type="number" min={0} step="0.01" value={g.score} onChange={(e)=>setGrades((x)=>({...x,[s.id]:{...g,score:e.target.value}}))}/></label><label className="form-field submission-feedback"><span>Feedback</span><textarea rows={3} value={g.feedback} onChange={(e)=>setGrades((x)=>({...x,[s.id]:{...g,feedback:e.target.value}}))}/></label><button className="button button-small" type="button" disabled={saving} onClick={()=>void saveGrade(s)}>Save result</button></div>
      </article>})}</div>
    </section>}
  </div></section>
}
