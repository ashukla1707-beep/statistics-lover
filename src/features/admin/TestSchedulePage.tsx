import { useEffect,useState,type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { BackLink } from '../../components/ui/BackLink'
import { listManagedBatches,listManagedCourses,type ManagedBatch,type ManagedCourse } from './academicAdminService'
import { AdminSubnav } from './AdminSubnav'
import { listManagedTests,type ManagedTest } from './testBuilderService'
import { deleteManagedTestSchedule,listManagedTestSchedules,loadAssessmentTestRoster,saveManagedTestSchedule,setManualAssessmentResultsReleased,type AssessmentResultPolicy,type AssessmentScheduleAudience,type ManagedTestSchedule,type TestRosterStudent } from './testScheduleService'

type FormState={id:string|null;testId:string;title:string;opensAt:string;closesAt:string;audience:AssessmentScheduleAudience;resultPolicy:AssessmentResultPolicy;resultsReleaseAt:string;isActive:boolean;enrollmentIds:string[]}
const toLocal=(value:string|null)=>{if(!value)return'';const d=new Date(value);return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16)}
const errorMessage=(e:unknown)=>e instanceof Error?e.message:'Something went wrong.'
function fromSchedule(s:ManagedTestSchedule):FormState{return{id:s.id,testId:s.testId,title:s.title??'',opensAt:toLocal(s.opensAt),closesAt:toLocal(s.closesAt),audience:s.audience,resultPolicy:s.resultPolicy,resultsReleaseAt:toLocal(s.resultsReleaseAt),isActive:s.isActive,enrollmentIds:s.enrollmentIds}}

