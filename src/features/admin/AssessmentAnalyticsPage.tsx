import { useEffect,useState } from 'react'
import { Link } from 'react-router-dom'
import { listManagedBatches,listManagedCourses,type ManagedBatch,type ManagedCourse } from './academicAdminService'
import { AdminSubnav } from './AdminSubnav'
import { loadAssessmentTestAnalytics,type TestAnalytics } from './assessmentAnalyticsService'
import { listManagedTests,type ManagedTest } from './testBuilderService'

const errorMessage=(e:unknown)=>e instanceof Error?e.message:'Unable to load analytics.'
const humanize=(v:string)=>v.replaceAll('_',' ').replace(/\b\w/g,(letter)=>letter.toUpperCase())
const pct=(value:number)=>`${Math.round(value*10)/10}%`

export function AssessmentAnalyticsPage({teacherMode=false}:{teacherMode?:boolean}){
  const [courses,setCourses]=useState<ManagedCourse[]>([]),[batches,setBatches]=useState<ManagedBatch[]>([]),[tests,setTests]=useState<ManagedTest[]>([])
  const [courseId,setCourseId]=useState(''),[batchId,setBatchId]=useState(''),[testId,setTestId]=useState('')
  const [analytics,setAnalytics]=useState<TestAnalytics|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState<string|null>(null)

  async function chooseTest(id:string,known=tests){
    setTests(known);setTestId(id);setAnalytics(null);setError(null)
    if(!id)return
    setAnalytics(await loadAssessmentTestAnalytics(id))
  }
  async function chooseBatch(id:string,known=batches){
    setBatches(known);setBatchId(id);setTestId('');setAnalytics(null)
    if(!id){setTests([]);return}
    const rows=await listManagedTests(id);setTests(rows);if(rows[0])await chooseTest(rows[0].id,rows)
  }
  async function chooseCourse(id:string,known=courses){
    setCourses(known);setCourseId(id);setBatchId('');setTestId('');setTests([]);setAnalytics(null)
    if(!id){setBatches([]);return}
    const rows=await listManagedBatches(id);setBatches(rows);if(rows[0])await chooseBatch(rows[0].id,rows)
  }

  useEffect(()=>{let active=true;void listManagedCourses().then(async rows=>{if(!active)return;setCourses(rows);if(rows[0])await chooseCourse(rows[0].id,rows)}).catch(e=>active&&setError(errorMessage(e))).finally(()=>active&&setLoading(false));return()=>{active=false}},[])

  const selectedTest=tests.find((test)=>test.id===testId)??null
  return <section className="admin-page assessment-analytics-page"><div className="container admin-shell">
    {teacherMode?<div className="teacher-mode-nav"><Link to="/teacher">← Teacher workspace</Link><span>Assignment-scoped analytics</span></div>:<AdminSubnav active="analytics"/>}
    <header className="admin-page-heading"><div><span className="eyebrow">Assessment intelligence</span><h1>Performance Analytics</h1><p>Review test performance from finalized attempt snapshots, including question accuracy and recent student attempts.</p></div></header>
    {error&&<div className="admin-alert admin-alert-error">{error}</div>}
    <div className="assessment-analytics-context">
      <label className="form-field"><span>Course</span><select value={courseId} disabled={loading||!courses.length} onChange={e=>void chooseCourse(e.target.value)}>{courses.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</select></label>
      <label className="form-field"><span>Batch</span><select value={batchId} disabled={!batches.length} onChange={e=>void chooseBatch(e.target.value)}>{batches.map(b=><option key={b.id} value={b.id}>{b.title}</option>)}</select></label>
      <label className="form-field"><span>Test</span><select value={testId} disabled={!tests.length} onChange={e=>void chooseTest(e.target.value)}>{tests.map(t=><option key={t.id} value={t.id}>{t.title}</option>)}</select></label>
    </div>
    {!selectedTest&&<div className="learning-empty-card"><h2>Select a test</h2><p>Analytics appear after students submit scored attempts.</p></div>}
    {selectedTest&&analytics&&<>
      <section className="assessment-kpi-grid">
        <article><span>Attempts</span><strong>{analytics.summary.attemptCount}</strong><small>{analytics.summary.studentCount} students</small></article>
        <article><span>Average</span><strong>{pct(analytics.summary.averagePercentage)}</strong><small>{analytics.summary.averageScore} / {analytics.summary.averageMaxScore} avg score</small></article>
        <article><span>Highest</span><strong>{pct(analytics.summary.highestPercentage)}</strong><small>Best attempt</small></article>
        <article><span>Lowest</span><strong>{pct(analytics.summary.lowestPercentage)}</strong><small>Lowest scored attempt</small></article>
      </section>
      <section className="admin-panel analytics-question-panel"><div className="admin-panel-heading compact"><div><span>Question analysis</span><h2>{selectedTest.title}</h2></div></div>
        {!analytics.questions.length?<p className="admin-empty">No scored question data yet.</p>:<div className="analytics-question-table"><div className="analytics-table-head"><span>Question</span><span>Accuracy</span><span>Answered</span><span>Avg marks</span></div>{analytics.questions.map((q)=><article key={q.questionId}><div><strong>{q.prompt}</strong><small>{humanize(q.type)} · {q.marks} marks</small></div><div className="analytics-accuracy"><span>{pct(q.accuracyPercentage)}</span><div><i style={{width:`${Math.max(0,Math.min(100,q.accuracyPercentage))}%`}} /></div></div><span>{q.answered}/{q.attempts}</span><span>{q.averageAwarded}</span></article>)}</div>}
      </section>
      <section className="admin-panel analytics-attempt-panel"><div className="admin-panel-heading compact"><div><span>Recent attempts</span><h2>Student performance</h2></div></div>
        {!analytics.recentAttempts.length?<p className="admin-empty">No scored attempts yet.</p>:<div className="analytics-attempt-list">{analytics.recentAttempts.map(a=><article key={a.attemptId}><div><strong>{a.fullName||a.email||'Student'}</strong><small>{a.email} · Attempt {a.attemptNumber}{a.submittedAt?` · ${new Date(a.submittedAt).toLocaleString()}`:''}</small></div><div><strong>{a.score} / {a.maxScore}</strong><span>{pct(a.percentage)}</span></div></article>)}</div>}
      </section>
    </>}
  </div></section>
}
