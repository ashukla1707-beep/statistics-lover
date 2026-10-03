import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { BackLink } from '../../components/ui/BackLink'
import { useAuth } from '../auth'
import { listManagedBatches, listManagedCourses, type ManagedBatch, type ManagedCourse } from './academicAdminService'
import { AdminSubnav } from './AdminSubnav'
import { CollectionPager,CollectionToolbar,useCollectionPagination } from './CollectionControls'
import { listManagedLectures, listManagedModules, listManagedSubjects, type ManagedLecture, type ManagedModule, type ManagedSubject } from './contentAdminService'
import { deleteManagedQuestion, listManagedQuestions, saveManagedQuestion, type AssessmentDifficulty, type AssessmentQuestionSource, type AssessmentQuestionStatus, type AssessmentQuestionType, type ManagedQuestion } from './questionBankService'

type OptionDraft={text:string;isCorrect:boolean}
type FormState={
  id:string|null;subjectId:string;moduleId:string|null;lectureId:string|null;type:AssessmentQuestionType;difficulty:AssessmentDifficulty
  source:AssessmentQuestionSource;sourceLabel:string;sourceYear:string;prompt:string;explanation:string;marks:string;negativeMarks:string
  status:AssessmentQuestionStatus;options:OptionDraft[];answerText:string;numericAnswer:string;numericTolerance:string
}
const types:AssessmentQuestionType[]=['single_choice','multiple_choice','numeric','short_text']
const difficulties:AssessmentDifficulty[]=['easy','medium','hard']
const statuses:AssessmentQuestionStatus[]=['draft','published','archived']
const humanize=(v:string)=>v.replaceAll('_',' ').replace(/\b\w/g,(l)=>l.toUpperCase())
const errorMessage=(e:unknown)=>e instanceof Error?e.message:'Something went wrong.'

function blankForm(subjectId:string,moduleId:string|null,lectureId:string|null):FormState{
  return{id:null,subjectId,moduleId,lectureId,type:'single_choice',difficulty:'medium',source:'original',sourceLabel:'',sourceYear:'',prompt:'',explanation:'',marks:'1',negativeMarks:'0',status:'draft',
    options:[{text:'',isCorrect:true},{text:'',isCorrect:false},{text:'',isCorrect:false},{text:'',isCorrect:false}],answerText:'',numericAnswer:'',numericTolerance:'0'}
}
function fromQuestion(q:ManagedQuestion):FormState{
  return{id:q.id,subjectId:q.subjectId,moduleId:q.moduleId,lectureId:q.lectureId,type:q.type,difficulty:q.difficulty,source:q.source,
    sourceLabel:q.sourceLabel??'',sourceYear:q.sourceYear?.toString()??'',prompt:q.prompt,explanation:q.explanation??'',marks:q.marks.toString(),
    negativeMarks:q.negativeMarks.toString(),status:q.status,options:q.options.length?q.options.map((o)=>({text:o.text,isCorrect:o.isCorrect})):[{text:'',isCorrect:true},{text:'',isCorrect:false}],
    answerText:q.answerText,numericAnswer:q.numericAnswer?.toString()??'',numericTolerance:q.numericTolerance.toString()}
}

