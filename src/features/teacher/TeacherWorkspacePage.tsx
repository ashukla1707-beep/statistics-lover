import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth'
import { loadMyTeacherAssignments, type MyTeacherAssignment } from './teacherService'

export function TeacherWorkspacePage(){
  const {identity}=useAuth()
  const [assignments,setAssignments]=useState<MyTeacherAssignment[]>([])
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState<string|null>(null)
  useEffect(()=>{if(!identity?.userId)return;let active=true;void loadMyTeacherAssignments(identity.userId).then((rows)=>active&&setAssignments(rows)).catch(()=>active&&setError('We could not load your teaching assignments.')).finally(()=>active&&setLoading(false));return()=>{active=false}},[identity?.userId])
  return <section className="teacher-page"><div className="container teacher-shell">
    <Link className="learning-back-link" to="/dashboard">← Dashboard</Link>
    <header className="teacher-hero"><span className="eyebrow">Teacher workspace</span><h1>Your teaching area</h1><p>Only batches and subjects assigned to your account are available here.</p></header>
    {error&&<div className="admin-alert admin-alert-error">{error}</div>}
    <div className="teacher-action-grid"><Link className="teacher-action-card" to="/teacher/delivery"><span>01</span><h2>Live & Recorded Access</h2><p>Manage Meet links, recording sources and availability windows for assigned lectures.</p></Link><Link className="teacher-action-card" to="/teacher/resources"><span>02</span><h2>Study Material</h2><p>Publish notes, PYQs and resources within your assigned teaching scope.</p></Link><Link className="teacher-action-card" to="/teacher/attendance"><span>03</span><h2>Attendance</h2><p>Mark and review lecture attendance for students in your assigned teaching areas.</p></Link><Link className="teacher-action-card" to="/teacher/assignments"><span>04</span><h2>Assignments</h2><p>Publish assignments, review private submissions, and return grades or feedback.</p></Link><Link className="teacher-action-card" to="/teacher/questions"><span>05</span><h2>Question Bank</h2><p>Create reusable assessment questions and protected answer keys for assigned subjects.</p></Link><Link className="teacher-action-card" to="/teacher/tests"><span>06</span><h2>Test Builder</h2><p>Build subject or full-batch tests with sections, marking rules and reusable questions.</p></Link></div>
    <section className="teacher-assignment-list"><div className="teacher-section-heading"><span className="eyebrow">Assignments</span><h2>Assigned batches & subjects</h2></div>{loading?<p>Loading assignments…</p>:!assignments.length?<div className="learning-empty-card"><h2>No active teaching assignment</h2><p>An admin needs to assign a batch or subject before teaching tools become available.</p></div>:assignments.map((a)=><article key={a.id}><strong>{a.courseTitle}</strong><h3>{a.batchTitle}</h3><p>{a.subjectTitle||'Whole batch access'}</p>{(a.startsAt||a.endsAt)&&<small>{a.startsAt?`From ${new Date(a.startsAt).toLocaleString()}`:''}{a.startsAt&&a.endsAt?' · ':''}{a.endsAt?`Until ${new Date(a.endsAt).toLocaleString()}`:''}</small>}</article>)}</section>
  </div></section>
}
