export type AssistantState = 'idle' | 'listening' | 'thinking' | 'speaking'

export type CollabStatus = 'queued' | 'running' | 'awaiting' | 'done' | 'error'
export type PlanPhase = 'idle' | 'planning' | 'ready' | 'executing' | 'awaiting_confirm' | 'done'

export interface DispatchConfirm {
  id: string
  status: 'pending' | 'approved' | 'rejected'
  title: string
  preview?: string
  meetingTime?: string
  location?: string
  agendaTitle?: string
  briefingTitle?: string
  recipients?: string[]
  oral?: string
}

export interface PlanTaskItem {
  index: number
  agentId: string
  agentName: string
  agentRole: string
  title: string
  objective: string
  revealed: boolean
  /** 依赖的专家 id；同波次无相互依赖则并行 */
  dependsOn?: string[]
}

export interface TaskPlan {
  phase: PlanPhase
  goal: string
  statusText: string
  items: PlanTaskItem[]
  total: number
}

export interface ToolCallRecord {
  id: string
  toolName: string
  toolLabel: string
  status: 'running' | 'done' | 'error'
  summary: string
  recipients?: string[]
}

export interface CollabStep {
  id: string
  name: string
  role: string
  status: CollabStatus
  title?: string
  objective?: string
  /** 最终思考 / 产出正文 */
  summary?: string
  /** 执行过程日志（进度摘要按时间追加） */
  logs?: string[]
  justSpawned?: boolean
  tools?: ToolCallRecord[]
}

export type ChatRole = 'user' | 'assistant' | 'system'

export interface ChatMessage {
  id: string
  role: ChatRole
  content: string
  steps?: CollabStep[]
  taskPlan?: TaskPlan
  /** 智枢向领导口述的语音稿 */
  oralReport?: string
  /** 发出汇讯前的领导人确认 */
  dispatchConfirm?: DispatchConfirm
}

export type SseEventType =
  | 'plan_start'
  | 'plan_item'
  | 'plan_done'
  | 'agent_spawn'
  | 'agent_start'
  | 'agent_progress'
  | 'agent_done'
  | 'tool_start'
  | 'tool_done'
  | 'assistant_delta'
  | 'oral_report'
  | 'await_confirm'
  | 'confirm_resolved'
  | 'heartbeat'
  | 'final'
  | 'error'

export interface SsePayload {
  type: SseEventType
  agentId?: string
  agentName?: string
  agentRole?: string
  summary?: string
  text?: string
  message?: string
  goal?: string
  index?: number
  title?: string
  objective?: string
  total?: number
  toolName?: string
  toolLabel?: string
  ok?: boolean
  recipients?: string[]
  dependsOn?: string[]
  confirmId?: string
  meetingTime?: string
  location?: string
  agendaTitle?: string
  briefingTitle?: string
}
