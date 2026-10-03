import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../auth'
import { loadStudentCourseEnrollments, type StudentCourseEnrollment } from './courseService'
import {
  createSubmissionSignedUrl,
  loadStudentAssignments,
  saveStudentAssignmentSubmission,
  type StudentAssignment,
} from '../admin/assignmentService'

type Draft={text:string;file:File|null}
const humanize=(value:string)=>value.replaceAll('_',' ').replace(/\b\w/g,(letter)=>letter.toUpperCase())
const errorMessage=(error:unknown)=>error instanceof Error?error.message:'Something went wrong. Please try again.'

export function StudentAssignmentsPage(){
  const {batchId=''}=useParams()
  const {identity}=useAuth()
  const [enrollment,setEnrollment]=useState<StudentCourseEnrollment|null>(null)
  const [assignments,setAssignments]=useState<StudentAssignment[]>([])
  const [drafts,setDrafts]=useState<Record<string,Draft>>({})
  const [loading,setLoading]=useState(true),[savingId,setSavingId]=useState<string|null>(null)
  const [error,setError]=useState<string|null>(null),[notice,setNotice]=useState<string|null>(null)
  const [currentTime]=useState(()=>Date.now())

  async function refresh(){
    if(!identity?.userId||!batchId)return
    const enrollments=await loadStudentCourseEnrollments(identity.userId)
    const found=enrollments.find((item)=>item.batch.id===batchId)??null
    if(!found) throw new Error('This batch is not assigned to your account.')
    const rows=await loadStudentAssignments(batchId)
    setEnrollment(found)
    setAssignments(rows)
    setDrafts(Object.fromEntries(rows.map((a)=>[a.id,{text:a.submissionText,file:null}])))
  }

  useEffect(()=>{
    if(!identity?.userId||!batchId)return
    let active=true
    void Promise.all([
      loadStudentCourseEnrollments(identity.userId),
      loadStudentAssignments(batchId),
    ]).then(([enrollments,rows])=>{
      if(!active)return
      const found=enrollments.find((item)=>item.batch.id===batchId)??null
      if(!found) throw new Error('This batch is not assigned to your account.')
      setEnrollment(found)
      setAssignments(rows)
      setDrafts(Object.fromEntries(rows.map((a)=>[a.id,{text:a.submissionText,file:null}])))
    }).catch((cause)=>{if(active)setError(errorMessage(cause))}).finally(()=>{if(active)setLoading(false)})
    return()=>{active=false}
  },[batchId,identity?.userId])

  const summary=useMemo(()=>({
    total:assignments.length,
    submitted:assignments.filter((a)=>a.submissionStatus==='submitted').length,
    graded:assignments.filter((a)=>a.submissionStatus==='graded'||a.submissionStatus==='returned').length,
  }),[assignments])

  function changeFile(id:string,event:ChangeEvent<HTMLInputElement>){
    const file=event.target.files?.[0]??null
    setDrafts((current)=>({...current,[id]:{text:current[id]?.text??'',file}}))
  }

  async function save(a:StudentAssignment,submitNow:boolean){
    if(!identity?.userId)return
    const draft=drafts[a.id]??{text:'',file:null}
    if(submitNow&&!draft.text.trim()&&!draft.file&&!a.attachmentPath){setError('Add a response or attachment before submitting.');return}
    setSavingId(a.id);setError(null);setNotice(null)
    try{
      await saveStudentAssignmentSubmission({assignmentId:a.id,userId:identity.userId,text:draft.text,file:draft.file,submitNow})
      await refresh()
      setNotice(submitNow?'Assignment submitted.':'Draft saved.')
    }catch(cause){setError(errorMessage(cause))}finally{setSavingId(null)}
  }

  async function openAttachment(path:string){try{window.open(await createSubmissionSignedUrl(path),'_blank','noopener,noreferrer')}catch(cause){setError(errorMessage(cause))}}

  if(loading)return <div className="auth-state">Loading assignments…</div>
  if(error&&!enrollment)return <section className="student-assignment-page"><div className="container student-assignment-shell"><div className="learning-empty-card"><h1>Assignments unavailable</h1><p>{error}</p><Link className="button button-small" to="/dashboard">Back to dashboard</Link></div></div></section>

  return <section className="student-assignment-page"><div className="container student-assignment-shell">
    <Link className="learning-back-link" to={`/learn/${batchId}`}>← Learning space</Link>
    <header className="student-assignment-hero"><div><span className="eyebrow">Coursework</span><h1>Assignments</h1><p>{enrollment?.course.title} · {enrollment?.batch.title}</p></div><div className="student-assignment-summary"><span><strong>{summary.total}</strong>Total</span><span><strong>{summary.submitted}</strong>Submitted</span><span><strong>{summary.graded}</strong>Reviewed</span></div></header>
    {error&&<div className="admin-alert admin-alert-error">{error}</div>}{notice&&<div className="admin-alert admin-alert-success">{notice}</div>}
    {!assignments.length?<div className="learning-empty-card"><h2>No assignments yet</h2><p>Published assignments will appear here when they are released.</p></div>:<div className="student-assignment-list">{assignments.map((a)=>{
      const draft=drafts[a.id]??{text:a.submissionText,file:null}
      const duePassed=Boolean(a.dueAt&&new Date(a.dueAt).getTime()<currentTime)
      const locked=(a.submissionStatus==='graded'||a.submissionStatus==='returned')||(!a.allowLate&&duePassed)
      return <article className="student-assignment-card" key={a.id}>
        <div className="student-assignment-card-head"><div><span>{a.contextTitle}</span><h2>{a.title}</h2></div><span className={`student-assignment-status student-assignment-status-${a.submissionStatus??'open'}`}>{humanize(a.submissionStatus??'open')}</span></div>
        <div className="student-assignment-meta">{a.dueAt&&<span>Due {new Date(a.dueAt).toLocaleString()}</span>}{a.maxScore!==null&&<span>{a.maxScore} points</span>}{a.allowLate&&<span>Late submissions allowed</span>}</div>
        {a.instructions&&<p className="student-assignment-instructions">{a.instructions}</p>}
        {(a.submissionStatus==='graded'||a.submissionStatus==='returned')&&<div className="student-assignment-result"><strong>{a.score!==null?`Score: ${a.score}${a.maxScore!==null?` / ${a.maxScore}`:''}`:'Reviewed'}</strong>{a.feedback&&<p>{a.feedback}</p>}</div>}
        <label className="form-field"><span>Your response</span><textarea rows={5} maxLength={10000} disabled={locked} value={draft.text} onChange={(e)=>setDrafts((current)=>({...current,[a.id]:{...draft,text:e.target.value}}))}/></label>
        <div className="student-assignment-file-row"><label className="student-file-input"><span>{draft.file?draft.file.name:'Attach file (max 25 MB)'}</span><input type="file" disabled={locked} onChange={(e)=>changeFile(a.id,e)}/></label>{a.attachmentPath&&<button className="admin-text-button" type="button" onClick={()=>void openAttachment(a.attachmentPath!)}>Open current attachment</button>}</div>
        <div className="student-assignment-actions"><button className="button button-small button-secondary" type="button" disabled={locked||savingId===a.id} onClick={()=>void save(a,false)}>Save draft</button><button className="button button-small" type="button" disabled={locked||savingId===a.id} onClick={()=>void save(a,true)}>{savingId===a.id?'Saving…':a.submissionStatus==='submitted'?'Resubmit':'Submit assignment'}</button></div>
        {locked&&!a.allowLate&&duePassed&&a.submissionStatus!=='graded'&&a.submissionStatus!=='returned'&&<small className="student-assignment-locked">Submission window closed.</small>}
      </article>
    })}</div>}
  </div></section>
}
