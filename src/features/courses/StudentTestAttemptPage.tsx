import { useEffect,useMemo,useRef,useState } from 'react'
import { Link,useParams } from 'react-router-dom'
import { loadAssessmentAttempt,loadAssessmentResult,saveAssessmentAnswer,startAssessmentAttempt,submitAssessmentAttempt,type AssessmentAttemptPayload,type AssessmentAttemptResult,type AttemptQuestion } from './assessmentAttemptService'

type LocalAnswer={selectedOptionIds:string[];answerText:string;numericAnswer:string}
const errorMessage=(e:unknown)=>e instanceof Error?e.message:'Something went wrong.'
const formatTime=(seconds:number)=>{const safe=Math.max(0,seconds);const h=Math.floor(safe/3600),m=Math.floor((safe%3600)/60),s=safe%60;return h>0?`${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`:`${m}:${String(s).padStart(2,'0')}`}

export function StudentTestAttemptPage(){
  const {batchId='',scheduleId=''}=useParams()
  const [payload,setPayload]=useState<AssessmentAttemptPayload|null>(null)
  const [result,setResult]=useState<AssessmentAttemptResult|null>(null)
  const [answers,setAnswers]=useState<Record<string,LocalAnswer>>({})
  const answersRef=useRef<Record<string,LocalAnswer>>({})
  const autoSubmitted=useRef(false)
  const [currentIndex,setCurrentIndex]=useState(0),[now,setNow]=useState(()=>Date.now())
  const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState<string|null>(null),[notice,setNotice]=useState<string|null>(null)

  const questions=useMemo(()=>payload?.sections.flatMap((section)=>section.questions.map((question)=>({...question,sectionTitle:section.title})))??[],[payload])
  const current=questions[currentIndex]??null
  const remaining=payload?Math.max(0,Math.ceil((new Date(payload.attempt.expires_at).getTime()-now)/1000)):0

  useEffect(()=>{answersRef.current=answers},[answers])

  async function persist(question:AttemptQuestion,source=answersRef.current){
    const answer=source[question.id]??{selectedOptionIds:[],answerText:'',numericAnswer:''}
    await saveAssessmentAnswer({questionId:question.id,selectedOptionIds:answer.selectedOptionIds,answerText:answer.answerText||null,numericAnswer:answer.numericAnswer===''?null:Number(answer.numericAnswer)})
  }
  async function persistAll(source=answersRef.current){
    if(!payload)return
    const all=payload.sections.flatMap((section)=>section.questions)
    await Promise.all(all.map((q)=>persist(q,source)))
  }
  async function finalize(attemptId:string){
    if(autoSubmitted.current)return
    autoSubmitted.current=true
    setSaving(true)
    try{
      await submitAssessmentAttempt(attemptId)
      const nextResult=await loadAssessmentResult(attemptId)
      setResult(nextResult)
      setPayload((currentPayload)=>currentPayload?{...currentPayload,attempt:{...currentPayload.attempt,status:nextResult.status as AssessmentAttemptPayload['attempt']['status']}}:currentPayload)
    }catch(e){setError(errorMessage(e));autoSubmitted.current=false}finally{setSaving(false)}
  }

  useEffect(()=>{
    if(!scheduleId)return
    let active=true
    void startAssessmentAttempt(scheduleId).then(async(attemptId)=>{
      const data=await loadAssessmentAttempt(attemptId)
      if(!active)return
      setPayload(data)
      setAnswers(Object.fromEntries(data.sections.flatMap((section)=>section.questions.map((q)=>[q.id,{selectedOptionIds:q.answer.selected_option_ids??[],answerText:q.answer.answer_text??'',numericAnswer:q.answer.numeric_answer?.toString()??''}]))))
      if(data.attempt.status!=='in_progress') setResult(await loadAssessmentResult(attemptId))
    }).catch((e)=>{if(active)setError(errorMessage(e))}).finally(()=>{if(active)setLoading(false)})
    return()=>{active=false}
  },[scheduleId])

  useEffect(()=>{
    if(!payload||payload.attempt.status!=='in_progress'||result)return
    const expiry=new Date(payload.attempt.expires_at).getTime()
    const timer=window.setInterval(()=>{
      const stamp=Date.now();setNow(stamp)
      const ms=expiry-stamp
      if(ms>0&&ms<=2500) void persistAll().catch(()=>undefined)
      if(ms<=0){window.clearInterval(timer);void finalize(payload.attempt.id)}
    },1000)
    return()=>window.clearInterval(timer)
  },[payload,result])

  function updateAnswer(questionId:string,patch:Partial<LocalAnswer>){
    setAnswers((currentAnswers)=>({...currentAnswers,[questionId]:{selectedOptionIds:currentAnswers[questionId]?.selectedOptionIds??[],answerText:currentAnswers[questionId]?.answerText??'',numericAnswer:currentAnswers[questionId]?.numericAnswer??'',...patch}}))
  }
  async function selectOption(question:AttemptQuestion,optionId:string,checked:boolean){
    const existing=answersRef.current[question.id]??{selectedOptionIds:[],answerText:'',numericAnswer:''}
    const selected=question.type==='single_choice'?[optionId]:checked?[...new Set([...existing.selectedOptionIds,optionId])]:existing.selectedOptionIds.filter((id)=>id!==optionId)
    const next={...existing,selectedOptionIds:selected}
    updateAnswer(question.id,next);answersRef.current={...answersRef.current,[question.id]:next}
    try{await persist(question,answersRef.current);setNotice('Answer saved.')}catch(e){setError(errorMessage(e))}
  }
  async function submit(){
    if(!payload||!window.confirm('Submit this test? You will not be able to change answers afterward.'))return
    setSaving(true);setError(null)
    try{await persistAll();await submitAssessmentAttempt(payload.attempt.id);setResult(await loadAssessmentResult(payload.attempt.id));setPayload({...payload,attempt:{...payload.attempt,status:'submitted'}})}catch(e){setError(errorMessage(e))}finally{setSaving(false)}
  }

  if(loading)return <div className="assessment-runner-loading">Preparing secure test attempt…</div>
  if(error&&!payload)return <section className="assessment-runner-error"><h1>Test unavailable</h1><p>{error}</p><Link className="button button-small" to={`/learn/${batchId}/tests`}>Back to tests</Link></section>

  if(result){
    return <section className="assessment-result-page"><div className="assessment-result-shell"><Link className="learning-back-link" to={`/learn/${batchId}/tests`}>← Tests</Link>{result.released?<><header className="assessment-result-hero"><span className="eyebrow">Result</span><h1>{payload?.attempt.title}</h1><div className="assessment-result-score"><strong>{result.score}</strong><span>/ {result.max_score}</span></div><div className="assessment-result-counts"><span>{result.correct_count} correct</span><span>{result.incorrect_count} incorrect</span><span>{result.unanswered_count} unanswered</span></div></header><div className="assessment-review-list">{result.questions?.map((q,index)=><article key={q.id} className={q.is_correct?'is-correct':q.was_answered?'is-wrong':'is-unanswered'}><div className="assessment-review-head"><strong>Q{index+1}. {q.prompt}</strong><span>{q.awarded_score} / {q.marks}</span></div><div className="assessment-review-options">{q.options.map((option)=><div key={option.id} className={q.correct_option_ids.includes(option.id)?'is-answer':q.selected_option_ids.includes(option.id)?'is-selected':''}>{option.text}</div>)}</div>{q.correct_answer_text&&<p>Expected answer: <strong>{q.correct_answer_text}</strong></p>}{q.correct_numeric_answer!==null&&<p>Correct answer: <strong>{q.correct_numeric_answer}</strong>{q.numeric_tolerance>0?` ± ${q.numeric_tolerance}`:''}</p>}</article>)}</div></>:<div className="learning-empty-card"><h1>Test submitted</h1><p>Your responses are saved. Results will appear according to the release policy set for this test.</p></div>}</div></section>
  }

  if(!payload||!current)return null
  const local=answers[current.id]??{selectedOptionIds:[],answerText:'',numericAnswer:''}
  const answered=(q:AttemptQuestion)=>{const a=answers[q.id];return Boolean(a&&(a.selectedOptionIds.length||a.answerText.trim()||a.numericAnswer!==''))}
  return <section className="assessment-runner"><header className="assessment-runner-header"><div><span>Statistics Lover Assessment</span><strong>{payload.attempt.title}</strong></div><div className={remaining<=300?'assessment-timer is-urgent':'assessment-timer'}>{formatTime(remaining)}</div></header>
    <div className="assessment-runner-body"><aside className="assessment-palette"><div><span>Attempt {payload.attempt.attempt_number}</span><strong>{questions.filter(answered).length}/{questions.length} answered</strong></div><div className="assessment-palette-grid">{questions.map((q,index)=><button key={q.id} className={`${index===currentIndex?'is-current ':''}${answered(q)?'is-answered':''}`} onClick={()=>setCurrentIndex(index)}>{index+1}</button>)}</div><Link to={`/learn/${batchId}/tests`}>Save & exit</Link></aside>
      <main className="assessment-question-stage"><div className="assessment-question-meta"><span>{current.sectionTitle}</span><span>{current.marks} marks{current.negative_marks>0?` · -${current.negative_marks}`:''}</span></div><h1><span>Q{currentIndex+1}.</span> {current.prompt}</h1>
        {(current.type==='single_choice'||current.type==='multiple_choice')&&<div className="assessment-options">{current.options.map(option=><label key={option.id} className={local.selectedOptionIds.includes(option.id)?'is-selected':''}><input type={current.type==='single_choice'?'radio':'checkbox'} name={current.type==='single_choice'?current.id:undefined} checked={local.selectedOptionIds.includes(option.id)} onChange={(e)=>void selectOption(current,option.id,e.target.checked)}/><span>{option.text}</span></label>)}</div>}
        {current.type==='numeric'&&<label className="assessment-text-answer"><span>Numeric answer</span><input type="number" step="any" value={local.numericAnswer} onChange={(e)=>updateAnswer(current.id,{numericAnswer:e.target.value})} onBlur={()=>void persist(current).catch((e)=>setError(errorMessage(e)))}/></label>}
        {current.type==='short_text'&&<label className="assessment-text-answer"><span>Your answer</span><textarea rows={5} maxLength={5000} value={local.answerText} onChange={(e)=>updateAnswer(current.id,{answerText:e.target.value})} onBlur={()=>void persist(current).catch((e)=>setError(errorMessage(e)))}/></label>}
        {error&&<div className="admin-alert admin-alert-error">{error}</div>}{notice&&<small className="assessment-save-note">{notice}</small>}
        <div className="assessment-question-actions"><button className="button button-small button-secondary" disabled={currentIndex===0} onClick={()=>setCurrentIndex((i)=>Math.max(0,i-1))}>Previous</button>{currentIndex<questions.length-1?<button className="button button-small" onClick={()=>setCurrentIndex((i)=>Math.min(questions.length-1,i+1))}>Next</button>:<button className="button button-small" disabled={saving} onClick={()=>void submit()}>{saving?'Submitting…':'Submit test'}</button>}</div>
      </main></div></section>
}
