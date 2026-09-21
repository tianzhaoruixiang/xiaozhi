export type SignoffStatus = 'signed' | 'pending'

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

export interface SignoffMaterialSection {
  title: string
  items: string[]
}

export interface SignoffMaterial {
  id: string
  title: string
  kind: string
  meta: string
  status: string
  sections: SignoffMaterialSection[]
}
