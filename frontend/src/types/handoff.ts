import type { DistributionGroup, DistributionMaterial, DistributionTask } from './distribution'

export interface MeetingHandoffParticipant {
  id: string
  name: string
  department: string
  role: string
  attendanceMode: 'onsite' | 'remote' | 'proxy'
}

export interface MeetingHandoffTask extends Omit<DistributionTask, 'status'> {
  status: DistributionTask['status'] | 'doing' | 'review' | 'done' | 'exception'
  progress?: number
  feedbackCount?: number
  updatedAt?: string
}

export interface MeetingHandoff {
  id: string
  scene: 'security-summit'
  title: string
  eventName: string
  startTime: string
  endTime: string
  location: string
  chair: string
  participants: MeetingHandoffParticipant[]
  agenda: string[]
  materials: DistributionMaterial[]
  groups: DistributionGroup[]
  tasks: MeetingHandoffTask[]
  noticeReceipt: { messageId?: string; delivered: string[] }
  planVersion: string
  signoffRecordId: string
  status: string
  updatedAt: string
}
