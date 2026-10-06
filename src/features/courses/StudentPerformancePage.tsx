import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../auth'
import {
  loadMyAssessmentAnalytics, loadMyAssessmentInsights,
  type StudentAssessmentAnalytics, type StudentAssessmentInsights,
} from '../admin/assessmentAnalyticsService'
import { loadStudentCourseEnrollments, type StudentCourseEnrollment } from './courseService'

const errorMessage = (error:unknown) => error instanceof Error ? error.message : 'Unable to load performance.'
const pct = (value:number) => `${Math.round(value*10)/10}%`
const clamp = (value:number) => Math.max(0,Math.min(100,value))

export function StudentPerformancePage(){
  const {batchId=''}=useParams()
  const {identity}=useAuth()
  const [enrollment,setEnrollment]=useState<StudentCourseEnrollment|null>(null)
  const [analytics,setAnalytics]=useState<StudentAssessmentAnalytics|null>(null)
  const [insights,setInsights]=useState<StudentAssessmentInsights|null>(null)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState<string|null>(null)
  const [insightsUnavailable,setInsightsUnavailable]=useState(false)

  useEffect(()=>{
    if(!identity?.userId||!batchId)return
    let active=true
    setLoading(true)
    setError(null)
    void Promise.all([
      loadStudentCourseEnrollments(identity.userId),
      loadMyAssessmentAnalytics(batchId),
      loadMyAssessmentInsights(batchId).catch(()=>null),
    ]).then(([enrollments,data,extra])=>{
      if(!active)return
      const found=enrollments.find(item=>item.batch.id===batchId)??null
      if(!found)throw new Error('This batch is not assigned to your account.')
      setEnrollment(found)
      setAnalytics(data)
      setInsights(extra)
      setInsightsUnavailable(extra===null)
    }).catch(err=>{if(active)setError(errorMessage(err))})
      .finally(()=>{if(active)setLoading(false)})
    return()=>{active=false}
  },[batchId,identity?.userId])

  const summary=analytics?.summary
  const completed=[...(analytics?.recentAttempts??[])].reverse().slice(-8)
  const points=completed.map((attempt,index)=>{
    const x=completed.length===1?350:38+(index/(completed.length-1))*624
    const y=192-clamp(attempt.percentage)*1.58
    return {x,y,attempt}
  })
  const answered=(summary?.totalCorrect??0)+(summary?.totalIncorrect??0)
  const accuracy=answered>0?(summary!.totalCorrect/answered)*100:0
  const topics=(insights?.topics??[]).slice().sort((a,b)=>a.accuracyPercentage-b.accuracyPercentage)
  const subjectGaps=(analytics?.subjects??[]).filter(s=>s.answered>=3).sort((a,b)=>a.accuracyPercentage-b.accuracyPercentage)
  const weakTopic=topics.find(t=>t.answered>=3)
  const weakSubject=subjectGaps[0]
  const focus=weakTopic?{
    name:weakTopic.moduleTitle,context:weakTopic.subjectTitle,accuracy:weakTopic.accuracyPercentage,answered:weakTopic.answered,
  }:weakSubject?{
    name:weakSubject.subjectTitle,context:'Subject',accuracy:weakSubject.accuracyPercentage,answered:weakSubject.answered,
  }:null
  const rank=insights?.latestTestRank

  if(loading)return <div className="auth-state" role="status">Loading performance…</div>
  return <section className="student-performance-page"><div className="container student-performance-shell">
    <Link className="learning-back-link" to={`/learn/${batchId}`}>← Learning space</Link>
    <header className="student-performance-hero">
      <span className="eyebrow">My performance</span>
      <h1>Performance Analytics</h1>
      <p>{enrollment?.course.title} · {enrollment?.batch.title}</p>
      <div className="performance-hero-actions">
        <Link className="button button-small" to={`/learn/${batchId}/tests`}>Practice tests</Link>
        <Link className="button button-small button-secondary" to={`/learn/${batchId}`}>Course overview</Link>
      </div>
    </header>
    {error&&<div className="admin-alert admin-alert-error" role="alert">{error}</div>}
    {analytics&&<div className="performance-layout">
      <section className="student-performance-kpis" aria-label="Performance summary">
        <article><span>Completed attempts</span><strong>{summary?.attemptCount??0}</strong><small>Released results only</small></article>
        <article><span>Average score</span><strong>{pct(summary?.averagePercentage??0)}</strong><small>Across released attempts</small></article>
        <article><span>Best score</span><strong>{pct(summary?.bestPercentage??0)}</strong><small>Personal best</small></article>
        <article><span>Answer accuracy</span><strong>{answered?pct(accuracy):'—'}</strong><small>{summary?.totalCorrect??0} correct · {summary?.totalIncorrect??0} wrong · {summary?.totalUnanswered??0} skipped</small></article>
      </section>

      {(summary?.attemptCount??0)===0?<div className="learning-empty-card">
        <h2>Your performance journey starts here</h2>
        <p>Take a test and wait until the result is released. Your chart, strengths and ranking will then appear automatically.</p>
        <Link className="button button-small" to={`/learn/${batchId}/tests`}>Explore tests</Link>
      </div>:<>
        <div className="performance-two-column">
          <section className="performance-panel" aria-labelledby="performance-trend-title">
            <div className="student-performance-heading"><span className="eyebrow">Progress</span><h2 id="performance-trend-title">Score trend</h2></div>
            <p className="performance-panel-caption">Your last {completed.length} released attempt{completed.length===1?'':'s'} in chronological order. Scores are percentages of available marks.</p>
            <div className="performance-chart">
              <svg viewBox="0 0 700 240" role="img" aria-label={`Scores over time: ${completed.map(a=>pct(a.percentage)).join(', ')}`} preserveAspectRatio="xMidYMid meet">
                {[0,25,50,75,100].map(value=><g key={value}>
                  <line x1="38" x2="662" y1={192-value*1.58} y2={192-value*1.58} stroke="#e4e8f0" strokeDasharray="4 5" />
                  <text x="30" y={196-value*1.58} textAnchor="end" fontSize="12" fill="#66758b">{value}</text>
                </g>)}
                {points.length>1&&<polyline points={points.map(p=>`${p.x},${p.y}`).join(' ')} fill="none" stroke="#d4085f" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />}
                {points.map((point,index)=><g key={point.attempt.attemptId}>
                  <circle cx={point.x} cy={point.y} r="6.5" fill="#d4085f" stroke="white" strokeWidth="3"/>
                  <text x={point.x} y="221" textAnchor="middle" fontSize="12" fill="#43536e">{index+1}</text>
                </g>)}
              </svg>
            </div>
            <small className="performance-panel-caption">Horizontal axis: attempt order · Vertical axis: score % (0–100). Negative scores appear at the baseline.</small>
          </section>
          <section className="performance-panel" aria-labelledby="performance-ranking-title">
            <div className="student-performance-heading"><span className="eyebrow">Comparison</span><h2 id="performance-ranking-title">Latest test ranking</h2></div>
            {rank?<div className="performance-ranking">
              <div className="performance-rank-number">#{rank.rank}<span> of {rank.participants}</span></div>
              <strong>{rank.testTitle}</strong>
              <p>Best attempt: {pct(rank.bestPercentage)}. Compared with students who have a released, scored result for this same scheduled test.</p>
              <small>Tied scores share the same rank. This is a test rank, not an overall batch rank.</small>
            </div>:<p className="performance-panel-caption">A ranking will appear after a released test has scored participants.</p>}
            {insightsUnavailable&&<small className="performance-panel-caption">Extra insights are temporarily unavailable; your existing results are unaffected.</small>}
          </section>
        </div>

        <section className="student-subject-performance">
          <div className="student-performance-heading"><span className="eyebrow">By subject</span><h2>Strengths & gaps</h2></div>
          {!analytics.subjects.length?<div className="learning-empty-card"><p>No subject-level results are available yet.</p></div>:analytics.subjects.map(subject=><article key={subject.subjectId}>
            <div><strong>{subject.subjectTitle}</strong><small>{subject.correct}/{subject.answered} correct · {subject.questions} questions</small></div>
            <div className="student-subject-score"><span>{pct(subject.accuracyPercentage)} accuracy</span><div><i style={{width:`${clamp(subject.accuracyPercentage)}%`}} /></div><small>Marks earned: {pct(subject.scorePercentage)}</small></div>
          </article>)}
        </section>

        <section className="student-subject-performance" aria-labelledby="performance-topics-title">
          <div className="student-performance-heading"><span className="eyebrow">By topic</span><h2 id="performance-topics-title">Chapter accuracy</h2></div>
          {topics.length?topics.map(topic=><article key={topic.moduleId}>
            <div><strong>{topic.moduleTitle}</strong><small>{topic.subjectTitle} · {topic.correct}/{topic.answered} correct · {topic.questions} questions</small></div>
            <div className="student-subject-score"><span>{pct(topic.accuracyPercentage)} accuracy</span><div><i style={{width:`${clamp(topic.accuracyPercentage)}%`}} /></div><small>{topic.answered<3?'Early estimate: fewer than 3 answers':'Based on answered questions'}</small></div>
          </article>):<div className="learning-empty-card"><h3>Topic analytics are coming</h3><p>Questions must be linked to a chapter or module in the question bank. Until then, subject-level accuracy above is available.</p></div>}
        </section>

        <section className="performance-panel performance-advice" aria-labelledby="performance-advice-title">
          <div className="student-performance-heading"><span className="eyebrow">Study guidance</span><h2 id="performance-advice-title">Where to focus next</h2></div>
          {focus?<p>Revise <strong>{focus.name}</strong>{focus.context==='Subject'?'':` in ${focus.context}`}, then attempt a targeted practice test. Your current accuracy is <strong>{pct(focus.accuracy)}</strong> across {focus.answered} answered questions.</p>:<p>Keep practicing. After at least three answered questions in a subject or chapter, we'll highlight your weakest area here.</p>}
          <Link className="button button-small button-secondary" to={`/learn/${batchId}/tests`}>Go to tests</Link>
        </section>
      </>}

      <section className="student-recent-tests">
        <div className="student-performance-heading"><span className="eyebrow">History</span><h2>Recent released results</h2></div>
        {!analytics.recentAttempts.length?<p className="learning-muted">No released test history yet.</p>:analytics.recentAttempts.map(attempt=><article key={attempt.attemptId}>
          <div><strong>{attempt.testTitle}</strong><small>Attempt {attempt.attemptNumber}{attempt.submittedAt?` · ${new Date(attempt.submittedAt).toLocaleString()}`:''}</small></div>
          <div><strong>{attempt.score} / {attempt.maxScore}</strong><span>{pct(attempt.percentage)}</span></div>
        </article>)}
      </section>
    </div>}
  </div></section>
}
