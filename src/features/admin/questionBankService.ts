import { requireSupabase } from '../../services/supabase/client'

export type AssessmentQuestionType='single_choice'|'multiple_choice'|'numeric'|'short_text'
export type AssessmentDifficulty='easy'|'medium'|'hard'
export type AssessmentQuestionSource='original'|'pyq'
export type AssessmentQuestionStatus='draft'|'published'|'archived'

export interface ManagedQuestionOption{
  id:string
  text:string
  position:number
  isCorrect:boolean
}
export interface ManagedQuestion{
  id:string
  subjectId:string
  moduleId:string|null
  lectureId:string|null
  type:AssessmentQuestionType
  difficulty:AssessmentDifficulty
  source:AssessmentQuestionSource
  sourceLabel:string|null
  sourceYear:number|null
  prompt:string
  explanation:string|null
  marks:number
  negativeMarks:number
  status:AssessmentQuestionStatus
  options:ManagedQuestionOption[]
  answerText:string
  numericAnswer:number|null
  numericTolerance:number
}

type QuestionRow={
  id:string;subject_id:string;module_id:string|null;lecture_id:string|null;question_type:AssessmentQuestionType
  difficulty:AssessmentDifficulty;source_type:AssessmentQuestionSource;source_label:string|null;source_year:number|null
  prompt:string;explanation:string|null;default_marks:number;default_negative_marks:number;status:AssessmentQuestionStatus
}
type OptionRow={id:string;question_id:string;option_text:string;position:number;is_correct:boolean}
type KeyRow={question_id:string;answer_text:string|null;numeric_answer:number|null;numeric_tolerance:number}

const questionColumns='id,subject_id,module_id,lecture_id,question_type,difficulty,source_type,source_label,source_year,prompt,explanation,default_marks,default_negative_marks,status'

export async function listManagedQuestions(subjectId:string):Promise<ManagedQuestion[]>{
  const client=requireSupabase()
  const {data,error}=await client.from('assessment_questions').select(questionColumns).eq('subject_id',subjectId).order('created_at',{ascending:false})
  if(error)throw error
  const questions=(data??[]) as QuestionRow[]
  if(!questions.length)return[]
  const ids=questions.map((q)=>q.id)
  const [{data:optionData,error:optionError},{data:keyData,error:keyError}]=await Promise.all([
    client.from('assessment_question_options').select('id,question_id,option_text,position,is_correct').in('question_id',ids).order('position'),
    client.from('assessment_question_keys').select('question_id,answer_text,numeric_answer,numeric_tolerance').in('question_id',ids),
  ])
  if(optionError)throw optionError
  if(keyError)throw keyError
  const optionMap=new Map<string,ManagedQuestionOption[]>()
  for(const row of (optionData??[]) as OptionRow[]){
    optionMap.set(row.question_id,[...(optionMap.get(row.question_id)??[]),{id:row.id,text:row.option_text,position:row.position,isCorrect:row.is_correct}])
  }
  const keyMap=new Map(((keyData??[]) as KeyRow[]).map((row)=>[row.question_id,row]))
  return questions.map((q)=>{
    const key=keyMap.get(q.id)
    return{
      id:q.id,subjectId:q.subject_id,moduleId:q.module_id,lectureId:q.lecture_id,type:q.question_type,difficulty:q.difficulty,
      source:q.source_type,sourceLabel:q.source_label,sourceYear:q.source_year,prompt:q.prompt,explanation:q.explanation,
      marks:q.default_marks,negativeMarks:q.default_negative_marks,status:q.status,options:optionMap.get(q.id)??[],
      answerText:key?.answer_text??'',numericAnswer:key?.numeric_answer??null,numericTolerance:key?.numeric_tolerance??0,
    }
  })
}

export async function saveManagedQuestion(input:{
  id:string|null;subjectId:string;moduleId:string|null;lectureId:string|null;type:AssessmentQuestionType
  difficulty:AssessmentDifficulty;source:AssessmentQuestionSource;sourceLabel:string;sourceYear:number|null
  prompt:string;explanation:string;marks:number;negativeMarks:number;status:AssessmentQuestionStatus
  options:Array<{text:string;position:number;isCorrect:boolean}>;answerText:string;numericAnswer:number|null;numericTolerance:number
}){
  const {data,error}=await requireSupabase().rpc('save_assessment_question',{
    target_question:input.id,target_subject:input.subjectId,target_module:input.moduleId,target_lecture:input.lectureId,
    target_type:input.type,target_difficulty:input.difficulty,target_source:input.source,target_source_label:input.sourceLabel.trim()||null,
    target_source_year:input.source==='pyq'?input.sourceYear:null,target_prompt:input.prompt,target_explanation:input.explanation.trim()||null,
    target_marks:input.marks,target_negative_marks:input.negativeMarks,target_status:input.status,target_options:input.options,
    target_answer_text:input.type==='short_text'?input.answerText:null,target_numeric_answer:input.type==='numeric'?input.numericAnswer:null,
    target_numeric_tolerance:input.type==='numeric'?input.numericTolerance:0,
  })
  if(error)throw error
  return data as string
}

export async function deleteManagedQuestion(id:string){
  const {error}=await requireSupabase().from('assessment_questions').delete().eq('id',id)
  if(error)throw error
}
