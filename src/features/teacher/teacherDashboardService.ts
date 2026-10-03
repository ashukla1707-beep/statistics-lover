import { listManagedAssignments,type ManagedAssignment } from '../admin/assignmentService'
import { listManagedLectures,listManagedModules,listManagedSubjects } from '../admin/contentAdminService'
import { listManagedTests,type ManagedTest } from '../admin/testBuilderService'
import { listManagedAnnouncements,type ManagedAnnouncement } from '../communications/announcementService'
import { loadMyTeacherAssignments,type MyTeacherAssignment } from './teacherService'

export interface TeacherDashboardLecture{
  id:string
  title:string
  batchId:string
  batchTitle:string
  courseTitle:string
  subjectId:string
  subjectTitle:string
  moduleTitle:string
  scheduledAt:string
  durationMinutes:number|null
  status:string
}
export interface TeacherDashboardData{
  assignments:MyTeacherAssignment[]
  lectures:TeacherDashboardLecture[]
  coursework:ManagedAssignment[]
  tests:ManagedTest[]
  announcements:ManagedAnnouncement[]
  partialFailures:number
}

export async function loadTeacherDashboard(userId:string):Promise<TeacherDashboardData>{
  const assignments=await loadMyTeacherAssignments(userId)
  let partialFailures=0
  const accessByBatch=new Map<string,Set<string>|null>()
  for(const assignment of assignments){
    if(!accessByBatch.has(assignment.batchId))accessByBatch.set(assignment.batchId,new Set<string>())
    if(assignment.subjectId===null)accessByBatch.set(assignment.batchId,null)
    else{
      const current=accessByBatch.get(assignment.batchId)
      if(current)current.add(assignment.subjectId)
    }
  }

  const batchResults=await Promise.all([...accessByBatch.entries()].map(async([batchId,subjectAccess])=>{
    const assignmentMeta=assignments.find((item)=>item.batchId===batchId)
    const subjectsResult=await Promise.allSettled([listManagedSubjects(batchId),listManagedAssignments(batchId),listManagedTests(batchId)])
    partialFailures+=subjectsResult.filter((result)=>result.status==='rejected').length
    const subjects=subjectsResult[0].status==='fulfilled'?subjectsResult[0].value:[]
    const coursework=subjectsResult[1].status==='fulfilled'?subjectsResult[1].value:[]
    const tests=subjectsResult[2].status==='fulfilled'?subjectsResult[2].value:[]
    const visibleSubjects=subjectAccess===null?subjects:subjects.filter((subject)=>subjectAccess.has(subject.id))
    const lectures:TeacherDashboardLecture[]=[]

    for(const subject of visibleSubjects){
      try{
        const modules=await listManagedModules(subject.id)
        for(const module of modules){
          try{
            const moduleLectures=await listManagedLectures(module.id)
            for(const lecture of moduleLectures){
              if(!lecture.scheduledAt)continue
              lectures.push({
                id:lecture.id,title:lecture.title,batchId,batchTitle:assignmentMeta?.batchTitle??'Batch',
                courseTitle:assignmentMeta?.courseTitle??'Course',subjectId:subject.id,subjectTitle:subject.title,
                moduleTitle:module.title,scheduledAt:lecture.scheduledAt,durationMinutes:lecture.durationMinutes,status:lecture.status,
              })
            }
          }catch{partialFailures+=1}
        }
      }catch{partialFailures+=1}
    }
    return{lectures,coursework,tests}
  }))

  const announcementResult=await Promise.allSettled([listManagedAnnouncements()])
  if(announcementResult[0].status==='rejected')partialFailures+=1
  const now=Date.now()
  return{
    assignments,
    lectures:batchResults.flatMap((result)=>result.lectures).filter((lecture)=>new Date(lecture.scheduledAt).getTime()>=now-3*60*60*1000).sort((a,b)=>new Date(a.scheduledAt).getTime()-new Date(b.scheduledAt).getTime()),
    coursework:batchResults.flatMap((result)=>result.coursework),
    tests:batchResults.flatMap((result)=>result.tests),
    announcements:announcementResult[0].status==='fulfilled'?announcementResult[0].value:[],
    partialFailures,
  }
}
