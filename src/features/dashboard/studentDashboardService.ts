import { loadStudentAssignments,type StudentAssignment } from '../admin/assignmentService'
import { loadMyBatchAttendance } from '../admin/attendanceService'
import { loadMyAssessmentSchedules,type StudentTestSchedule } from '../admin/testScheduleService'
import { loadMyOrders,type StudentOrder } from '../commerce/commerceService'
import { loadNotificationSummary } from '../communications/announcementService'
import { loadStudentCourseEnrollments,type StudentCourseEnrollment } from '../courses/courseService'
import { loadBatchDeliveryActions,loadBatchLearningContent,type LectureDeliveryAction,type StudentLecture } from '../courses/learningService'

export interface DashboardLecture{
  lectureId:string
  batchId:string
  batchTitle:string
  courseTitle:string
  subjectTitle:string
  moduleTitle:string
  title:string
  scheduledAt:string
  durationMinutes:number|null
  status:StudentLecture['status']
  joinAction:LectureDeliveryAction|null
}
export interface DashboardTest extends StudentTestSchedule{batchId:string;batchTitle:string;courseTitle:string}
export interface DashboardAssignment extends StudentAssignment{batchId:string;batchTitle:string;courseTitle:string}
export interface DashboardAttendance{batchId:string;courseTitle:string;batchTitle:string;attended:number;counted:number;percentage:number|null}
export interface StudentDashboardData{
  enrollments:StudentCourseEnrollment[]
  lectures:DashboardLecture[]
  tests:DashboardTest[]
  assignments:DashboardAssignment[]
  attendance:DashboardAttendance[]
  orders:StudentOrder[]
  unreadNotifications:number
  partialFailures:number
}

export async function loadStudentDashboard(userId:string):Promise<StudentDashboardData>{
  const enrollments=await loadStudentCourseEnrollments(userId)
  const [notificationResult,ordersResult]=await Promise.allSettled([loadNotificationSummary(),loadMyOrders(userId)])
  let partialFailures=0
  if(notificationResult.status==='rejected')partialFailures+=1
  if(ordersResult.status==='rejected')partialFailures+=1

  const batchResults=await Promise.all(enrollments.map(async(enrollment)=>{
    const batchId=enrollment.batch.id
    const results=await Promise.allSettled([
      loadBatchLearningContent(batchId),
      loadBatchDeliveryActions(batchId),
      loadMyAssessmentSchedules(batchId),
      loadStudentAssignments(batchId),
      loadMyBatchAttendance(batchId),
    ])
    partialFailures+=results.filter((result)=>result.status==='rejected').length

    const subjects=results[0].status==='fulfilled'?results[0].value:[]
    const actions=results[1].status==='fulfilled'?results[1].value:[]
    const tests=results[2].status==='fulfilled'?results[2].value:[]
    const assignments=results[3].status==='fulfilled'?results[3].value:[]
    const attendance=results[4].status==='fulfilled'?results[4].value:[]

    const actionMap=new Map(actions.filter((action)=>action.actionKind==='join').map((action)=>[action.lectureId,action]))
    const lectures:DashboardLecture[]=[]
    for(const subject of subjects)for(const module of subject.modules)for(const lecture of module.lectures){
      if(!lecture.scheduledAt)continue
      lectures.push({lectureId:lecture.id,batchId,batchTitle:enrollment.batch.title,courseTitle:enrollment.course.title,subjectTitle:subject.title,moduleTitle:module.title,title:lecture.title,scheduledAt:lecture.scheduledAt,durationMinutes:lecture.durationMinutes,status:lecture.status,joinAction:actionMap.get(lecture.id)??null})
    }

    const counted=attendance.filter((record)=>record.status!=='excused')
    const attended=counted.filter((record)=>record.status==='present'||record.status==='late').length
    return{
      lectures,
      tests:tests.map((test)=>({...test,batchId,batchTitle:enrollment.batch.title,courseTitle:enrollment.course.title})),
      assignments:assignments.map((assignment)=>({...assignment,batchId,batchTitle:enrollment.batch.title,courseTitle:enrollment.course.title})),
      attendance:{batchId,courseTitle:enrollment.course.title,batchTitle:enrollment.batch.title,attended,counted:counted.length,percentage:counted.length?Math.round(attended/counted.length*100):null} as DashboardAttendance,
    }
  }))

  const now=Date.now()
  const lectures=batchResults.flatMap((result)=>result.lectures)
    .filter((lecture)=>new Date(lecture.scheduledAt).getTime()>=now-3*60*60*1000)
    .sort((a,b)=>new Date(a.scheduledAt).getTime()-new Date(b.scheduledAt).getTime())
  const tests=batchResults.flatMap((result)=>result.tests)
    .sort((a,b)=>new Date(a.opensAt).getTime()-new Date(b.opensAt).getTime())
  const assignments=batchResults.flatMap((result)=>result.assignments)
    .filter((assignment)=>assignment.submissionStatus!=='graded'&&assignment.submissionStatus!=='returned')
    .sort((a,b)=>{
      if(!a.dueAt&&!b.dueAt)return 0
      if(!a.dueAt)return 1
      if(!b.dueAt)return-1
      return new Date(a.dueAt).getTime()-new Date(b.dueAt).getTime()
    })

  return{
    enrollments,lectures,tests,assignments,attendance:batchResults.map((result)=>result.attendance),
    orders:ordersResult.status==='fulfilled'?ordersResult.value:[],
    unreadNotifications:notificationResult.status==='fulfilled'?notificationResult.value.unreadCount:0,
    partialFailures,
  }
}
