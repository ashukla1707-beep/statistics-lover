import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth'
import { listManagedBatches, listManagedCourses, type ManagedBatch, type ManagedCourse } from './academicAdminService'
import { AdminSubnav } from './AdminSubnav'
import { CollectionPager,CollectionToolbar,useCollectionPagination } from './CollectionControls'
import { listManagedSubjects, type ManagedSubject } from './contentAdminService'
import { listManagedQuestions, type ManagedQuestion } from './questionBankService'
import { deleteManagedTest, listManagedTests, saveManagedTest, type AssessmentTestScope, type AssessmentTestStatus, type ManagedTest } from './testBuilderService'

type PlacementDraft={questionId:string;marks:string;negativeMarks:string}
type SectionDraft={subjectId:string;title:string;instructions:string;durationMinutes:string;questions:PlacementDraft[]}
type TestForm={
  id:string|null;batchId:string;scope:AssessmentTestScope;subjectId:string;title:string;description:string;instructions:string
  status:AssessmentTestStatus;durationMinutes:string;maxAttempts:string;shuffleQuestions:boolean;shuffleOptions:boolean;sections:SectionDraft[]
}

const statuses:AssessmentTestStatus[]=['draft','published','archived']
const humanize=(v:string)=>v.replaceAll('_',' ').replace(/\b\w/g,(l)=>l.toUpperCase())
const errorMessage=(e:unknown)=>e instanceof Error?e.message:'Something went wrong.'

function fromTest(test:ManagedTest):TestForm{
  return{id:test.id,batchId:test.batchId,scope:test.scope,subjectId:test.subjectId??'',title:test.title,description:test.description??'',instructions:test.instructions??'',status:test.status,durationMinutes:test.durationMinutes?.toString()??'',maxAttempts:test.maxAttempts.toString(),shuffleQuestions:test.shuffleQuestions,shuffleOptions:test.shuffleOptions,sections:test.sections.map((s)=>({subjectId:s.subjectId,title:s.title,instructions:s.instructions??'',durationMinutes:s.durationMinutes?.toString()??'',questions:s.questions.map((q)=>({questionId:q.questionId,marks:q.marks.toString(),negativeMarks:q.negativeMarks.toString()}))}))}
}

