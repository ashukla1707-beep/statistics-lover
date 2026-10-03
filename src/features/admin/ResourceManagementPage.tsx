import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth'
import { listManagedBatches, listManagedCourses, type ManagedBatch, type ManagedCourse } from './academicAdminService'
import { AdminSubnav } from './AdminSubnav'
import { listManagedLectures, listManagedModules, listManagedSubjects, type ManagedLecture, type ManagedModule, type ManagedSubject } from './contentAdminService'
import { deleteManagedLearningResource, listManagedLearningResources, saveManagedLearningResource, type LearningResourceKind, type LearningResourceProvider, type LearningResourceScope, type LearningResourceStatus, type ManagedLearningResource } from './resourceAdminService'

type ResourceForm={
  id:string|null;batchId:string;scope:LearningResourceScope;subjectId:string|null;moduleId:string|null;lectureId:string|null
  kind:LearningResourceKind;title:string;description:string;status:LearningResourceStatus;releaseAt:string;position:number
  provider:LearningResourceProvider;url:string;actionLabel:string;fileName:string;mimeType:string;sizeBytes:string
}

const kinds:LearningResourceKind[]=['study_material','notes','pyq','reference']
const statuses:LearningResourceStatus[]=['draft','published','archived']
const scopes:LearningResourceScope[]=['batch','subject','module','lecture']
const humanize=(v:string)=>v.replaceAll('_',' ').replace(/\b\w/g,(l)=>l.toUpperCase())
const errorMessage=(e:unknown)=>e instanceof Error?e.message:'Something went wrong. Please try again.'
function toLocal(value:string|null){if(!value)return'';const d=new Date(value);return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16)}
function defaultLabel(kind:LearningResourceKind){return kind==='notes'?'Open notes':kind==='pyq'?'Open PYQ':kind==='reference'?'Open resource':'Open material'}
function formFrom(r:ManagedLearningResource):ResourceForm{return{id:r.id,batchId:r.batchId,scope:r.scope,subjectId:r.subjectId,moduleId:r.moduleId,lectureId:r.lectureId,kind:r.kind,title:r.title,description:r.description??'',status:r.status,releaseAt:toLocal(r.releaseAt),position:r.position,provider:r.provider??'google_drive',url:r.providerReference,actionLabel:r.actionLabel||defaultLabel(r.kind),fileName:r.fileName,mimeType:r.mimeType,sizeBytes:r.sizeBytes?.toString()??''}}

