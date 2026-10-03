import { requireSupabase } from '../../services/supabase/client'

export type LearningResourceKind = 'study_material' | 'notes' | 'pyq' | 'reference'
export type LearningResourceScope = 'batch' | 'subject' | 'module' | 'lecture'
export type LearningResourceProvider = 'google_drive' | 'external'
export type LearningResourceStatus = 'draft' | 'published' | 'archived'

export interface ManagedLearningResource {
  id: string
  batchId: string
  scope: LearningResourceScope
  subjectId: string | null
  moduleId: string | null
  lectureId: string | null
  kind: LearningResourceKind
  title: string
  description: string | null
  status: LearningResourceStatus
  releaseAt: string | null
  position: number
  provider: LearningResourceProvider | null
  providerReference: string
  actionLabel: string
  fileName: string
  mimeType: string
  sizeBytes: number | null
}

type ResourceRow = {
  id: string; batch_id: string; scope: LearningResourceScope
  subject_id: string | null; module_id: string | null; lecture_id: string | null
  kind: LearningResourceKind; title: string; description: string | null
  status: LearningResourceStatus; release_at: string | null; position: number
}
type SourceRow = {
  resource_id: string; provider: LearningResourceProvider; provider_reference: string
  action_label: string | null; file_name: string | null; mime_type: string | null; size_bytes: number | null
}

const resourceColumns='id,batch_id,scope,subject_id,module_id,lecture_id,kind,title,description,status,release_at,position'
const sourceColumns='resource_id,provider,provider_reference,action_label,file_name,mime_type,size_bytes'
const nullable=(value:string)=>value.trim()||null

function validateProvider(provider:LearningResourceProvider, reference:string) {
  let url: URL
  try { url=new URL(reference) } catch { throw new Error('Resource link must be a valid HTTPS URL.') }
  if (url.protocol!=='https:') throw new Error('Resource link must use HTTPS.')
  if (provider==='google_drive' && url.hostname!=='drive.google.com') {
    throw new Error('Google Drive resources must use a drive.google.com link.')
  }
}

export async function listManagedLearningResources(batchId:string):Promise<ManagedLearningResource[]> {
  const client=requireSupabase()
  const {data:resourceData,error:resourceError}=await client.from('learning_resources').select(resourceColumns).eq('batch_id',batchId).order('position').order('title')
  if(resourceError) throw resourceError
  const resources=(resourceData??[]) as ResourceRow[]
  if(resources.length===0) return []

  const {data:sourceData,error:sourceError}=await client.from('learning_resource_sources').select(sourceColumns).in('resource_id',resources.map((r)=>r.id))
  if(sourceError) throw sourceError
  const sourceMap=new Map(((sourceData??[]) as SourceRow[]).map((source)=>[source.resource_id,source]))

  return resources.map((resource)=>{
    const source=sourceMap.get(resource.id)
    return {
      id:resource.id,batchId:resource.batch_id,scope:resource.scope,subjectId:resource.subject_id,moduleId:resource.module_id,
      lectureId:resource.lecture_id,kind:resource.kind,title:resource.title,description:resource.description,status:resource.status,
      releaseAt:resource.release_at,position:resource.position,provider:source?.provider??null,providerReference:source?.provider_reference??'',
      actionLabel:source?.action_label??'',fileName:source?.file_name??'',mimeType:source?.mime_type??'',sizeBytes:source?.size_bytes??null,
    }
  })
}

export async function saveManagedLearningResource(input:{
  id:string|null; batchId:string; scope:LearningResourceScope; subjectId:string|null; moduleId:string|null; lectureId:string|null
  kind:LearningResourceKind; title:string; description:string; status:LearningResourceStatus; releaseAt:string|null; position:number
  provider:LearningResourceProvider; providerReference:string; actionLabel:string; fileName:string; mimeType:string; sizeBytes:number|null
}) {
  const client=requireSupabase()
  const reference=input.providerReference.trim()
  validateProvider(input.provider,reference)
  const row={
    batch_id:input.batchId,scope:input.scope,
    subject_id:input.scope==='subject'?input.subjectId:null,
    module_id:input.scope==='module'?input.moduleId:null,
    lecture_id:input.scope==='lecture'?input.lectureId:null,
    kind:input.kind,title:input.title.trim(),description:nullable(input.description),status:input.status,
    release_at:input.releaseAt,position:input.position,
  }
  let resourceId=input.id
  if(resourceId) {
    const {error}=await client.from('learning_resources').update(row).eq('id',resourceId)
    if(error) throw error
  } else {
    const {data,error}=await client.from('learning_resources').insert(row).select('id').single()
    if(error) throw error
    resourceId=(data as {id:string}).id
  }
  const {error:sourceError}=await client.from('learning_resource_sources').upsert({
    resource_id:resourceId,provider:input.provider,provider_reference:reference,action_label:nullable(input.actionLabel),
    file_name:nullable(input.fileName),mime_type:nullable(input.mimeType),size_bytes:input.sizeBytes,
  },{onConflict:'resource_id'})
  if(sourceError) throw sourceError
  return resourceId
}

export async function deleteManagedLearningResource(resourceId:string) {
  const {error}=await requireSupabase().from('learning_resources').delete().eq('id',resourceId)
  if(error) throw error
}