export function TestBuilderPage({teacherMode=false}:{teacherMode?:boolean}){
  const {identity}=useAuth()
  const canDelete=identity?.roles.some((r)=>r==='admin'||r==='owner')??false
  const [courses,setCourses]=useState<ManagedCourse[]>([]),[batches,setBatches]=useState<ManagedBatch[]>([]),[subjects,setSubjects]=useState<ManagedSubject[]>([])
  const [tests,setTests]=useState<ManagedTest[]>([]),[banks,setBanks]=useState<Record<string,ManagedQuestion[]>>({})
  const [courseId,setCourseId]=useState(''),[batchId,setBatchId]=useState(''),[form,setForm]=useState<TestForm|null>(null)
  const [bankSourceFilter,setBankSourceFilter]=useState<'all'|'original'|'pyq'>('all'),[pyqYearFilter,setPyqYearFilter]=useState('all')
  const [testQuery,setTestQuery]=useState(''),[testStatusFilter,setTestStatusFilter]=useState<'all'|AssessmentTestStatus>('all')
  const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState<string|null>(null),[notice,setNotice]=useState<string|null>(null)

  async function ensureBank(subjectId:string){
    if(!subjectId||banks[subjectId])return
    const rows=await listManagedQuestions(subjectId)
    setBanks((current)=>({...current,[subjectId]:rows.filter((q)=>q.status!=='archived')}))
  }
  async function refresh(id=batchId){setTests(id?await listManagedTests(id):[])}
  async function chooseBatch(id:string,known=batches){
    setBatches(known);setBatchId(id);setForm(null);setBanks({})
    if(!id){setSubjects([]);setTests([]);return}
    const [s,t]=await Promise.all([listManagedSubjects(id),listManagedTests(id)])
    setSubjects(s);setTests(t)
  }
  async function chooseCourse(id:string,known=courses){
    setCourses(known);setCourseId(id);setBatchId('');setSubjects([]);setTests([]);setForm(null)
    if(!id){setBatches([]);return}
    const rows=await listManagedBatches(id);setBatches(rows);if(rows[0])await chooseBatch(rows[0].id,rows)
  }
  useEffect(()=>{let active=true;void listManagedCourses().then(async(rows)=>{if(!active)return;setCourses(rows);if(rows[0])await chooseCourse(rows[0].id,rows)}).catch((e)=>active&&setError(errorMessage(e))).finally(()=>active&&setLoading(false));return()=>{active=false}},[])

  function newTest(pyqMode=false){
    const first=subjects[0]
    if(!batchId||!first)return
    setBankSourceFilter(pyqMode?'pyq':'all');setPyqYearFilter('all')
    const next:TestForm={id:null,batchId,scope:'subject',subjectId:first.id,title:pyqMode?'PYQ Practice Test':'',description:pyqMode?'Practice test built from previous-year questions.':'',instructions:'',status:'draft',durationMinutes:'60',maxAttempts:'1',shuffleQuestions:false,shuffleOptions:false,sections:[{subjectId:first.id,title:'Section 1',instructions:'',durationMinutes:'',questions:[]}]}
    setForm(next);void ensureBank(first.id)
  }
  async function editTest(test:ManagedTest){
    setBankSourceFilter('all');setPyqYearFilter('all')
    setForm(fromTest(test));setError(null);setNotice(null)
    for(const section of test.sections) await ensureBank(section.subjectId)
  }
  function changeScope(scope:AssessmentTestScope){
    setForm((current)=>{
      if(!current)return current
      const subjectId=scope==='subject'?(current.subjectId||subjects[0]?.id||''):''
      const sections=current.sections.map((s)=>({...s,subjectId:scope==='subject'?subjectId:s.subjectId}))
      if(subjectId)void ensureBank(subjectId)
      return{...current,scope,subjectId,sections}
    })
  }
  function patchSection(index:number,patch:Partial<SectionDraft>){
    setForm((current)=>{
      if(!current)return current
      const sections=current.sections.map((s,i)=>i===index?{...s,...patch}:s)
      return{...current,sections}
    })
  }
  function addSection(){
    if(!form)return
    const subjectId=form.scope==='subject'?form.subjectId:(subjects[0]?.id??'')
    if(!subjectId)return
    setForm({...form,sections:[...form.sections,{subjectId,title:`Section ${form.sections.length+1}`,instructions:'',durationMinutes:'',questions:[]}]})
    void ensureBank(subjectId)
  }
  function addQuestion(sectionIndex:number,q:ManagedQuestion){
    setForm((current)=>{
      if(!current)return current
      const sections=current.sections.map((section,index)=>index===sectionIndex?{...section,questions:[...section.questions,{questionId:q.id,marks:q.marks.toString(),negativeMarks:q.negativeMarks.toString()}]}:section)
      return{...current,sections}
    })
  }
  function patchQuestion(sectionIndex:number,questionIndex:number,patch:Partial<PlacementDraft>){
    setForm((current)=>{
      if(!current)return current
      const sections=current.sections.map((section,index)=>index===sectionIndex?{...section,questions:section.questions.map((q,qi)=>qi===questionIndex?{...q,...patch}:q)}:section)
      return{...current,sections}
    })
  }
  async function save(e:FormEvent){
    e.preventDefault();if(!form)return
    setSaving(true);setError(null);setNotice(null)
    try{
      if(form.scope==='subject'&&!form.subjectId)throw new Error('Select a subject for the test.')
      await saveManagedTest({id:form.id,batchId:form.batchId,scope:form.scope,subjectId:form.subjectId||null,title:form.title,description:form.description,instructions:form.instructions,status:form.status,durationMinutes:form.durationMinutes?Number(form.durationMinutes):null,maxAttempts:Number(form.maxAttempts||1),shuffleQuestions:form.shuffleQuestions,shuffleOptions:form.shuffleOptions,sections:form.sections.map((s,position)=>({subjectId:s.subjectId,title:s.title,instructions:s.instructions,position,durationMinutes:s.durationMinutes?Number(s.durationMinutes):null,questions:s.questions.map((q,qPosition)=>({questionId:q.questionId,position:qPosition,marks:Number(q.marks),negativeMarks:Number(q.negativeMarks||0)}))}))})
      await refresh(form.batchId);setForm(null);setNotice('Test structure saved.')
    }catch(e){setError(errorMessage(e))}finally{setSaving(false)}
  }
  async function remove(test:ManagedTest){if(!canDelete||!window.confirm(`Delete “${test.title}”?`))return;setSaving(true);try{await deleteManagedTest(test.id);await refresh(test.batchId);setNotice('Test deleted.')}catch(e){setError(errorMessage(e))}finally{setSaving(false)}}

  const filteredTests=useMemo(()=>{const query=testQuery.trim().toLowerCase();return tests.filter((test)=>(testStatusFilter==='all'||test.status===testStatusFilter)&&(!query||[test.title,test.description??'',test.scope,test.status].some((value)=>value.toLowerCase().includes(query))))},[tests,testQuery,testStatusFilter])
  const testPager=useCollectionPagination(filteredTests,20,`${batchId}|${testQuery}|${testStatusFilter}`)
  const pyqYears=[...new Set(Object.values(banks).flatMap((questions)=>questions.filter((q)=>q.source==='pyq'&&q.sourceYear!==null).map((q)=>q.sourceYear as number)))].sort((a,b)=>b-a)

  return <section className="admin-page test-builder-page"><div className="container admin-shell">
    {teacherMode?<div className="teacher-mode-nav"><Link to="/teacher">← Teacher workspace</Link><span>Assignment-scoped access</span></div>:<AdminSubnav active="tests"/>}
    <header className="admin-page-heading"><div><span className="eyebrow">Assessment builder</span><h1>Tests & Sections</h1><p>Compose subject or full-batch tests from the protected question bank, with section ordering and test-specific marking.</p></div></header>
    {error&&<div className="admin-alert admin-alert-error">{error}</div>}{notice&&<div className="admin-alert admin-alert-success">{notice}</div>}
    <div className="test-context-grid"><label className="form-field"><span>Course</span><select value={courseId} disabled={loading||!courses.length} onChange={(e)=>void chooseCourse(e.target.value)}>{courses.map((x)=><option key={x.id} value={x.id}>{x.title}</option>)}</select></label><label className="form-field"><span>Batch</span><select value={batchId} disabled={!batches.length} onChange={(e)=>void chooseBatch(e.target.value)}>{batches.map((x)=><option key={x.id} value={x.id}>{x.title}</option>)}</select></label></div>
    <section className="admin-panel test-list-panel"><div className="admin-panel-heading compact"><div><span>{tests.length} tests</span><h2>Assessment library</h2></div><div className="test-create-actions"><button className="admin-text-button" type="button" disabled={!batchId||!subjects.length} onClick={()=>newTest(true)}>+ PYQ test</button><button className="admin-icon-button" type="button" disabled={!batchId||!subjects.length} onClick={()=>newTest(false)}>+</button></div></div><CollectionToolbar query={testQuery} onQueryChange={setTestQuery} placeholder="Search tests" shown={filteredTests.length} total={tests.length}><select aria-label="Test status" value={testStatusFilter} onChange={(e)=>setTestStatusFilter(e.target.value as 'all'|AssessmentTestStatus)}><option value="all">All statuses</option>{statuses.map((status)=><option key={status} value={status}>{humanize(status)}</option>)}</select></CollectionToolbar>{!tests.length&&<p className="admin-empty">No tests in this batch yet.</p>}{tests.length>0&&!filteredTests.length&&<p className="admin-empty">No matching tests.</p>}<div className="test-admin-list">{testPager.pageItems.map((test)=><article className="test-admin-row" key={test.id}><div><span className={`admin-status admin-status-${test.status}`}>{humanize(test.status)}</span><strong>{test.title}</strong><small>{humanize(test.scope)} · {test.sections.length} section{test.sections.length===1?'':'s'} · {test.sections.reduce((n,s)=>n+s.questions.length,0)} questions{test.sections.reduce((n,s)=>n+s.questions.filter((q)=>q.source==='pyq').length,0)>0?` · ${test.sections.reduce((n,s)=>n+s.questions.filter((q)=>q.source==='pyq').length,0)} PYQ`:''}{test.durationMinutes?` · ${test.durationMinutes} min`:''}</small></div><div className="lecture-admin-actions"><button className="admin-text-button" onClick={()=>void editTest(test)}>Edit builder</button>{canDelete&&<button className="admin-danger-button" disabled={saving} onClick={()=>void remove(test)}>Delete</button>}</div></article>)}</div><CollectionPager page={testPager.page} totalPages={testPager.totalPages} pageSize={testPager.pageSize} totalItems={filteredTests.length} onPageChange={testPager.setPage} onPageSizeChange={testPager.setPageSize}/></section>
    {form&&<section className="admin-panel test-editor"><form className="admin-form" onSubmit={save}>
      <div className="admin-form-subheading"><strong>{form.id?'Edit test':'New test'}</strong><button type="button" className="admin-text-button" onClick={()=>setForm(null)}>Close</button></div>
      <div className="admin-form-grid">
        <label className="form-field admin-field-wide"><span>Title</span><input required minLength={2} maxLength={180} value={form.title} onChange={(e)=>setForm((x)=>x&&({...x,title:e.target.value}))}/></label>
        <label className="form-field"><span>Scope</span><select value={form.scope} onChange={(e)=>changeScope(e.target.value as AssessmentTestScope)}><option value="subject">Subject</option><option value="batch">Whole batch</option></select></label>
        {form.scope==='subject'&&<label className="form-field"><span>Subject</span><select value={form.subjectId} onChange={(e)=>{const id=e.target.value;setForm((x)=>x&&({...x,subjectId:id,sections:x.sections.map((s)=>({...s,subjectId:id}))}));void ensureBank(id)}}>{subjects.map((s)=><option key={s.id} value={s.id}>{s.title}</option>)}</select></label>}
        <label className="form-field"><span>Status</span><select value={form.status} onChange={(e)=>setForm((x)=>x&&({...x,status:e.target.value as AssessmentTestStatus}))}>{statuses.map((s)=><option key={s} value={s}>{humanize(s)}</option>)}</select></label>
        <label className="form-field"><span>Total duration (min)</span><input type="number" min={1} value={form.durationMinutes} onChange={(e)=>setForm((x)=>x&&({...x,durationMinutes:e.target.value}))}/></label>
        <label className="form-field"><span>Max attempts</span><input type="number" min={1} max={100} value={form.maxAttempts} onChange={(e)=>setForm((x)=>x&&({...x,maxAttempts:e.target.value}))}/></label>
        <label className="form-field admin-field-wide"><span>Description</span><textarea rows={3} value={form.description} onChange={(e)=>setForm((x)=>x&&({...x,description:e.target.value}))}/></label>
        <label className="form-field admin-field-wide"><span>Instructions</span><textarea rows={4} value={form.instructions} onChange={(e)=>setForm((x)=>x&&({...x,instructions:e.target.value}))}/></label>
        <label className="staff-check"><input type="checkbox" checked={form.shuffleQuestions} onChange={(e)=>setForm((x)=>x&&({...x,shuffleQuestions:e.target.checked}))}/><span>Shuffle questions</span></label>
        <label className="staff-check"><input type="checkbox" checked={form.shuffleOptions} onChange={(e)=>setForm((x)=>x&&({...x,shuffleOptions:e.target.checked}))}/><span>Shuffle options</span></label>
      </div>
      <div className="test-bank-filters"><div><span className="test-builder-label">Question source</span><select value={bankSourceFilter} onChange={(e)=>{setBankSourceFilter(e.target.value as 'all'|'original'|'pyq');if(e.target.value!=='pyq')setPyqYearFilter('all')}}><option value="all">All questions</option><option value="original">Original only</option><option value="pyq">PYQ only</option></select></div>{bankSourceFilter==='pyq'&&<div><span className="test-builder-label">PYQ year</span><select value={pyqYearFilter} onChange={(e)=>setPyqYearFilter(e.target.value)}><option value="all">All years</option>{pyqYears.map((year)=><option key={year} value={year}>{year}</option>)}</select></div>}<p>PYQ filters affect only the question picker; selected questions stay in the test.</p></div>
      <div className="test-section-editor-list">{form.sections.map((section,sectionIndex)=>{
        const allBank=(banks[section.subjectId]??[]).filter((q)=>q.status==='published'||q.status==='draft')
        const bank=allBank.filter((q)=>(bankSourceFilter==='all'||q.source===bankSourceFilter)&&(pyqYearFilter==='all'||q.sourceYear===Number(pyqYearFilter)))
        const selectedIds=new Set(section.questions.map((q)=>q.questionId))
        return <section className="test-section-editor" key={sectionIndex}>
          <div className="test-section-heading"><strong>Section {sectionIndex+1}</strong><button type="button" className="admin-danger-button" disabled={form.sections.length===1} onClick={()=>setForm((x)=>x&&({...x,sections:x.sections.filter((_,i)=>i!==sectionIndex)}))}>Remove section</button></div>
          <div className="admin-form-grid">
            <label className="form-field"><span>Section title</span><input required value={section.title} onChange={(e)=>patchSection(sectionIndex,{title:e.target.value})}/></label>
            <label className="form-field"><span>Subject</span><select disabled={form.scope==='subject'} value={section.subjectId} onChange={(e)=>{patchSection(sectionIndex,{subjectId:e.target.value,questions:[]});void ensureBank(e.target.value)}}>{subjects.map((s)=><option key={s.id} value={s.id}>{s.title}</option>)}</select></label>
            <label className="form-field"><span>Section duration (optional)</span><input type="number" min={1} value={section.durationMinutes} onChange={(e)=>patchSection(sectionIndex,{durationMinutes:e.target.value})}/></label>
            <label className="form-field admin-field-wide"><span>Section instructions</span><input value={section.instructions} onChange={(e)=>patchSection(sectionIndex,{instructions:e.target.value})}/></label>
          </div>
          <div className="test-question-layout"><div className="test-selected-questions"><span className="test-builder-label">Selected questions</span>{!section.questions.length&&<p className="admin-empty">No questions selected.</p>}{section.questions.map((placement,qIndex)=>{const q=allBank.find((item)=>item.id===placement.questionId);return <article key={placement.questionId}><div><strong>{q?.prompt??'Question'}</strong><small>{q?`${humanize(q.type)} · ${q.source==='pyq'?`PYQ ${q.sourceYear??''}${q.sourceLabel?` · ${q.sourceLabel}`:''}`:'Original'}`:''}</small></div><label><span>Marks</span><input type="number" min="0.01" step="0.01" value={placement.marks} onChange={(e)=>patchQuestion(sectionIndex,qIndex,{marks:e.target.value})}/></label><label><span>Negative</span><input type="number" min="0" step="0.01" value={placement.negativeMarks} onChange={(e)=>patchQuestion(sectionIndex,qIndex,{negativeMarks:e.target.value})}/></label><button type="button" className="admin-danger-button" onClick={()=>patchSection(sectionIndex,{questions:section.questions.filter((_,i)=>i!==qIndex)})}>Remove</button></article>})}</div>
          <div className="test-question-bank"><span className="test-builder-label">Question bank</span>{bank.filter((q)=>!selectedIds.has(q.id)).map((q)=><button type="button" className="test-question-choice" key={q.id} onClick={()=>addQuestion(sectionIndex,q)}><strong>{q.prompt}</strong><small>{humanize(q.type)} · {q.marks} marks · {q.source==='pyq'?`PYQ ${q.sourceYear??''}${q.sourceLabel?` · ${q.sourceLabel}`:''}`:'Original'}</small><span>+ Add</span></button>)}</div></div>
        </section>
      })}</div>
      <div className="admin-form-actions"><button type="button" className="button button-small button-secondary" onClick={addSection}>Add section</button><button className="button button-small" disabled={saving}>{saving?'Saving…':'Save test'}</button></div>
    </form></section>}
  </div></section>
}