export function ResourceManagementPage({ teacherMode = false }: { teacherMode?: boolean }){
  const {identity}=useAuth()
  const canDelete=identity?.roles.some((role)=>role==='admin'||role==='owner')??false
  const [courses,setCourses]=useState<ManagedCourse[]>([])
  const [batches,setBatches]=useState<ManagedBatch[]>([])
  const [subjects,setSubjects]=useState<ManagedSubject[]>([])
  const [modules,setModules]=useState<ManagedModule[]>([])
  const [lectures,setLectures]=useState<ManagedLecture[]>([])
  const [resources,setResources]=useState<ManagedLearningResource[]>([])
  const [courseId,setCourseId]=useState('');const [batchId,setBatchId]=useState('');const [subjectId,setSubjectId]=useState('')
  const [moduleId,setModuleId]=useState('');const [lectureId,setLectureId]=useState('')
  const [scope,setScope]=useState<LearningResourceScope>('lecture')
  const [form,setForm]=useState<ResourceForm|null>(null)
  const [loading,setLoading]=useState(true);const [saving,setSaving]=useState(false)
  const [error,setError]=useState<string|null>(null);const [notice,setNotice]=useState<string|null>(null)

  const visible=useMemo(()=>resources.filter((r)=>r.scope===scope&&(scope==='batch'||(scope==='subject'&&r.subjectId===subjectId)||(scope==='module'&&r.moduleId===moduleId)||(scope==='lecture'&&r.lectureId===lectureId))),[resources,scope,subjectId,moduleId,lectureId])
  const ready=scope==='batch'||(scope==='subject'&&!!subjectId)||(scope==='module'&&!!moduleId)||(scope==='lecture'&&!!lectureId)

  async function refresh(id=batchId){setResources(id?await listManagedLearningResources(id):[])}
  async function chooseLecture(id:string,known=lectures){setLectures(known);setLectureId(id);setForm(null)}
  async function chooseModule(id:string,known=modules){setModules(known);setModuleId(id);setLectureId('');setForm(null);if(!id){setLectures([]);return}const rows=await listManagedLectures(id);setLectures(rows);if(rows[0])await chooseLecture(rows[0].id,rows)}
  async function chooseSubject(id:string,known=subjects){setSubjects(known);setSubjectId(id);setModuleId('');setLectureId('');setLectures([]);setForm(null);if(!id){setModules([]);return}const rows=await listManagedModules(id);setModules(rows);if(rows[0])await chooseModule(rows[0].id,rows)}
  async function chooseBatch(id:string,known=batches){setBatches(known);setBatchId(id);setSubjectId('');setModuleId('');setLectureId('');setModules([]);setLectures([]);setForm(null);if(!id){setSubjects([]);setResources([]);return}const [s,r]=await Promise.all([listManagedSubjects(id),listManagedLearningResources(id)]);setSubjects(s);setResources(r);if(s[0])await chooseSubject(s[0].id,s)}
  async function chooseCourse(id:string,known=courses){setCourses(known);setCourseId(id);setBatchId('');setSubjectId('');setModuleId('');setLectureId('');setSubjects([]);setModules([]);setLectures([]);setResources([]);setForm(null);if(!id){setBatches([]);return}const rows=await listManagedBatches(id);setBatches(rows);if(rows[0])await chooseBatch(rows[0].id,rows)}

  useEffect(()=>{let active=true;void listManagedCourses().then(async(rows)=>{if(!active)return;setCourses(rows);if(rows[0])await chooseCourse(rows[0].id,rows)}).catch((cause)=>{if(active)setError(errorMessage(cause))}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[])

  function newResource(){if(!batchId||!ready)return;setForm({id:null,batchId,scope,subjectId:scope==='subject'?subjectId:null,moduleId:scope==='module'?moduleId:null,lectureId:scope==='lecture'?lectureId:null,kind:'study_material',title:'',description:'',status:'draft',releaseAt:'',position:visible.length,provider:'google_drive',url:'',actionLabel:'Open material',fileName:'',mimeType:'',sizeBytes:''});setError(null);setNotice(null)}
  async function save(event:FormEvent<HTMLFormElement>){event.preventDefault();if(!form)return;if(!form.title.trim()||!form.url.trim()){setError('Title and protected resource link are required.');return}setSaving(true);setError(null);setNotice(null);try{await saveManagedLearningResource({id:form.id,batchId:form.batchId,scope:form.scope,subjectId:form.subjectId,moduleId:form.moduleId,lectureId:form.lectureId,kind:form.kind,title:form.title,description:form.description,status:form.status,releaseAt:form.releaseAt?new Date(form.releaseAt).toISOString():null,position:form.position,provider:form.provider,providerReference:form.url,actionLabel:form.actionLabel,fileName:form.fileName,mimeType:form.mimeType,sizeBytes:form.sizeBytes?Number(form.sizeBytes):null});await refresh(form.batchId);setNotice(form.id?'Learning resource updated.':'Learning resource created.');setForm(null)}catch(cause){setError(errorMessage(cause))}finally{setSaving(false)}}
  async function remove(r:ManagedLearningResource){if(!canDelete||!window.confirm(`Delete “${r.title}”?`))return;setSaving(true);try{await deleteManagedLearningResource(r.id);await refresh(r.batchId);if(form?.id===r.id)setForm(null);setNotice('Learning resource deleted.')}catch(cause){setError(errorMessage(cause))}finally{setSaving(false)}}

  return <section className="admin-page resource-admin-page"><div className="container admin-shell">
    {teacherMode ? (
      <div className="teacher-mode-nav">
        <Link to="/teacher">← Teacher workspace</Link>
        <span>Assignment-scoped access</span>
      </div>
    ) : (
      <AdminSubnav active="resources"/>
    )}
    <header className="admin-page-heading"><div><span className="eyebrow">Protected learning resources</span><h1>Study Material & Resources</h1><p>Publish notes, PDFs, PYQs and references to a batch, subject, module or lecture.</p></div></header>
    {error&&<div className="admin-alert admin-alert-error" role="alert">{error}</div>}{notice&&<div className="admin-alert admin-alert-success" role="status">{notice}</div>}
    <div className="resource-context-grid">
      <label className="form-field"><span>Course</span><select value={courseId} disabled={loading||!courses.length} onChange={(e)=>void chooseCourse(e.target.value)}>{courses.map((c)=><option key={c.id} value={c.id}>{c.title}</option>)}</select></label>
      <label className="form-field"><span>Batch</span><select value={batchId} disabled={!batches.length} onChange={(e)=>void chooseBatch(e.target.value)}>{batches.map((b)=><option key={b.id} value={b.id}>{b.title}</option>)}</select></label>
      <label className="form-field"><span>Attach to</span><select value={scope} onChange={(e)=>{setScope(e.target.value as LearningResourceScope);setForm(null)}}>{scopes.map((s)=><option key={s} value={s}>{humanize(s)}</option>)}</select></label>
      {scope!=='batch'&&<label className="form-field"><span>Subject</span><select value={subjectId} disabled={!subjects.length} onChange={(e)=>void chooseSubject(e.target.value)}>{subjects.map((s)=><option key={s.id} value={s.id}>{s.title}</option>)}</select></label>}
      {(scope==='module'||scope==='lecture')&&<label className="form-field"><span>Module</span><select value={moduleId} disabled={!modules.length} onChange={(e)=>void chooseModule(e.target.value)}>{modules.map((m)=><option key={m.id} value={m.id}>{m.title}</option>)}</select></label>}
      {scope==='lecture'&&<label className="form-field"><span>Lecture</span><select value={lectureId} disabled={!lectures.length} onChange={(e)=>void chooseLecture(e.target.value)}>{lectures.map((l)=><option key={l.id} value={l.id}>{l.title}</option>)}</select></label>}
    </div>

    <section className="admin-panel resource-list-panel"><div className="admin-panel-heading compact"><div><span>{humanize(scope)} resources</span><h2>Files & links</h2></div><button className="admin-icon-button" type="button" disabled={!ready} onClick={newResource}>+</button></div>
      {!ready&&<p className="admin-empty">Select the required academic level first.</p>}{ready&&!visible.length&&<p className="admin-empty">No resources attached here yet.</p>}
      <div className="resource-admin-list">{visible.map((r)=><article className="resource-admin-row" key={r.id}><div><span className={`admin-status admin-status-${r.status}`}>{humanize(r.status)}</span><strong>{r.title}</strong><small>{humanize(r.kind)} · {r.provider?humanize(r.provider):'Source missing'}{r.releaseAt?` · Releases ${new Date(r.releaseAt).toLocaleString()}`:''}</small></div><div className="lecture-admin-actions"><button className="admin-text-button" type="button" onClick={()=>setForm(formFrom(r))}>Edit</button>{canDelete&&<button className="admin-danger-button" type="button" disabled={saving} onClick={()=>void remove(r)}>Delete</button>}</div></article>)}</div>
    </section>

    {form&&<section className="admin-panel resource-editor-card"><form className="admin-form" onSubmit={save}><div className="admin-form-subheading"><strong>{form.id?'Edit resource':'New resource'}</strong><button className="admin-text-button" type="button" onClick={()=>setForm(null)}>Close</button></div><div className="admin-form-grid">
      <label className="form-field admin-field-wide"><span>Title</span><input required minLength={2} maxLength={180} value={form.title} onChange={(e)=>setForm((c)=>c&&({...c,title:e.target.value}))}/></label>
      <label className="form-field"><span>Type</span><select value={form.kind} onChange={(e)=>{const kind=e.target.value as LearningResourceKind;setForm((c)=>c&&({...c,kind,actionLabel:c.actionLabel||defaultLabel(kind)}))}}>{kinds.map((k)=><option key={k} value={k}>{humanize(k)}</option>)}</select></label>
      <label className="form-field"><span>Status</span><select value={form.status} onChange={(e)=>setForm((c)=>c&&({...c,status:e.target.value as LearningResourceStatus}))}>{statuses.map((s)=><option key={s} value={s}>{humanize(s)}</option>)}</select></label>
      <label className="form-field admin-field-wide"><span>Description</span><textarea rows={3} value={form.description} onChange={(e)=>setForm((c)=>c&&({...c,description:e.target.value}))}/></label>
      <label className="form-field"><span>Release at</span><input type="datetime-local" value={form.releaseAt} onChange={(e)=>setForm((c)=>c&&({...c,releaseAt:e.target.value}))}/></label>
      <label className="form-field"><span>Position</span><input type="number" min={0} value={form.position} onChange={(e)=>setForm((c)=>c&&({...c,position:Number(e.target.value)}))}/></label>
      <label className="form-field"><span>Provider</span><select value={form.provider} onChange={(e)=>setForm((c)=>c&&({...c,provider:e.target.value as LearningResourceProvider}))}><option value="google_drive">Google Drive</option><option value="external">External HTTPS</option></select></label>
      <label className="form-field admin-field-wide"><span>Protected resource link</span><input required type="url" inputMode="url" placeholder={form.provider==='google_drive'?'https://drive.google.com/...':'https://...'} value={form.url} onChange={(e)=>setForm((c)=>c&&({...c,url:e.target.value}))}/></label>
      <label className="form-field"><span>Student button label</span><input maxLength={120} value={form.actionLabel} onChange={(e)=>setForm((c)=>c&&({...c,actionLabel:e.target.value}))}/></label>
      <label className="form-field"><span>File name</span><input maxLength={255} value={form.fileName} onChange={(e)=>setForm((c)=>c&&({...c,fileName:e.target.value}))}/></label>
      <label className="form-field"><span>MIME type</span><input maxLength={160} placeholder="application/pdf" value={form.mimeType} onChange={(e)=>setForm((c)=>c&&({...c,mimeType:e.target.value}))}/></label>
      <label className="form-field"><span>Size in bytes</span><input type="number" min={0} value={form.sizeBytes} onChange={(e)=>setForm((c)=>c&&({...c,sizeBytes:e.target.value}))}/></label>
    </div><div className="admin-form-actions"><button className="button button-small" type="submit" disabled={saving}>{saving?'Saving…':'Save resource'}</button><button className="admin-text-button" type="button" disabled={saving} onClick={()=>setForm(null)}>Cancel</button></div></form></section>}
  </div></section>
}
