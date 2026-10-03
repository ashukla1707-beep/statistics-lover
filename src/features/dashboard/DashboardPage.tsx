import { useEffect,useState } from 'react'
import { Link,useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'
import { loadStudentDashboard,type StudentDashboardData } from './studentDashboardService'

function formatRole(role:string){return role.replaceAll('_',' ').replace(/\b\w/g,(letter)=>letter.toUpperCase())}
const dateTime=(value:string)=>new Date(value).toLocaleString([], {dateStyle:'medium',timeStyle:'short'})

export function DashboardPage(){
  const navigate=useNavigate()
  const {identity,signOut}=useAuth()
  const [busy,setBusy]=useState(false)
  const [currentTime]=useState(()=>Date.now())
  const [data,setData]=useState<StudentDashboardData|null>(null)
  const [error,setError]=useState<string|null>(null)

  const studentId=identity?.userId??null
  useEffect(()=>{if(!studentId)return;let active=true;void loadStudentDashboard(studentId).then(value=>{if(active)setData(value)}).catch(()=>{if(active)setError('We could not load your dashboard right now. Please try again.')});return()=>{active=false}},[studentId])

  async function handleSignOut(){setBusy(true);try{await signOut();navigate('/',{replace:true})}finally{setBusy(false)}}

  const displayName=identity?.profile?.fullName||identity?.email||'Student'
  const isTeacher=identity?.roles.includes('teacher')??false
  const canAdmin=identity?.roles.some((role)=>role==='admin'||role==='owner'||role==='content_manager')??false
  const now=currentTime
  const nextLecture=data?.lectures.find((lecture)=>new Date(lecture.scheduledAt).getTime()>=now-30*60*1000)??data?.lectures[0]??null
  const openTests=data?.tests.filter((test)=>new Date(test.opensAt).getTime()<=now&&new Date(test.closesAt).getTime()>now)??[]
  const pendingAssignments=data?.assignments.filter((assignment)=>!assignment.submissionStatus||assignment.submissionStatus==='draft')??[]
  const pendingOrders=data?.orders.filter((order)=>order.status==='pending')??[]

  return <section className="student-dashboard-page"><div className="container student-dashboard-shell">
    <header className="student-dashboard-hero"><div><span className="eyebrow">My learning space</span><h1>Welcome, {displayName}.</h1><p>Your classes, coursework, assessments and account activity in one place.</p></div><button className="button button-secondary" type="button" onClick={handleSignOut} disabled={busy}>{busy?'Signing out…':'Sign out'}</button></header>

    <div className="portal-role-row" aria-label="Account roles">{(identity?.roles??[]).map((role)=><span className="role-badge" key={role}>{formatRole(role)}</span>)}</div>
    <div className="student-dashboard-actions"><Link className="button button-small" to="/store">Browse courses</Link><Link className="button button-small button-secondary" to="/orders">My orders</Link><Link className="button button-small button-secondary" to="/notifications">Notifications{data?.unreadNotifications?' ('+data.unreadNotifications+')':''}</Link>{isTeacher&&<Link className="button button-small button-secondary" to="/teacher">Teacher workspace</Link>}{canAdmin&&<Link className="button button-small button-secondary" to="/admin/overview">Admin workspace</Link>}</div>
    {error&&<div className="admin-alert admin-alert-error">{error}</div>}{data?.partialFailures?<div className="student-dashboard-warning">Some dashboard widgets could not refresh, but the available data below is still usable.</div>:null}

    {!data&&!error?<div className="auth-state">Loading your dashboard…</div>:data&&<>
      <section className="student-dashboard-kpis">
        <article><span>Enrolled batches</span><strong>{data.enrollments.length}</strong><small>{data.enrollments.filter((item)=>item.enrollmentStatus==='active').length} active</small></article>
        <article><span>Next class</span><strong>{nextLecture?new Date(nextLecture.scheduledAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):'—'}</strong><small>{nextLecture?nextLecture.title:'No upcoming class'}</small></article>
        <article><span>Tests open</span><strong>{openTests.length}</strong><small>{data.tests.length} upcoming/open</small></article>
        <article><span>To submit</span><strong>{pendingAssignments.length}</strong><small>{data.assignments.length} released assignments</small></article>
      </section>

      <section className="student-dashboard-section"><div className="student-dashboard-heading"><div><span className="eyebrow">Courses</span><h2>My enrolled batches</h2></div>{!data.enrollments.length&&<Link to="/store">Browse courses →</Link>}</div>
        {!data.enrollments.length?<div className="learning-empty-card"><h3>No active enrollment yet</h3><p>Browse available batches to get started.</p></div>:<div className="student-course-card-grid">{data.enrollments.map((enrollment)=><article key={enrollment.enrollmentId}>{enrollment.course.thumbnailUrl&&<img src={enrollment.course.thumbnailUrl} alt=""/>}<div><span>{enrollment.enrollmentStatus}</span><h3>{enrollment.course.title}</h3><p>{enrollment.batch.title}</p><div className="student-course-actions"><Link className="button button-small" to={'/learn/'+enrollment.batch.id}>Open course</Link><Link className="admin-text-button" to={'/learn/'+enrollment.batch.id+'/performance'}>Performance</Link></div></div></article>)}</div>}
      </section>

      <div className="student-dashboard-two-column">
        <section className="student-dashboard-panel"><div className="student-dashboard-heading"><div><span className="eyebrow">Schedule</span><h2>Upcoming classes</h2></div></div>{!data.lectures.length?<p className="learning-muted">No upcoming lectures are scheduled.</p>:<div className="student-dashboard-list">{data.lectures.slice(0,5).map((lecture)=><article key={lecture.lectureId}><div><strong>{lecture.title}</strong><span>{lecture.courseTitle} · {lecture.subjectTitle}</span><small>{dateTime(lecture.scheduledAt)}{lecture.durationMinutes?' · '+lecture.durationMinutes+' min':''}</small></div>{lecture.joinAction?<a className="button button-small" href={lecture.joinAction.actionUrl} target="_blank" rel="noreferrer">{lecture.joinAction.label}</a>:<Link className="admin-text-button" to={'/learn/'+lecture.batchId}>Course</Link>}</article>)}</div>}</section>
        <section className="student-dashboard-panel"><div className="student-dashboard-heading"><div><span className="eyebrow">Assessment</span><h2>Tests</h2></div></div>{!data.tests.length?<p className="learning-muted">No scheduled tests.</p>:<div className="student-dashboard-list">{data.tests.slice(0,5).map((test)=>{const isOpen=new Date(test.opensAt).getTime()<=now&&new Date(test.closesAt).getTime()>now;return <article key={test.scheduleId}><div><strong>{test.title}</strong><span>{test.courseTitle} · {test.batchTitle}</span><small>{isOpen?'Open now':'Opens '+dateTime(test.opensAt)} · closes {dateTime(test.closesAt)}</small></div><Link className={isOpen?'button button-small':'admin-text-button'} to={'/learn/'+test.batchId+'/tests'}>{isOpen?'Open test':'View tests'}</Link></article>})}</div>}</section>
      </div>

      <div className="student-dashboard-two-column">
        <section className="student-dashboard-panel"><div className="student-dashboard-heading"><div><span className="eyebrow">Coursework</span><h2>Assignments</h2></div></div>{!data.assignments.length?<p className="learning-muted">No released assignments.</p>:<div className="student-dashboard-list">{data.assignments.slice(0,5).map((assignment)=><article key={assignment.id}><div><strong>{assignment.title}</strong><span>{assignment.courseTitle} · {assignment.contextTitle}</span><small>{assignment.submissionStatus?formatRole(assignment.submissionStatus):'Not submitted'}{assignment.dueAt?' · Due '+dateTime(assignment.dueAt):''}</small></div><Link className="admin-text-button" to={'/learn/'+assignment.batchId+'/assignments'}>Open</Link></article>)}</div>}</section>
        <section className="student-dashboard-panel"><div className="student-dashboard-heading"><div><span className="eyebrow">Progress</span><h2>Attendance</h2></div></div>{!data.attendance.length?<p className="learning-muted">Attendance appears after classes are marked.</p>:<div className="student-attendance-summary">{data.attendance.map((row)=><article key={row.batchId}><div><strong>{row.courseTitle}</strong><span>{row.batchTitle}</span></div><div><strong>{row.percentage===null?'—':row.percentage+'%'}</strong><small>{row.attended}/{row.counted} attended</small></div></article>)}</div>}</section>
      </div>

      <section className="student-dashboard-account"><div><span className="eyebrow">Account</span><h2>Orders & notifications</h2><p>{pendingOrders.length?pendingOrders.length+' order'+(pendingOrders.length===1?' is':'s are')+' awaiting payment verification.':'No pending payment verification.'} {data.unreadNotifications?data.unreadNotifications+' unread notification'+(data.unreadNotifications===1?'':'s')+'.':'Your notification inbox is clear.'}</p></div><div><Link className="button button-small button-secondary" to="/orders">Orders</Link><Link className="button button-small" to="/notifications">Notifications</Link></div></section>
    </>}
  </div></section>
}
