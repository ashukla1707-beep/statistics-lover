import { useEffect,useMemo,useState,type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { BackLink } from '../../components/ui/BackLink'
import { useAuth } from '../auth'
import { listManagedBatches,listManagedCourses,type ManagedBatch,type ManagedCourse } from './academicAdminService'
import { AdminSubnav } from './AdminSubnav'
import { listManagedSubjects,type ManagedSubject } from './contentAdminService'
import { deleteAnnouncement,listManagedAnnouncements,saveAnnouncement,setAnnouncementDeliveryChannels,type AnnouncementScope,type AnnouncementStatus,type ManagedAnnouncement } from '../communications/announcementService'

type FormState={id:string|null;scope:AnnouncementScope;batchId:string;subjectId:string;title:string;body:string;status:AnnouncementStatus;publishAt:string;expiresAt:string;emailRequested:boolean;whatsappRequested:boolean}
const errorMessage=(error:unknown)=>error instanceof Error?error.message:'Something went wrong.'
const toLocal=(value:string|null)=>{if(!value)return'';const date=new Date(value);return new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,16)}
const humanize=(value:string)=>value.replaceAll('_',' ').replace(/\b\w/g,(letter)=>letter.toUpperCase())

export function AnnouncementManagementPage({teacherMode=false}:{teacherMode?:boolean}){
  const {identity}=useAuth()
  const canDelete=identity?.roles.some((role)=>role==='admin'||role==='owner')??false
  const [courses,setCourses]=useState<ManagedCourse[]>([]),[batches,setBatches]=useState<ManagedBatch[]>([]),[subjects,setSubjects]=useState<ManagedSubject[]>([])
  const [announcements,setAnnouncements]=useState<ManagedAnnouncement[]>([]),[form,setForm]=useState<FormState|null>(null)
  const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState<string|null>(null),[notice,setNotice]=useState<string|null>(null)

  const courseMap=useMemo(()=>new Map(courses.map((course)=>[course.id,course])),[courses])
  const batchMap=useMemo(()=>new Map(batches.map((batch)=>[batch.id,batch])),[batches])
  const subjectMap=useMemo(()=>new Map(subjects.map((subject)=>[subject.id,subject])),[subjects])

  async function refresh(){setAnnouncements(await listManagedAnnouncements())}
  async function loadSubjects(batchId:string){
    if(!batchId){setSubjects([]);return[]}
    const rows=await listManagedSubjects(batchId);setSubjects(rows);return rows
  }
  useEffect(()=>{let active=true;void (async()=>{
    try{
      const courseRows=await listManagedCourses()
      const batchRows=(await Promise.all(courseRows.map((course)=>listManagedBatches(course.id)))).flat()
      const announcementRows=await listManagedAnnouncements()
      if(!active)return
      setCourses(courseRows);setBatches(batchRows);setAnnouncements(announcementRows)
    }catch(e){if(active)setError(errorMessage(e))}finally{if(active)setLoading(false)}
  })();return()=>{active=false}},[])

  async function startNew(){
    const firstBatch=batches[0]
    const scope:AnnouncementScope=teacherMode?'batch':'global'
    if(teacherMode&&!firstBatch){setError('No assigned batch is available for announcements.');return}
    setSubjects(firstBatch?await loadSubjects(firstBatch.id):[])
    setForm({id:null,scope,batchId:firstBatch?.id??'',subjectId:'',title:'',body:'',status:'draft',publishAt:'',expiresAt:'',emailRequested:false,whatsappRequested:false})
    setError(null);setNotice(null)
  }
  async function edit(item:ManagedAnnouncement){
    const rows=item.batchId?await loadSubjects(item.batchId):[]
    setSubjects(rows)
    setForm({id:item.id,scope:item.scope,batchId:item.batchId??'',subjectId:item.subjectId??'',title:item.title,body:item.body,status:item.status,publishAt:toLocal(item.publishAt),expiresAt:toLocal(item.expiresAt),emailRequested:item.emailRequested,whatsappRequested:item.whatsappRequested})
    setError(null);setNotice(null)
  }
  async function save(event:FormEvent){
    event.preventDefault();if(!form)return
    setSaving(true);setError(null);setNotice(null)
    try{
      const announcementId=await saveAnnouncement({id:form.id,scope:form.scope,batchId:form.scope==='global'?null:form.batchId||null,subjectId:form.scope==='subject'?form.subjectId||null:null,title:form.title,body:form.body,status:form.status,publishAt:form.publishAt?new Date(form.publishAt).toISOString():null,expiresAt:form.expiresAt?new Date(form.expiresAt).toISOString():null})
      const queued=await setAnnouncementDeliveryChannels(announcementId,form.emailRequested,form.whatsappRequested)
      await refresh();setForm(null);setNotice(form.status==='published'?`Announcement published. In-app notifications are ready${queued>0?` and ${queued} external deliveries were queued`:''}.`:'Announcement saved.')
    }catch(e){setError(errorMessage(e))}finally{setSaving(false)}
  }
  async function remove(id:string){if(!canDelete||!window.confirm('Delete this announcement?'))return;setSaving(true);try{await deleteAnnouncement(id);await refresh();setNotice('Announcement deleted.')}catch(e){setError(errorMessage(e))}finally{setSaving(false)}}
  async function changeBatch(batchId:string){const rows=await loadSubjects(batchId);setForm((current)=>current&&({...current,batchId,subjectId:rows[0]?.id??''}))}
  async function changeScope(scope:AnnouncementScope){
    if(!form)return
    if(scope==='global'){setSubjects([]);setForm({...form,scope,batchId:'',subjectId:''});return}
    const batchId=form.batchId||batches[0]?.id||''
    const rows=await loadSubjects(batchId)
    setForm({...form,scope,batchId,subjectId:scope==='subject'?(form.subjectId||rows[0]?.id||''):''})
  }

  return <section className="admin-page announcements-admin-page"><div className="container admin-shell">
    {teacherMode?<div className="teacher-mode-nav"><BackLink to="/teacher">Teacher workspace</BackLink><span>Assigned teaching scope</span></div>:<AdminSubnav active="announcements"/>}
    <header className="admin-page-heading"><div><span className="eyebrow">Communication</span><h1>Announcements</h1><p>Publish scheduled global, batch or subject notices. Published notices generate private in-app notifications for eligible students.</p></div></header>
    {error&&<div className="admin-alert admin-alert-error">{error}</div>}{notice&&<div className="admin-alert admin-alert-success">{notice}</div>}
    <section className="admin-panel announcements-panel"><div className="admin-panel-heading"><div><span>{announcements.length} announcements</span><h2>Communication feed</h2></div><button className="button button-small" disabled={loading} onClick={()=>void startNew()}>+ New announcement</button></div>
      {form&&<form className="admin-form announcement-form" onSubmit={save}><div className="admin-form-grid">
        <label className="form-field"><span>Scope</span><select value={form.scope} onChange={e=>void changeScope(e.target.value as AnnouncementScope)}>{!teacherMode&&<option value="global">Global</option>}<option value="batch">Batch</option><option value="subject">Subject</option></select></label>
        {form.scope!=='global'&&<label className="form-field"><span>Batch</span><select required value={form.batchId} onChange={e=>void changeBatch(e.target.value)}>{batches.map((batch)=>{const course=courseMap.get(batch.courseId);return <option key={batch.id} value={batch.id}>{course?.title??'Course'} · {batch.title}</option>})}</select></label>}
        {form.scope==='subject'&&<label className="form-field"><span>Subject</span><select required value={form.subjectId} onChange={e=>setForm(current=>current&&({...current,subjectId:e.target.value}))}>{subjects.map((subject)=><option key={subject.id} value={subject.id}>{subject.title}</option>)}</select></label>}
        <label className="form-field"><span>Status</span><select value={form.status} onChange={e=>setForm(current=>current&&({...current,status:e.target.value as AnnouncementStatus}))}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></label>
        <label className="form-field"><span>Publish at</span><input type="datetime-local" value={form.publishAt} onChange={e=>setForm(current=>current&&({...current,publishAt:e.target.value}))}/></label>
        <label className="form-field"><span>Expires at</span><input type="datetime-local" value={form.expiresAt} onChange={e=>setForm(current=>current&&({...current,expiresAt:e.target.value}))}/></label>
        <label className="form-field admin-field-wide"><span>Title</span><input required minLength={2} maxLength={180} value={form.title} onChange={e=>setForm(current=>current&&({...current,title:e.target.value}))}/></label>
        <label className="form-field admin-field-wide"><span>Message</span><textarea required minLength={2} maxLength={10000} rows={6} value={form.body} onChange={e=>setForm(current=>current&&({...current,body:e.target.value}))}/></label>
        <label className="staff-check"><input type="checkbox" checked={form.emailRequested} onChange={e=>setForm(current=>current&&({...current,emailRequested:e.target.checked}))}/><span>Queue email delivery</span></label>
        <label className="staff-check"><input type="checkbox" checked={form.whatsappRequested} onChange={e=>setForm(current=>current&&({...current,whatsappRequested:e.target.checked}))}/><span>Queue WhatsApp delivery</span></label>
        {(form.emailRequested||form.whatsappRequested)&&<p className="announcement-channel-note admin-field-wide">External messages enter the secure delivery outbox and are sent when the corresponding provider worker is configured. In-app delivery works immediately.</p>}
      </div><div className="admin-form-actions"><button className="button button-small" disabled={saving}>{saving?'Saving…':form.status==='published'?'Publish announcement':'Save announcement'}</button><button type="button" className="admin-text-button" onClick={()=>setForm(null)}>Cancel</button></div></form>}
      {!announcements.length&&!loading&&<p className="admin-empty">No announcements in your scope yet.</p>}
      <div className="announcement-admin-list">{announcements.map((item)=>{const batch=item.batchId?batchMap.get(item.batchId):null;const subject=item.subjectId?subjectMap.get(item.subjectId):null;return <article key={item.id}><div><div className="announcement-badges"><span className={`admin-status admin-status-${item.status==='published'?'active':item.status==='draft'?'scheduled':'archived'}`}>{item.status}</span><span>{humanize(item.scope)}</span></div><strong>{item.title}</strong><p>{item.body}</p><small>{item.scope==='global'?'All active students':item.scope==='batch'?(batch?.title??'Batch'):`${batch?.title??'Batch'} · ${subject?.title??'Subject'}`}{item.emailRequested?' · Email queued':''}{item.whatsappRequested?' · WhatsApp queued':''}{item.publishAt?` · Publishes ${new Date(item.publishAt).toLocaleString()}`:''}{item.expiresAt?` · Expires ${new Date(item.expiresAt).toLocaleString()}`:''}</small></div><div className="lecture-admin-actions"><button className="admin-text-button" onClick={()=>void edit(item)}>Edit</button>{canDelete&&<button className="admin-danger-button" disabled={saving} onClick={()=>void remove(item.id)}>Delete</button>}</div></article>})}</div>
    </section>
  </div></section>
}
