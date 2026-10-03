import { requireSupabase } from '../../services/supabase/client'

export interface AdminUpcomingLecture{
  id:string
  title:string
  status:string
  scheduledAt:string
  moduleTitle:string
  subjectTitle:string
  batchTitle:string
  courseTitle:string
}
export interface AdminOverviewData{
  courseCount:number
  batchCount:number
  upcomingLectureCount:number
  publishedTestCount:number
  publishedAnnouncementCount:number
  activeEnrollmentCount:number|null
  pendingOrderCount:number|null
  staffCount:number|null
  upcomingLectures:AdminUpcomingLecture[]
  partialFailures:number
}

type CountResult={count:number|null;error:unknown}
type LectureRow={
  id:string;title:string;status:string;scheduled_at:string
  module:{title:string;subject:{title:string;batch:{title:string;course:{title:string}|null}|null}|null}|null
}

async function countQuery(table:string,filter?:{column:string;value:string}):Promise<CountResult>{
  let query=requireSupabase().from(table).select('id',{count:'exact',head:true})
  if(filter)query=query.eq(filter.column,filter.value)
  const {count,error}=await query
  return{count,error}
}

export async function loadAdminOverview(canManageSensitive:boolean):Promise<AdminOverviewData>{
  const client=requireSupabase()
  const standard=await Promise.all([
    countQuery('courses'),
    countQuery('batches'),
    countQuery('lectures','' as never).catch(()=>({count:null,error:new Error('unused')})),
  ])
  // Replace the placeholder lecture count with a scheduled query so only future operational work is counted.
  const nowIso=new Date().toISOString()
  const [lectureCount,testCount,announcementCount,lectureRows]=await Promise.all([
    client.from('lectures').select('id',{count:'exact',head:true}).not('scheduled_at','is',null).gte('scheduled_at',nowIso),
    client.from('assessment_tests').select('id',{count:'exact',head:true}).eq('status','published'),
    client.from('announcements').select('id',{count:'exact',head:true}).eq('status','published'),
    client.from('lectures').select(`
      id,title,status,scheduled_at,
      module:modules!lectures_module_id_fkey(
        title,
        subject:subjects!modules_subject_id_fkey(
          title,
          batch:batches!subjects_batch_id_fkey(
            title,
            course:courses!batches_course_id_fkey(title)
          )
        )
      )
    `).not('scheduled_at','is',null).gte('scheduled_at',nowIso).order('scheduled_at',{ascending:true}).limit(8),
  ])

  let activeEnrollmentCount:number|null=null,pendingOrderCount:number|null=null,staffCount:number|null=null
  const failures:unknown[]=[
    standard[0].error,standard[1].error,lectureCount.error,testCount.error,announcementCount.error,lectureRows.error,
  ].filter(Boolean)

  if(canManageSensitive){
    const [enrollments,orders,staff]=await Promise.all([
      countQuery('enrollments',{column:'status',value:'active'}),
      countQuery('commerce_orders',{column:'status',value:'pending'}),
      client.from('user_roles').select('user_id',{count:'exact',head:true}).in('role',['teacher','content_manager','admin','owner']),
    ])
    activeEnrollmentCount=enrollments.count??0
    pendingOrderCount=orders.count??0
    staffCount=staff.count??0
    if(enrollments.error)failures.push(enrollments.error)
    if(orders.error)failures.push(orders.error)
    if(staff.error)failures.push(staff.error)
  }

  return{
    courseCount:standard[0].count??0,
    batchCount:standard[1].count??0,
    upcomingLectureCount:lectureCount.count??0,
    publishedTestCount:testCount.count??0,
    publishedAnnouncementCount:announcementCount.count??0,
    activeEnrollmentCount,pendingOrderCount,staffCount,
    upcomingLectures:((lectureRows.data??[]) as unknown as LectureRow[]).map((row)=>({
      id:row.id,title:row.title,status:row.status,scheduledAt:row.scheduled_at,moduleTitle:row.module?.title??'Module',
      subjectTitle:row.module?.subject?.title??'Subject',batchTitle:row.module?.subject?.batch?.title??'Batch',
      courseTitle:row.module?.subject?.batch?.course?.title??'Course',
    })),
    partialFailures:failures.length,
  }
}
