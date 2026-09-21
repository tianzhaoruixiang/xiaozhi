export type DistributionTaskStatus = 'pending' | 'confirmed' | 'sent'
export type WorkGroupStatus = 'draft' | 'ready' | 'sent'
export type MaterialStatus = 'ready' | 'sent' | 'read'

export interface DistributionMember {
  name: string
  role: string
  unit: string
}

export interface DistributionGroup {
  id: string
  name: string
  responsibility: string
  lead: string
  department: string
  memberCount: number
  color: string
  members: DistributionMember[]
  membersPulled: boolean
}

export interface DistributionTask {
  id: string
  groupId: string
  title: string
  description: string
  owner: string
  collaborators: string[]
  deadline: string
  deliverable: string
  priority: 'normal' | 'important' | 'urgent'
  status: DistributionTaskStatus
  sourceClauseIds: string[]
}

export interface DistributionMaterial {
  id: string
  title: string
  type: string
  recipients: string
  status: MaterialStatus
}

export interface DistributionActivity {
  id: number
  time: string
  title: string
  detail: string
  type: 'success' | 'running' | 'info'
}

export interface DistributionAssistantTask {
  title: string
  detail: string
}

