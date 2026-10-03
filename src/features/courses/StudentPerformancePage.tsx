import { useEffect,useState } from 'react'
import { useParams } from 'react-router-dom'
import { BackLink } from '../../components/ui/BackLink'
import { useAuth } from '../auth'
import { loadMyAssessmentAnalytics,type StudentAssessmentAnalytics } from '../admin/assessmentAnalyticsService'
import { loadStudentCourseEnrollments,type StudentCourseEnrollment } from './courseService'

const errorMessage=(e:unknown)=>e instanceof Error?e.message:'Unable to load performance.'
const pct=(value:number)=>`${Math.round(value*10)/10}%`

export function StudentPerformancePage(){
  const {batchId=''}=useParams();const {identity}=useAuth()
  const [enrollment,setEnrollment]=useState<StudentCourseEnrollment|null>(null),[analytics,setAnalytics]=useState<StudentAssessmentAnalytics|null>(null)
  const [loading,setLoading]=useState(true),[error,setError]=useState<string|null>(null)

  useEffect(()=>{if(!identity?.userId||!batchId)return;let active=true;void Promise.all([loadStudentCourseEnrollments(identity.userId),loadMyAssessmentAnalytics(batchId)]).then(([enrollments,data])=>{if(!active)return;const found=enrollments.find(e=>e.batch.id===batchId)??null;if(!found)throw new Error('This batch is not assigned to your account.');setEnrollment(found);setAnalytics(data)}).catch(e=>{if(active)setError(errorMessage(e))}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[batchId,identity?.userId])

  if(loading)return <div className="auth-state">Loading performance…</div>
  return <section className="student-performance-page"><div className="container student-performance-shell">
    <BackLink className="learning-back-link" to={`/learn/${batchId}`}>Learning space</BackLink>
    <header className="student-performance-hero"><span className="eyebrow">My performance</span><h1>Assessment Analytics</h1><p>{enrollment?.course.title} · {enrollment?.batch.title}</p></header>
    {error&&<div className="admin-alert admin-alert-error">{error}</div>}
    {analytics&&<>
      <section className="student-performance-kpis">
        <article><span>Released attempts</span><strong>{analytics.summary.attemptCount}</strong></article>
        <article><span>Average score</span><strong>{pct(analytics.summary.averagePercentage)}</strong></article>
        <article><span>Best score</span><strong>{pct(analytics.summary.bestPercentage)}</strong></article>
        <article><span>Accuracy counts</span><strong>{analytics.summary.totalCorrect}</strong><small>{analytics.summary.totalIncorrect} wrong · {analytics.summary.totalUnanswered} unanswered</small></article>
      </section>
      <section className="student-subject-performance"><div className="student-performance-heading"><span className="eyebrow">By subject</span><h2>Strengths & gaps</h2></div>
        {!analytics.subjects.length?<div className="learning-empty-card"><h2>No released results yet</h2><p>Subject analytics appear after at least one test result is released.</p></div>:analytics.subjects.map(s=><article key={s.subjectId}><div><strong>{s.subjectTitle}</strong><small>{s.correct}/{s.answered} answered correctly · {s.questions} questions</small></div><div className="student-subject-score"><span>{pct(s.scorePercentage)}</span><div><i style={{width:`${Math.max(0,Math.min(100,s.scorePercentage))}%`}} /></div><small>Accuracy {pct(s.accuracyPercentage)}</small></div></article>)}
      </section>
      <section className="student-recent-tests"><div className="student-performance-heading"><span className="eyebrow">History</span><h2>Recent released results</h2></div>
        {!analytics.recentAttempts.length?<p className="learning-muted">No released test history yet.</p>:analytics.recentAttempts.map(a=><article key={a.attemptId}><div><strong>{a.testTitle}</strong><small>Attempt {a.attemptNumber}{a.submittedAt?` · ${new Date(a.submittedAt).toLocaleString()}`:''}</small></div><div><strong>{a.score} / {a.maxScore}</strong><span>{pct(a.percentage)}</span></div></article>)}
      </section>
    </>}
  </div></section>
}
