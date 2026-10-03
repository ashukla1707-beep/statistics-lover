import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { listManagedBatches, listManagedCourses, type ManagedBatch, type ManagedCourse } from './academicAdminService'
import { listManagedSubjects, type ManagedSubject } from './contentAdminService'
import { AdminSubnav } from './AdminSubnav'
import { deleteTeacherAssignment, grantStaffRole, listStaffUsers, listTeacherAssignments, revokeStaffRole, saveTeacherAssignment, type StaffUser, type TeacherAssignment } from './staffAdminService'

type AssignmentForm={id:string|null;batchId:string;subjectId:string;startsAt:string;endsAt:string;isActive:boolean}
const toLocal=(value:string|null)=>{if(!value)return'';const d=new Date(value);return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16)}
const message=(e:unknown)=>e instanceof Error?e.message:'Something went wrong.'

export function StaffManagementPage(){
  const [users,setUsers]=useState<StaffUser[]>([]);const [selectedId,setSelectedId]=useState('');const [query,setQuery]=useState('')
  const [assignments,setAssignments]=useState<TeacherAssignment[]>([]);const [courses,setCourses]=useState<ManagedCourse[]>([])
  const [batches,setBatches]=useState<ManagedBatch[]>([]);const [subjects,setSubjects]=useState<ManagedSubject[]>([])
  const [courseId,setCourseId]=useState('');const [form,setForm]=useState<AssignmentForm|null>(null)
  const [busy,setBusy]=useState(false);const [loading,setLoading]=useState(true);const [error,setError]=useState<string|null>(null);const [notice,setNotice]=useState<string|null>(null)
  const selected=users.find((u)=>u.id===selectedId)??null
  const filtered=useMemo(()=>users.filter((u)=>`${u.fullName??''} ${u.email??''}`.toLowerCase().includes(query.toLowerCase())),[users,query])

  async function refreshUsers(preferred=selectedId){const rows=await listStaffUsers();setUsers(rows);const id=rows.some((u)=>u.id===preferred)?preferred:rows[0]?.id??'';setSelectedId(id);return rows.find((u)=>u.id===id)??null}
  async function loadAssignments(user:StaffUser|null){if(!user?.roles.includes('teacher')){setAssignments([]);return}setAssignments(await listTeacherAssignments(user.id))}
  async function chooseUser(id:string){setSelectedId(id);setForm(null);setNotice(null);setError(null);await loadAssignments(users.find((u)=>u.id===id)??null)}
  async function chooseCourse(id:string,known=courses){setCourses(known);setCourseId(id);setSubjects([]);const rows=await listManagedBatches(id);setBatches(rows);if(rows[0])await chooseBatch(rows[0].id,rows)}
  async function chooseBatch(id:string,known=batches){setBatches(known);const rows=await listManagedSubjects(id);setSubjects(rows);setForm((current)=>current&&({...current,batchId:id,subjectId:''}))}

  useEffect(()=>{let active=true;void Promise.all([listStaffUsers(),listManagedCourses()]).then(async([people,courseRows])=>{if(!active)return;setUsers(people);setCourses(courseRows);const first=people[0]??null;if(first){setSelectedId(first.id);await loadAssignments(first)}if(courseRows[0])await chooseCourse(courseRows[0].id,courseRows)}).catch((e)=>active&&setError(message(e))).finally(()=>active&&setLoading(false));return()=>{active=false}},[])

  async function toggleRole(role:'teacher'|'content_manager'){
    if(!selected)return
    if(role==='teacher'&&selected.roles.includes('teacher')&&assignments.length){setError('Remove teacher assignments before removing the teacher role.');return}
    setBusy(true);setError(null);setNotice(null)
    try{selected.roles.includes(role)?await revokeStaffRole(selected.id,role):await grantStaffRole(selected.id,role);const user=await refreshUsers(selected.id);await loadAssignments(user);setNotice(`${role.replace('_',' ')} role updated.`)}catch(e){setError(message(e))}finally{setBusy(false)}
  }

  function newAssignment(){if(!selected||!batches[0])return;setForm({id:null,batchId:batches[0].id,subjectId:'',startsAt:'',endsAt:'',isActive:true});void chooseBatch(batches[0].id,batches)}
  async function editAssignment(a:TeacherAssignment){
    setError(null)
    try{
      setCourseId(a.courseId)
      const batchRows=await listManagedBatches(a.courseId)
      setBatches(batchRows)
      const subjectRows=await listManagedSubjects(a.batchId)
      setSubjects(subjectRows)
      setForm({id:a.id,batchId:a.batchId,subjectId:a.subjectId??'',startsAt:toLocal(a.startsAt),endsAt:toLocal(a.endsAt),isActive:a.isActive})
    }catch(e){setError(message(e))}
  }
  async function save(event:FormEvent){event.preventDefault();if(!selected||!form)return;setBusy(true);setError(null);try{await saveTeacherAssignment({id:form.id,teacherId:selected.id,batchId:form.batchId,subjectId:form.subjectId||null,isActive:form.isActive,startsAt:form.startsAt?new Date(form.startsAt).toISOString():null,endsAt:form.endsAt?new Date(form.endsAt).toISOString():null});setAssignments(await listTeacherAssignments(selected.id));setForm(null);setNotice('Teacher assignment saved.')}catch(e){setError(message(e))}finally{setBusy(false)}}
  async function remove(id:string){if(!selected||!window.confirm('Remove this teacher assignment?'))return;setBusy(true);try{await deleteTeacherAssignment(id);setAssignments(await listTeacherAssignments(selected.id));setNotice('Assignment removed.')}catch(e){setError(message(e))}finally{setBusy(false)}}

  return <section className="admin-page staff-admin-page"><div className="container admin-shell">
    <AdminSubnav active="staff"/>
    <header className="admin-page-heading"><div><span className="eyebrow">People & permissions</span><h1>Staff & Teacher Assignments</h1><p>Grant teaching/content roles and restrict teachers to only the batches or subjects they are responsible for.</p></div></header>
    {error&&<div className="admin-alert admin-alert-error">{error}</div>}{notice&&<div className="admin-alert admin-alert-success">{notice}</div>}
    <div className="staff-grid">
      <section className="admin-panel staff-list-panel"><div className="staff-search"><input type="search" placeholder="Search name or email" value={query} onChange={(e)=>setQuery(e.target.value)}/></div><div className="staff-list">{loading?<p className="admin-empty">Loading people…</p>:filtered.map((u)=><button className={`staff-user-row ${u.id===selectedId?'is-selected':''}`} key={u.id} onClick={()=>void chooseUser(u.id)}><strong>{u.fullName||u.email||'Unnamed account'}</strong><small>{u.email}</small><span>{u.roles.join(' · ')||'No roles'}</span></button>)}</div></section>
      <div className="staff-detail">
        {!selected?<section className="admin-panel staff-empty"><p>Select an account.</p></section>:<>
          <section className="admin-panel staff-role-card"><div><span className="eyebrow">Selected account</span><h2>{selected.fullName||selected.email}</h2><p>{selected.email} · {selected.accountStatus}</p></div><div className="staff-role-actions"><button type="button" className={selected.roles.includes('teacher')?'button button-small':'button button-small button-secondary'} disabled={busy} onClick={()=>void toggleRole('teacher')}>{selected.roles.includes('teacher')?'Remove teacher role':'Grant teacher role'}</button><button type="button" className={selected.roles.includes('content_manager')?'button button-small':'button button-small button-secondary'} disabled={busy} onClick={()=>void toggleRole('content_manager')}>{selected.roles.includes('content_manager')?'Remove content manager':'Grant content manager'}</button></div></section>
          {selected.roles.includes('teacher')&&<section className="admin-panel teacher-assignment-card"><div className="admin-panel-heading compact"><div><span>Scoped access</span><h2>Teacher assignments</h2></div><button className="admin-icon-button" onClick={newAssignment}>+</button></div>{!assignments.length&&<p className="admin-empty">No teaching areas assigned yet.</p>}<div className="assignment-list">{assignments.map((a)=><article key={a.id}><div><strong>{a.courseTitle} · {a.batchTitle}</strong><span>{a.subjectTitle||'Whole batch'}</span><small>{a.isActive?'Active':'Inactive'}{a.startsAt?` · from ${new Date(a.startsAt).toLocaleString()}`:''}{a.endsAt?` · until ${new Date(a.endsAt).toLocaleString()}`:''}</small></div><div><button className="admin-text-button" onClick={()=>void editAssignment(a)}>Edit</button><button className="admin-danger-button" onClick={()=>void remove(a.id)}>Remove</button></div></article>)}</div></section>}
          {form&&<section className="admin-panel assignment-editor"><form className="admin-form" onSubmit={save}><div className="admin-form-subheading"><strong>{form.id?'Edit assignment':'New assignment'}</strong><button type="button" className="admin-text-button" onClick={()=>setForm(null)}>Close</button></div><div className="admin-form-grid">
            <label className="form-field"><span>Course</span><select value={courseId} onChange={(e)=>void chooseCourse(e.target.value)}>{courses.map((c)=><option key={c.id} value={c.id}>{c.title}</option>)}</select></label>
            <label className="form-field"><span>Batch</span><select value={form.batchId} onChange={(e)=>void chooseBatch(e.target.value)}>{batches.map((b)=><option key={b.id} value={b.id}>{b.title}</option>)}</select></label>
            <label className="form-field admin-field-wide"><span>Subject scope</span><select value={form.subjectId} onChange={(e)=>setForm((c)=>c&&({...c,subjectId:e.target.value}))}><option value="">Whole batch</option>{subjects.map((s)=><option key={s.id} value={s.id}>{s.title}</option>)}</select></label>
            <label className="form-field"><span>Starts at</span><input type="datetime-local" value={form.startsAt} onChange={(e)=>setForm((c)=>c&&({...c,startsAt:e.target.value}))}/></label>
            <label className="form-field"><span>Ends at</span><input type="datetime-local" value={form.endsAt} onChange={(e)=>setForm((c)=>c&&({...c,endsAt:e.target.value}))}/></label>
            <label className="staff-check"><input type="checkbox" checked={form.isActive} onChange={(e)=>setForm((c)=>c&&({...c,isActive:e.target.checked}))}/><span>Assignment active</span></label>
          </div><div className="admin-form-actions"><button className="button button-small" disabled={busy}>{busy?'Saving…':'Save assignment'}</button></div></form></section>}
        </>}
      </div>
    </div>
  </div></section>
}