export function QuestionBankPage({teacherMode=false}:{teacherMode?:boolean}){
  const {identity}=useAuth()
  const canDelete=identity?.roles.some((role)=>role==='admin'||role==='owner')??false
  const [courses,setCourses]=useState<ManagedCourse[]>([]),[batches,setBatches]=useState<ManagedBatch[]>([])
  const [subjects,setSubjects]=useState<ManagedSubject[]>([]),[modules,setModules]=useState<ManagedModule[]>([]),[lectures,setLectures]=useState<ManagedLecture[]>([])
  const [questions,setQuestions]=useState<ManagedQuestion[]>([]),[form,setForm]=useState<FormState|null>(null)
  const [courseId,setCourseId]=useState(''),[batchId,setBatchId]=useState(''),[subjectId,setSubjectId]=useState(''),[moduleId,setModuleId]=useState(''),[lectureId,setLectureId]=useState('')
  const [typeFilter,setTypeFilter]=useState<'all'|AssessmentQuestionType>('all'),[sourceFilter,setSourceFilter]=useState<'all'|AssessmentQuestionSource>('all'),[questionQuery,setQuestionQuery]=useState('')
  const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState<string|null>(null),[notice,setNotice]=useState<string|null>(null)

  const visible=useMemo(()=>{const query=questionQuery.trim().toLowerCase();return questions.filter((q)=>(!moduleId||q.moduleId===moduleId||q.moduleId===null)&&(!lectureId||q.lectureId===lectureId||q.lectureId===null)&&(typeFilter==='all'||q.type===typeFilter)&&(sourceFilter==='all'||q.source===sourceFilter)&&(!query||[q.prompt,q.explanation??'',q.sourceLabel??'',q.sourceYear?.toString()??''].some((value)=>value.toLowerCase().includes(query))))},[questions,moduleId,lectureId,typeFilter,sourceFilter,questionQuery])
  const questionPager=useCollectionPagination(visible,20,`${subjectId}|${moduleId}|${lectureId}|${typeFilter}|${sourceFilter}|${questionQuery}`)

  async function refresh(id=subjectId){setQuestions(id?await listManagedQuestions(id):[])}
  async function chooseLecture(id:string,known=lectures){setLectures(known);setLectureId(id);setForm(null)}
  async function chooseModule(id:string,known=modules){setModules(known);setModuleId(id);setLectureId('');setForm(null);if(!id){setLectures([]);return}const rows=await listManagedLectures(id);setLectures(rows)}
  async function chooseSubject(id:string,known=subjects){setSubjects(known);setSubjectId(id);setModuleId('');setLectureId('');setLectures([]);setForm(null);if(!id){setModules([]);setQuestions([]);return}const [m,q]=await Promise.all([listManagedModules(id),listManagedQuestions(id)]);setModules(m);setQuestions(q)}
  async function chooseBatch(id:string,known=batches){setBatches(known);setBatchId(id);setSubjectId('');setModuleId('');setLectureId('');setModules([]);setLectures([]);setQuestions([]);setForm(null);if(!id){setSubjects([]);return}const rows=await listManagedSubjects(id);setSubjects(rows);if(rows[0])await chooseSubject(rows[0].id,rows)}
  async function chooseCourse(id:string,known=courses){setCourses(known);setCourseId(id);setBatchId('');setSubjectId('');setModuleId('');setLectureId('');setSubjects([]);setModules([]);setLectures([]);setQuestions([]);setForm(null);if(!id){setBatches([]);return}const rows=await listManagedBatches(id);setBatches(rows);if(rows[0])await chooseBatch(rows[0].id,rows)}

  useEffect(()=>{let active=true;void listManagedCourses().then(async(rows)=>{if(!active)return;setCourses(rows);if(rows[0])await chooseCourse(rows[0].id,rows)}).catch((e)=>active&&setError(errorMessage(e))).finally(()=>active&&setLoading(false));return()=>{active=false}},[])

  function changeType(type:AssessmentQuestionType){
    setForm((current)=>current&&({...current,type,options:(type==='single_choice'||type==='multiple_choice')?(current.options.length>=2?current.options:[{text:'',isCorrect:true},{text:'',isCorrect:false}]):current.options}))
  }
  function setOption(index:number,patch:Partial<OptionDraft>){
    setForm((current)=>{
      if(!current)return current
      const options=current.options.map((option,i)=>i===index?{...option,...patch}:option)
      if(current.type==='single_choice'&&patch.isCorrect) options.forEach((option,i)=>{option.isCorrect=i===index})
      return{...current,options}
    })
  }
  async function save(e:FormEvent){
    e.preventDefault();if(!form)return
    setSaving(true);setError(null);setNotice(null)
    try{
      const options=form.options.map((o,index)=>({text:o.text.trim(),position:index,isCorrect:o.isCorrect})).filter((o)=>o.text)
      await saveManagedQuestion({id:form.id,subjectId:form.subjectId,moduleId:form.moduleId,lectureId:form.lectureId,type:form.type,difficulty:form.difficulty,source:form.source,
        sourceLabel:form.sourceLabel,sourceYear:form.sourceYear?Number(form.sourceYear):null,prompt:form.prompt,explanation:form.explanation,marks:Number(form.marks),negativeMarks:Number(form.negativeMarks),
        status:form.status,options,answerText:form.answerText,numericAnswer:form.numericAnswer===''?null:Number(form.numericAnswer),numericTolerance:Number(form.numericTolerance||0)})
      await refresh(form.subjectId);setForm(null);setNotice('Question saved and answer shape validated.')
    }catch(e){setError(errorMessage(e))}finally{setSaving(false)}
  }
  async function remove(q:ManagedQuestion){if(!canDelete||!window.confirm('Delete this question from the bank?'))return;setSaving(true);try{await deleteManagedQuestion(q.id);await refresh(q.subjectId);setNotice('Question deleted.')}catch(e){setError(errorMessage(e))}finally{setSaving(false)}}

  return <section className="admin-page question-bank-page"><div className="container admin-shell">
    {teacherMode?<div className="teacher-mode-nav"><BackLink to="/teacher">Teacher workspace</BackLink><span>Subject-scoped access</span></div>:<AdminSubnav active="questions"/>}
    <header className="admin-page-heading"><div><span className="eyebrow">Assessment foundation</span><h1>Question Bank</h1><p>Create reusable questions and protected answer keys. Correct answers never flow through the student-facing tables.</p></div></header>
    {error&&<div className="admin-alert admin-alert-error">{error}</div>}{notice&&<div className="admin-alert admin-alert-success">{notice}</div>}
    <div className="question-context-grid">
      <label className="form-field"><span>Course</span><select value={courseId} disabled={loading||!courses.length} onChange={(e)=>void chooseCourse(e.target.value)}>{courses.map((x)=><option key={x.id} value={x.id}>{x.title}</option>)}</select></label>
      <label className="form-field"><span>Batch</span><select value={batchId} disabled={!batches.length} onChange={(e)=>void chooseBatch(e.target.value)}>{batches.map((x)=><option key={x.id} value={x.id}>{x.title}</option>)}</select></label>
      <label className="form-field"><span>Subject</span><select value={subjectId} disabled={!subjects.length} onChange={(e)=>void chooseSubject(e.target.value)}>{subjects.map((x)=><option key={x.id} value={x.id}>{x.title}</option>)}</select></label>
      <label className="form-field"><span>Module filter</span><select value={moduleId} disabled={!modules.length} onChange={(e)=>void chooseModule(e.target.value)}><option value="">All modules</option>{modules.map((x)=><option key={x.id} value={x.id}>{x.title}</option>)}</select></label>
      <label className="form-field"><span>Lecture filter</span><select value={lectureId} disabled={!moduleId||!lectures.length} onChange={(e)=>void chooseLecture(e.target.value)}><option value="">All lectures</option>{lectures.map((x)=><option key={x.id} value={x.id}>{x.title}</option>)}</select></label>
      <label className="form-field"><span>Type</span><select value={typeFilter} onChange={(e)=>setTypeFilter(e.target.value as 'all'|AssessmentQuestionType)}><option value="all">All types</option>{types.map((x)=><option key={x} value={x}>{humanize(x)}</option>)}</select></label>
      <label className="form-field"><span>Source</span><select value={sourceFilter} onChange={(e)=>setSourceFilter(e.target.value as 'all'|AssessmentQuestionSource)}><option value="all">All sources</option><option value="original">Original</option><option value="pyq">PYQ</option></select></label>
    </div>
    <section className="admin-panel question-list-panel"><div className="admin-panel-heading compact"><div><span>{visible.length} questions</span><h2>{subjects.find((x)=>x.id===subjectId)?.title??'Select subject'}</h2></div><button className="admin-icon-button" disabled={!subjectId} onClick={()=>setForm(blankForm(subjectId,moduleId||null,lectureId||null))}>+</button></div>
      {subjectId&&<CollectionToolbar query={questionQuery} onQueryChange={setQuestionQuery} placeholder="Search question, explanation or PYQ source" shown={visible.length} total={questions.length}/>}
      {!subjectId&&<p className="admin-empty">Select a subject to open its question bank.</p>}{subjectId&&!visible.length&&<p className="admin-empty">No matching questions yet.</p>}
      <div className="question-bank-list">{questionPager.pageItems.map((q)=><article className="question-bank-row" key={q.id}><div><div className="question-tags"><span>{humanize(q.type)}</span><span>{humanize(q.difficulty)}</span><span>{q.source==='pyq'?`PYQ ${q.sourceYear??''}`:'Original'}</span><span>{q.marks} mark{q.marks===1?'':'s'}</span></div><strong>{q.prompt}</strong><small>{humanize(q.status)}{q.negativeMarks>0?` · -${q.negativeMarks} negative`:''}</small></div><div className="lecture-admin-actions"><button className="admin-text-button" onClick={()=>setForm(fromQuestion(q))}>Edit</button>{canDelete&&<button className="admin-danger-button" disabled={saving} onClick={()=>void remove(q)}>Delete</button>}</div></article>)}</div>
      <CollectionPager page={questionPager.page} totalPages={questionPager.totalPages} pageSize={questionPager.pageSize} totalItems={visible.length} onPageChange={questionPager.setPage} onPageSizeChange={questionPager.setPageSize}/>
    </section>
    {form&&<section className="admin-panel question-editor"><form className="admin-form" onSubmit={save}>
      <div className="admin-form-subheading"><strong>{form.id?'Edit question':'New question'}</strong><button type="button" className="admin-text-button" onClick={()=>setForm(null)}>Close</button></div>
      <div className="admin-form-grid">
        <label className="form-field"><span>Type</span><select value={form.type} onChange={(e)=>changeType(e.target.value as AssessmentQuestionType)}>{types.map((x)=><option key={x} value={x}>{humanize(x)}</option>)}</select></label>
        <label className="form-field"><span>Difficulty</span><select value={form.difficulty} onChange={(e)=>setForm((x)=>x&&({...x,difficulty:e.target.value as AssessmentDifficulty}))}>{difficulties.map((x)=><option key={x} value={x}>{humanize(x)}</option>)}</select></label>
        <label className="form-field"><span>Status</span><select value={form.status} onChange={(e)=>setForm((x)=>x&&({...x,status:e.target.value as AssessmentQuestionStatus}))}>{statuses.map((x)=><option key={x} value={x}>{humanize(x)}</option>)}</select></label>
        <label className="form-field"><span>Source</span><select value={form.source} onChange={(e)=>setForm((x)=>x&&({...x,source:e.target.value as AssessmentQuestionSource}))}><option value="original">Original</option><option value="pyq">PYQ</option></select></label>
        {form.source==='pyq'&&<><label className="form-field"><span>PYQ year</span><input type="number" min={1900} max={2200} value={form.sourceYear} onChange={(e)=>setForm((x)=>x&&({...x,sourceYear:e.target.value}))}/></label><label className="form-field"><span>Exam/source label</span><input maxLength={180} value={form.sourceLabel} onChange={(e)=>setForm((x)=>x&&({...x,sourceLabel:e.target.value}))}/></label></>}
        <label className="form-field"><span>Marks</span><input type="number" min="0.01" step="0.01" value={form.marks} onChange={(e)=>setForm((x)=>x&&({...x,marks:e.target.value}))}/></label>
        <label className="form-field"><span>Negative marks</span><input type="number" min="0" step="0.01" value={form.negativeMarks} onChange={(e)=>setForm((x)=>x&&({...x,negativeMarks:e.target.value}))}/></label>
        <label className="form-field admin-field-wide"><span>Question</span><textarea required rows={5} maxLength={10000} value={form.prompt} onChange={(e)=>setForm((x)=>x&&({...x,prompt:e.target.value}))}/></label>
        <label className="form-field admin-field-wide"><span>Explanation</span><textarea rows={4} maxLength={12000} value={form.explanation} onChange={(e)=>setForm((x)=>x&&({...x,explanation:e.target.value}))}/></label>
      </div>
      {(form.type==='single_choice'||form.type==='multiple_choice')&&<div className="question-options-editor"><div className="admin-form-subheading"><strong>Answer options</strong><button type="button" className="admin-text-button" onClick={()=>setForm((x)=>x&&({...x,options:[...x.options,{text:'',isCorrect:false}]}))}>+ Add option</button></div>{form.options.map((option,index)=><div className="question-option-draft" key={index}><label><input type={form.type==='single_choice'?'radio':'checkbox'} name={form.type==='single_choice'?'correct-option':undefined} checked={option.isCorrect} onChange={(e)=>setOption(index,{isCorrect:e.target.checked})}/><span>Correct</span></label><input required value={option.text} placeholder={`Option ${index+1}`} onChange={(e)=>setOption(index,{text:e.target.value})}/>{form.options.length>2&&<button type="button" className="admin-danger-button" onClick={()=>setForm((x)=>x&&({...x,options:x.options.filter((_,i)=>i!==index)}))}>Remove</button>}</div>)}</div>}
      {form.type==='numeric'&&<div className="admin-form-grid"><label className="form-field"><span>Correct numeric answer</span><input required type="number" step="any" value={form.numericAnswer} onChange={(e)=>setForm((x)=>x&&({...x,numericAnswer:e.target.value}))}/></label><label className="form-field"><span>Allowed tolerance ±</span><input type="number" min="0" step="any" value={form.numericTolerance} onChange={(e)=>setForm((x)=>x&&({...x,numericTolerance:e.target.value}))}/></label></div>}
      {form.type==='short_text'&&<label className="form-field"><span>Expected answer</span><textarea required rows={3} maxLength={5000} value={form.answerText} onChange={(e)=>setForm((x)=>x&&({...x,answerText:e.target.value}))}/></label>}
      <div className="admin-form-actions"><button className="button button-small" disabled={saving}>{saving?'Saving…':'Save question'}</button></div>
    </form></section>}
  </div></section>
}
