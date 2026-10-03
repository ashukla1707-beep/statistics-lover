import { useEffect,useState } from 'react'
import { Link,useParams } from 'react-router-dom'
import { useAuth } from '../auth'
import { loadStudentCourseEnrollments,type StudentCourseEnrollment } from './courseService'
import { loadMyAssessmentSchedules,type StudentTestSchedule } from '../admin/testScheduleService'

const errorMessage=(e:unknown)=>e instanceof Error?e.message:'Unable to load tests.'
export function StudentTestsPage(){
  const {batchId=''}=useParams();const {identity}=useAuth()
  const [enrollment,setEnrollment]=useState<StudentCourseEnrollment|null>(null),[tests,setTests]=useState<StudentTestSchedule[]>([])
  const [loading,setLoading]=useState(true),[error,setError]=useState<string|null>(null)
  useEffect(()=>{if(!identity?.userId||!batchId)return;let active=true;void Promise.all([loadStudentCourseEnrollments(identity.userId),loadMyAssessmentSchedules(batchId)]).then(([enrollments,rows])=>{if(!active)return;const found=enrollments.find(x=>x.batch.id===batchId)??null;if(!found)throw new Error('This batch is not assigned to your account.');setEnrollment(found);setTests(rows)}).catch(e=>{if(active)setError(errorMessage(e))}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[batchId,identity?.userId])
  if(loading)return <div className="auth-state">Loading tests…</div>
  return <section className="student-tests-page"><div className="container student-tests-shell"><Link className="learning-back-link" to={`/learn/${batchId}`}>← Learning space</Link><header className="student-tests-hero"><span className="eyebrow">Assessments</span><h1>Tests</h1><p>{enrollment?.course.title} · {enrollment?.batch.title}</p></header>{error&&<div className="admin-alert admin-alert-error">{error}</div>}{!tests.length?<div className="learning-empty-card"><h2>No scheduled tests</h2><p>Upcoming tests assigned to you will appear here.</p></div>:<div className="student-test-list">{tests.map(test=>{const open=new Date(test.opensAt).getTime()<=Date.now();return <article className="student-test-card" key={test.scheduleId}><div><span className={open?'student-test-state is-open':'student-test-state'}>{open?'Open':'Upcoming'}</span><h2>{test.title}</h2>{test.description&&<p>{test.description}</p>}</div><div className="student-test-meta"><span>Opens {new Date(test.opensAt).toLocaleString()}</span><span>Closes {new Date(test.closesAt).toLocaleString()}</span>{test.durationMinutes&&<span>{test.durationMinutes} min</span>}<span>{test.maxAttempts} attempt{test.maxAttempts===1?'':'s'}</span></div><button className="button button-small" disabled>Test-taking activates in the next assessment checkpoint</button></article>})}</div>}</div></section>
}
