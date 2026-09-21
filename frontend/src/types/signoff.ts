export type SignoffStatus = 'signed' | 'pending' | 'objection'
export type SignoffOpinionStatus = 'open' | 'resolved'

export interface SignoffClause {
  id: string
  section: string
  title: string
  finalText: string
  owner: string
  speaker: string
  department: string
  decisionTime: string
  decision: 'accepted' | 'kept'
}

export interface SignoffDepartment {
  id: string
  name: string
  signer: string
  role: string
  order: number
  status: SignoffStatus
  signedAt?: string
  sealCode?: string
}

export interface SignoffOpinion {
  id: string
  departmentId: string
  clauseId: string
  section: string
  author: string
  department: string
  time: string
  content: string
  proposal: string
  status: SignoffOpinionStatus
}

export interface SignoffActivity {
  id: number
  time: string
  title: string
  detail: string
  type: 'success' | 'running' | 'info'
}

export interface SignoffAssistantTask {
  title: string
  detail: string
}
