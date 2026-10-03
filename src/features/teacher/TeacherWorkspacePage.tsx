import { useEffect,useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth'
import { loadTeacherDashboard,type TeacherDashboardData } from './teacherDashboardService'

const dateTime=(value:string)=>new Date(value).toLocaleString([],{dateStyle:'medium',timeStyle:'short'})

export function TeacherWorkspacePage(){
  const {identity}=useAuth()
  const [data,setData]=useState<TeacherDashboardData|null>(null)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState<string|null>(null)
  const [currentTime]=useState(()=>Date.now())

  useEffect(()=>{if(!identity?.userId)return;let active=true;void loadTeacherDashboard(identity.userId).then((value)=>{if(active)setData(value)}).catch(()=>{if(active)setError('We could not load your teacher dashboard.')}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[identity?.userId])

  const activeAssignments=data?.assignments.filter((item)=>(!item.startsAt||new Date(item.startsAt).getTime()<=currentTime)&&(!item.endsAt||new Date(item.endsAt).getTime()>currentTime))??[]
  const upcomingLectures=data?.lectures.filter((lecture)=>new Date(lecture.scheduledAt).getTime()>=currentTime-30*60*1000)??[]
  const publishedAssignments=data?.coursework.filter((item)=>item.status==='published')??[]
  const publishedTests=data?.tests.filter((item)=>item.status==='published')??[]
  const publishedAnnouncements=data?.announcements.filter((item)=>item.status==='published')??[]
  const uniqueBatches=new Set(activeAssignments.map((item)=>item.batchId)).size
  const subjectScopes=activeAssignments.filter((item)=>item.subjectId!==null).length

  return <section className="teacher-dashboard-page"><div className="container teacher-dashboard-shell">
    <Link className="learning-back-link" to="/dashboard">← Student dashboard</Link>
    <header className="teacher-dashboard-hero"><div><span className="eyebrow">Teacher workspace</span><h1>Your teaching dashboard</h1><p>Only batches and subjects assigned to your account are included.</p></div><Link className="button button-small button-secondary" to="/notifications">Notifications</Link></header>
    {error&&<div className="admin-alert admin-alert-error">{error}</div>}
    {data?.partialFailures?<div className="teacher-dashboard-warning">Some teaching widgets could not refresh. Available scoped data remains usable.</div>:null}
    {loading?<div className="auth-state">Loading teacher dashboard…</div>:data&&<>
      <section className="teacher-dashboard-kpis">
        <article><span>Assigned batches</span><strong>{uniqueBatches}</strong><small>{activeAssignments.length} active scopes</small></article>
        <article><span>Subject scopes</span><strong>{subjectScopes}</strong><small>{activeAssignments.filter((item)=>item.subjectId===null).length} whole-batch scopes</small></article>
        <article><span>Upcoming classes</span><strong>{upcomingLectures.length}</strong><small>{upcomingLectures[0]?dateTime(upcomingLectures[0].scheduledAt):'No class scheduled'}</small></article>
        <article><span>Published tests</span><strong>{publishedTests.length}</strong><small>{publishedAssignments.length} published assignments</small></article>
      </section>

      <section className="teacher-dashboard-panel"><div className="teacher-dashboard-heading"><div><span className="eyebrow">Teaching scope</span><h2>Assigned batches & subjects</h2></div></div>
        {!activeAssignments.length?<div className="learning-empty-card"><h2>No active teaching assignment</h2><p>An admin must assign a batch or subject before teaching tools become available.</p></div>:<div className="teacher-scope-grid">{activeAssignments.map((assignment)=><article key={assignment.id}><span>{assignment.subjectTitle?'Subject scope':'Whole batch'}</span><strong>{assignment.courseTitle}</strong><h3>{assignment.batchTitle}</h3><p>{assignment.subjectTitle??'All subjects in this batch'}</p>{(assignment.startsAt||assignment.endsAt)&&<small>{assignment.startsAt?'From '+dateTime(assignment.startsAt):''}{assignment.startsAt&&assignment.endsAt?' · ':''}{assignment.endsAt?'Until '+dateTime(assignment.endsAt):''}</small>}</article>)}</div>}
      </section>

      <div className="teacher-dashboard-two-column">
        <section className="teacher-dashboard-panel"><div className="teacher-dashboard-heading"><div><span className="eyebrow">Schedule</span><h2>Upcoming lectures</h2></div><Link to="/teacher/delivery">Manage delivery →</Link></div>
          {!upcomingLectures.length?<p className="learning-muted">No upcoming lecture in your active scope.</p>:<div className="teacher-dashboard-list">{upcomingLectures.slice(0,6).map((lecture)=><article key={lecture.id}><div><strong>{lecture.title}</strong><span>{lecture.courseTitle} · {lecture.subjectTitle}</span><small>{dateTime(lecture.scheduledAt)}{lecture.durationMinutes?' · '+lecture.durationMinutes+' min':''}</small></div><Link className="admin-text-button" to="/teacher/delivery">Open</Link></article>)}</div>}
        </section>
        <section className="teacher-dashboard-panel"><div className="teacher-dashboard-heading"><div><span className="eyebrow">Content</span><h2>Current workload</h2></div></div>
          <div className="teacher-workload-grid"><Link to="/teacher/assignments"><strong>{publishedAssignments.length}</strong><span>Published assignments</span></Link><Link to="/teacher/tests"><strong>{publishedTests.length}</strong><span>Published tests</span></Link><Link to="/teacher/announcements"><strong>{publishedAnnouncements.length}</strong><span>Published announcements</span></Link><Link to="/teacher/questions"><strong>→</strong><span>Question bank</span></Link></div>
        </section>
      </div>

      <section className="teacher-dashboard-tools"><div className="teacher-dashboard-heading"><div><span className="eyebrow">Tools</span><h2>Teaching operations</h2></div></div><div className="teacher-tool-grid">
        <Link to="/teacher/delivery"><span>01</span><strong>Live & recordings</strong><small>Provider links and availability</small></Link>
        <Link to="/teacher/resources"><span>02</span><strong>Study material</strong><small>Notes, PYQs and resources</small></Link>
        <Link to="/teacher/attendance"><span>03</span><strong>Attendance</strong><small>Mark and review attendance</small></Link>
        <Link to="/teacher/assignments"><span>04</span><strong>Assignments</strong><small>Submissions, grading, feedback</small></Link>
        <Link to="/teacher/questions"><span>05</span><strong>Question bank</strong><small>Protected answer keys</small></Link>
        <Link to="/teacher/tests"><span>06</span><strong>Test builder</strong><small>Sections and marking rules</small></Link>
        <Link to="/teacher/test-schedules"><span>07</span><strong>Test scheduling</strong><small>Windows and audiences</small></Link>
        <Link to="/teacher/test-analytics"><span>08</span><strong>Analytics</strong><small>Scores and question accuracy</small></Link>
        <Link to="/teacher/announcements"><span>09</span><strong>Announcements</strong><small>Batch and subject notices</small></Link>
      </div></section>
    </>}
  </div></section>
}
