import { requireSupabase } from '../../services/supabase/client'

export type AnnouncementScope='global'|'batch'|'subject'
export type AnnouncementStatus='draft'|'published'|'archived'

export interface ManagedAnnouncement{
  id:string
  scope:AnnouncementScope
  batchId:string|null
  subjectId:string|null
  title:string
  body:string
  status:AnnouncementStatus
  publishAt:string|null
  expiresAt:string|null
  createdAt:string
  updatedAt:string
}
export interface InAppNotification{
  id:string
  kind:string
  sourceType:string|null
  sourceId:string|null
  title:string
  body:string
  actionUrl:string|null
  availableAt:string
  expiresAt:string|null
  readAt:string|null
  createdAt:string
}

type AnnouncementRow={id:string;scope:AnnouncementScope;batch_id:string|null;subject_id:string|null;title:string;body:string;status:AnnouncementStatus;publish_at:string|null;expires_at:string|null;created_at:string;updated_at:string}
type NotificationRow={id:string;kind:string;source_type:string|null;source_id:string|null;title:string;body:string;action_url:string|null;available_at:string;expires_at:string|null;read_at:string|null;created_at:string}
type SummaryRow={unread_count:number;total_count:number}

export async function listManagedAnnouncements():Promise<ManagedAnnouncement[]>{
  const {data,error}=await requireSupabase().from('announcements').select('id,scope,batch_id,subject_id,title,body,status,publish_at,expires_at,created_at,updated_at').order('created_at',{ascending:false})
  if(error)throw error
  return ((data??[]) as AnnouncementRow[]).map((r)=>({id:r.id,scope:r.scope,batchId:r.batch_id,subjectId:r.subject_id,title:r.title,body:r.body,status:r.status,publishAt:r.publish_at,expiresAt:r.expires_at,createdAt:r.created_at,updatedAt:r.updated_at}))
}

export async function saveAnnouncement(input:{id:string|null;scope:AnnouncementScope;batchId:string|null;subjectId:string|null;title:string;body:string;status:AnnouncementStatus;publishAt:string|null;expiresAt:string|null}){
  const {data,error}=await requireSupabase().rpc('save_announcement',{
    target_id:input.id,target_scope:input.scope,target_batch:input.scope==='global'?null:input.batchId,
    target_subject:input.scope==='subject'?input.subjectId:null,target_title:input.title,target_body:input.body,
    target_status:input.status,target_publish_at:input.publishAt,target_expires_at:input.expiresAt,
  })
  if(error)throw error
  return data as string
}

export async function deleteAnnouncement(id:string){
  const {error}=await requireSupabase().from('announcements').delete().eq('id',id)
  if(error)throw error
}

export async function loadMyNotifications(limit=100):Promise<InAppNotification[]>{
  const {data,error}=await requireSupabase().from('in_app_notifications').select('id,kind,source_type,source_id,title,body,action_url,available_at,expires_at,read_at,created_at').order('available_at',{ascending:false}).limit(limit)
  if(error)throw error
  return ((data??[]) as NotificationRow[]).map((r)=>({id:r.id,kind:r.kind,sourceType:r.source_type,sourceId:r.source_id,title:r.title,body:r.body,actionUrl:r.action_url,availableAt:r.available_at,expiresAt:r.expires_at,readAt:r.read_at,createdAt:r.created_at}))
}

export async function loadNotificationSummary(){
  const {data,error}=await requireSupabase().rpc('get_my_notification_summary')
  if(error)throw error
  const row=((data??[]) as SummaryRow[])[0]
  return{unreadCount:Number(row?.unread_count??0),totalCount:Number(row?.total_count??0)}
}
export async function markNotificationRead(id:string){
  const {error}=await requireSupabase().rpc('mark_notification_read',{target_notification:id})
  if(error)throw error
}
export async function markAllNotificationsRead(){
  const {error}=await requireSupabase().rpc('mark_all_notifications_read')
  if(error)throw error
}
