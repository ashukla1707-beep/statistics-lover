import { useEffect,useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth'
import { AdminSubnav } from './AdminSubnav'
import { loadAdminOverview,type AdminOverviewData } from './adminOverviewService'

const dateTime=(value:string)=>new Date(value).toLocaleString([],{dateStyle:'medium',timeStyle:'short'})

export function AdminOverviewPage(){
  const {identity}=useAuth()
  const canManageSensitive=identity?.roles.some((role)=>role==='admin'||role==='owner')??false
  const [data,setData]=useState<AdminOverviewData|null>(null)
  const [error,setError]=useState<string|null>(null)

  useEffect(()=>{let active=true;void loadAdminOverview(canManageSensitive).then((value)=>{if(active)setData(value)}).catch(()=>{if(active)setError('We could not load the operations overview.')});return()=>{active=false}},[canManageSensitive])

  return <section className="admin-page admin-overview-page"><div className="container admin-shell">
    <AdminSubnav active="overview"/>
    <header className="admin-page-heading"><div><span className="eyebrow">Operations</span><h1>Admin Overview</h1><p>Academic delivery, assessments, communication and account operations from one control center.</p></div></header>
    {error&&<div className="admin-alert admin-alert-error">{error}</div>}{data?.partialFailures?<div className="admin-overview-warning">Some overview counters could not refresh. Individual management workspaces remain available.</div>:null}
    {!data&&!error?<div className="auth-state">Loading operations overview…</div>:data&&<>
      <section className="admin-overview-kpis">
        <article><span>Courses</span><strong>{data.courseCount}</strong><small>{data.batchCount} batches</small></article>
        <article><span>Upcoming classes</span><strong>{data.upcomingLectureCount}</strong><small>Scheduled lecture records</small></article>
        <article><span>Published tests</span><strong>{data.publishedTestCount}</strong><small>Assessment library</small></article>
        <article><span>Announcements</span><strong>{data.publishedAnnouncementCount}</strong><small>Published notices</small></article>
        {canManageSensitive&&<article><span>Active enrollments</span><strong>{data.activeEnrollmentCount??0}</strong><small>Current student access</small></article>}
        {canManageSensitive&&<article><span>Pending orders</span><strong>{data.pendingOrderCount??0}</strong><small>Awaiting verification</small></article>}
        {canManageSensitive&&<article><span>Staff roles</span><strong>{data.staffCount??0}</strong><small>Teacher/admin role records</small></article>}
      </section>

      <div className="admin-overview-two-column">
        <section className="admin-overview-panel"><div className="admin-overview-heading"><div><span className="eyebrow">Schedule</span><h2>Upcoming lectures</h2></div><Link to="/admin/delivery">Delivery →</Link></div>
          {!data.upcomingLectures.length?<p className="admin-empty">No upcoming lectures are scheduled.</p>:<div className="admin-overview-list">{data.upcomingLectures.map((lecture)=><article key={lecture.id}><div><strong>{lecture.title}</strong><span>{lecture.courseTitle} · {lecture.subjectTitle}</span><small>{dateTime(lecture.scheduledAt)} · {lecture.status}</small></div><Link className="admin-text-button" to="/admin/content">Content</Link></article>)}</div>}
        </section>
        <section className="admin-overview-panel"><div className="admin-overview-heading"><div><span className="eyebrow">Quick actions</span><h2>Operations</h2></div></div><div className="admin-overview-actions">
          <Link to="/admin/academics"><strong>Academics</strong><span>Courses, batches and dates</span></Link>
          <Link to="/admin/content"><strong>Content</strong><span>Subjects, modules and lectures</span></Link>
          <Link to="/admin/tests"><strong>Assessments</strong><span>Question bank and test builder</span></Link>
          <Link to="/admin/announcements"><strong>Announcements</strong><span>Student communication</span></Link>
          {canManageSensitive&&<Link to="/admin/enrollments"><strong>Enrollments</strong><span>Student batch access</span></Link>}
          {canManageSensitive&&<Link to="/admin/commerce"><strong>Commerce</strong><span>Pricing, coupons and orders</span></Link>}
          {canManageSensitive&&<Link to="/admin/staff"><strong>Staff</strong><span>Roles and teacher assignments</span></Link>}
          {canManageSensitive&&<Link to="/admin/audit"><strong>Audit Log</strong><span>Critical operational changes</span></Link>}
          {canManageSensitive&&<Link to="/admin/settings"><strong>Settings</strong><span>Operational configuration</span></Link>}
        </div></section>
      </div>

      <section className="admin-overview-tools"><div className="admin-overview-heading"><div><span className="eyebrow">Workspaces</span><h2>All management areas</h2></div></div><div className="admin-overview-tool-grid">
        <Link to="/admin/resources"><span>Study Material</span><small>Notes, PYQs and files</small></Link>
        <Link to="/admin/assignments"><span>Assignments</span><small>Coursework and submissions</small></Link>
        <Link to="/admin/attendance"><span>Attendance</span><small>Lecture attendance</small></Link>
        <Link to="/admin/questions"><span>Question Bank</span><small>Protected answer keys</small></Link>
        <Link to="/admin/test-schedules"><span>Test Scheduling</span><small>Windows and audiences</small></Link>
        <Link to="/admin/test-analytics"><span>Test Analytics</span><small>Scores and accuracy</small></Link>
      </div></section>
    </>}
  </div></section>
}
