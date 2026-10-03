import { requireSupabase } from '../../services/supabase/client'

export interface AuditLogEntry{
  id:number
  actorId:string|null
  actorName:string|null
  actorEmail:string|null
  actorRole:string|null
  action:string
  entityType:string
  entityId:string|null
  metadata:Record<string,unknown>
  occurredAt:string
}
export interface AppSetting{
  key:string
  value:unknown
  description:string|null
  updatedAt:string
  updatedBy:string|null
}

type AuditRow={
  id:number;actor_id:string|null;actor_role:string|null;action:string;entity_type:string;entity_id:string|null;metadata:Record<string,unknown>;occurred_at:string
  actor:{full_name:string|null;email:string|null}|null
}
type SettingRow={key:string;value:unknown;description:string|null;updated_at:string;updated_by:string|null}

export async function listAuditLogs(limit=500):Promise<AuditLogEntry[]>{
  const {data,error}=await requireSupabase().from('audit_logs').select(`
    id,actor_id,actor_role,action,entity_type,entity_id,metadata,occurred_at,
    actor:profiles!audit_logs_actor_id_fkey(full_name,email)
  `).order('occurred_at',{ascending:false}).limit(limit)
  if(error)throw error
  return ((data??[]) as unknown as AuditRow[]).map((row)=>({
    id:row.id,actorId:row.actor_id,actorName:row.actor?.full_name??null,actorEmail:row.actor?.email??null,actorRole:row.actor_role,
    action:row.action,entityType:row.entity_type,entityId:row.entity_id,metadata:row.metadata??{},occurredAt:row.occurred_at,
  }))
}

export async function listAppSettings():Promise<AppSetting[]>{
  const {data,error}=await requireSupabase().from('app_settings').select('key,value,description,updated_at,updated_by').order('key')
  if(error)throw error
  return ((data??[]) as SettingRow[]).map((row)=>({key:row.key,value:row.value,description:row.description,updatedAt:row.updated_at,updatedBy:row.updated_by}))
}

export async function saveAppSetting(key:string,value:unknown){
  const {error}=await requireSupabase().rpc('save_app_setting',{target_key:key,target_value:value})
  if(error)throw error
}