export function TestSchedulePage({teacherMode=false}:{teacherMode?:boolean}){
  const [courses,setCourses]=useState<ManagedCourse[]>([]),[batches,setBatches]=useState<ManagedBatch[]>([]),[tests,setTests]=useState<ManagedTest[]>([]),[schedules,setSchedules]=useState<ManagedTestSchedule[]>([]),[roster,setRoster]=useState<TestRosterStudent[]>([])
  const [courseId,setCourseId]=useState(''),[batchId,setBatchId]=useState(''),[testId,setTestId]=useState(''),[form,setForm]=useState<FormState|null>(null)
  const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState<string|null>(null),[notice,setNotice]=useState<string|null>(null)

  async function chooseTest(id:string,known=tests){
    setTests(known);setTestId(id);setForm(null);setError(null)
    if(!id){setSchedules([]);setRoster([]);return}
    const [s,r]=await Promise.all([listManagedTestSchedules(id),loadAssessmentTestRoster(id)])
    setSchedules(s);setRoster(r)
  }
  async function chooseBatch(id:string,known=batches){
    setBatches(known);setBatchId(id);setTestId('');setSchedules([]);setRoster([]);setForm(null)
    if(!id){setTests([]);return}
    const rows=(await listManagedTests(id)).filter((t)=>t.status==='published')
    setTests(rows);if(rows[0])await chooseTest(rows[0].id,rows)
  }
  async function chooseCourse(id:string,known=courses){
    setCourses(known);setCourseId(id);setBatchId('');setTests([]);setSchedules([]);setRoster([]);setForm(null)
    if(!id){setBatches([]);return}
    const rows=await listManagedBatches(id);setBatches(rows);if(rows[0])await chooseBatch(rows[0].id,rows)
  }
  useEffect(()=>{let active=true;void listManagedCourses().then(async rows=>{if(!active)return;setCourses(rows);if(rows[0])await chooseCourse(rows[0].id,rows)}).catch(e=>active&&setError(errorMessage(e))).finally(()=>active&&setLoading(false));return()=>{active=false}},[])

  function newSchedule(){
    if(!testId)return
    const start=new Date();start.setMinutes(start.getMinutes()+10)
    const end=new Date(start.getTime()+2*60*60*1000)
    setForm({id:null,testId,title:'',opensAt:toLocal(start.toISOString()),closesAt:toLocal(end.toISOString()),audience:'batch',resultPolicy:'immediate',resultsReleaseAt:'',isActive:true,enrollmentIds:[]})
  }
  async function save(e:FormEvent){
    e.preventDefault();if(!form)return;setSaving(true);setError(null);setNotice(null)
    try{
      await saveManagedTestSchedule({id:form.id,testId:form.testId,title:form.title,opensAt:new Date(form.opensAt).toISOString(),closesAt:new Date(form.closesAt).toISOString(),audience:form.audience,resultPolicy:form.resultPolicy,resultsReleaseAt:form.resultsReleaseAt?new Date(form.resultsReleaseAt).toISOString():null,isActive:form.isActive,enrollmentIds:form.audience==='selected'?form.enrollmentIds:[]})
      setSchedules(await listManagedTestSchedules(form.testId));setForm(null);setNotice('Test schedule saved.')
    }catch(e){setError(errorMessage(e))}finally{setSaving(false)}
  }
  async function remove(id:string){if(!window.confirm('Delete this test schedule?'))return;setSaving(true);try{await deleteManagedTestSchedule(id);setSchedules(await listManagedTestSchedules(testId));setNotice('Schedule deleted.')}catch(e){setError(errorMessage(e))}finally{setSaving(false)}}
  function toggleEnrollment(id:string){setForm((x)=>x&&({...x,enrollmentIds:x.enrollmentIds.includes(id)?x.enrollmentIds.filter((v)=>v!==id):[...x.enrollmentIds,id]}))}
  async function toggleManualResults(schedule:ManagedTestSchedule){
    setSaving(true);setError(null)
    try{await setManualAssessmentResultsReleased(schedule.id,!schedule.manualResultsReleased);setSchedules(await listManagedTestSchedules(testId));setNotice(schedule.manualResultsReleased?'Manual results hidden.':'Manual results released.')}catch(e){setError(errorMessage(e))}finally{setSaving(false)}
  }

  const selectedTest=tests.find((t)=>t.id===testId)??null
  return <section className="admin-page test-schedule-page"><div className="container admin-shell">
    {teacherMode?<div className="teacher-mode-nav"><BackLink to="/teacher">Teacher workspace</BackLink><span>Assignment-scoped access</span></div>:<AdminSubnav active="schedules"/>}
    <header className="admin-page-heading"><div><span className="eyebrow">Assessment delivery</span><h1>Test Scheduling</h1><p>Open and close exam windows, choose batch-wide or selected-student access, and control when results may be released.</p></div></header>
    {error&&<div className="admin-alert admin-alert-error">{error}</div>}{notice&&<div className="admin-alert admin-alert-success">{notice}</div>}
    <div className="test-schedule-context"><label className="form-field"><span>Course</span><select value={courseId} disabled={loading||!courses.length} onChange={e=>void chooseCourse(e.target.value)}>{courses.map(x=><option key={x.id} value={x.id}>{x.title}</option>)}</select></label><label className="form-field"><span>Batch</span><select value={batchId} disabled={!batches.length} onChange={e=>void chooseBatch(e.target.value)}>{batches.map(x=><option key={x.id} value={x.id}>{x.title}</option>)}</select></label><label className="form-field"><span>Published test</span><select value={testId} disabled={!tests.length} onChange={e=>void chooseTest(e.target.value)}>{tests.map(x=><option key={x.id} value={x.id}>{x.title}</option>)}</select></label></div>
    <section className="admin-panel test-schedule-list"><div className="admin-panel-heading compact"><div><span>{schedules.length} windows</span><h2>{selectedTest?.title??'Select a published test'}</h2></div><button className="admin-icon-button" disabled={!testId} onClick={newSchedule}>+</button></div>{testId&&!schedules.length&&<p className="admin-empty">No schedule yet.</p>}<div>{schedules.map(s=><article className="test-schedule-row" key={s.id}><div><strong>{s.title||selectedTest?.title}</strong><span>{new Date(s.opensAt).toLocaleString()} → {new Date(s.closesAt).toLocaleString()}</span><small>{s.audience==='batch'?'Whole batch':`${s.enrollmentIds.length} selected students`} · {s.isActive?'Active':'Disabled'} · Results: {s.resultPolicy.replace('_',' ')}</small></div><div className="lecture-admin-actions"><button className="admin-text-button" onClick={()=>setForm(fromSchedule(s))}>Edit</button>{s.resultPolicy==='manual'&&<button className="admin-text-button" disabled={saving} onClick={()=>void toggleManualResults(s)}>{s.manualResultsReleased?'Hide results':'Release results'}</button>}<button className="admin-danger-button" disabled={saving} onClick={()=>void remove(s.id)}>Delete</button></div></article>)}</div></section>
    {form&&<section className="admin-panel test-schedule-editor"><form className="admin-form" onSubmit={save}><div className="admin-form-subheading"><strong>{form.id?'Edit schedule':'New schedule'}</strong><button type="button" className="admin-text-button" onClick={()=>setForm(null)}>Close</button></div><div className="admin-form-grid">
      <label className="form-field admin-field-wide"><span>Window label</span><input maxLength={180} value={form.title} onChange={e=>setForm(x=>x&&({...x,title:e.target.value}))}/></label>
      <label className="form-field"><span>Opens at</span><input required type="datetime-local" value={form.opensAt} onChange={e=>setForm(x=>x&&({...x,opensAt:e.target.value}))}/></label><label className="form-field"><span>Closes at</span><input required type="datetime-local" value={form.closesAt} onChange={e=>setForm(x=>x&&({...x,closesAt:e.target.value}))}/></label>
      <label className="form-field"><span>Audience</span><select value={form.audience} onChange={e=>setForm(x=>x&&({...x,audience:e.target.value as AssessmentScheduleAudience}))}><option value="batch">Whole batch</option><option value="selected">Selected students</option></select></label>
      <label className="form-field"><span>Result release</span><select value={form.resultPolicy} onChange={e=>setForm(x=>x&&({...x,resultPolicy:e.target.value as AssessmentResultPolicy}))}><option value="immediate">Immediately after submission</option><option value="after_close">After test closes</option><option value="scheduled">At scheduled time</option><option value="manual">Manual release</option></select></label>
      {form.resultPolicy==='scheduled'&&<label className="form-field"><span>Results release at</span><input required type="datetime-local" value={form.resultsReleaseAt} onChange={e=>setForm(x=>x&&({...x,resultsReleaseAt:e.target.value}))}/></label>}
      <label className="staff-check"><input type="checkbox" checked={form.isActive} onChange={e=>setForm(x=>x&&({...x,isActive:e.target.checked}))}/><span>Schedule active</span></label>
    </div>
    {form.audience==='selected'&&<div className="test-roster-select"><div className="admin-form-subheading"><strong>Select students</strong><span>{form.enrollmentIds.length} selected</span></div>{roster.map(student=><label key={student.enrollmentId}><input type="checkbox" checked={form.enrollmentIds.includes(student.enrollmentId)} onChange={()=>toggleEnrollment(student.enrollmentId)}/><span><strong>{student.fullName||student.email||'Student'}</strong><small>{student.email}</small></span></label>)}</div>}
    <div className="admin-form-actions"><button className="button button-small" disabled={saving}>{saving?'Saving…':'Save schedule'}</button></div></form></section>}
  </div></section>
}
