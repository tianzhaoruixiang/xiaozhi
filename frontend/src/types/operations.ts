import type { DistributionGroup, DistributionTask } from './distribution'

export type OperationTaskStatus = 'pending' | 'doing' | 'review' | 'done' | 'exception'
export type ChatMessageKind = 'text' | 'system' | 'task' | 'feedback' | 'alert' | 'report'

export interface OperationGroup extends DistributionGroup {
  progress: number
  unread: number
  onlineCount: number
  alertCount: number
  statusText: string
}

export interface OperationTask extends Omit<DistributionTask, 'status'> {
  status: OperationTaskStatus
  progress: number
  feedbackCount: number
  updatedAt: string
}

export interface ChatMessage {
  id: string
  groupId: string
  sender: string
  role: string
  avatar: string
  time: string
  kind: ChatMessageKind
  content: string
  isAssistant?: boolean
  taskId?: string
  title?: string
  meta?: string
  progress?: number
  tags?: string[]
  actions?: string[]
  source?: string
}

export interface AssistantWatchItem {
  id: string
  groupId: string
  tone: 'warning' | 'info' | 'success'
  title: string
  detail: string
  action: string
}

export type OperationMaterialCategory = 'issued' | 'feedback'

export interface OperationMaterial {
  id: string
  groupId: string
  title: string
  type: string
  read: boolean
  category: OperationMaterialCategory
}

export interface DailySummary {
  completed: number
  progressing: number
  exceptions: number
  feedbacks: number
}
