export type RevisionStatus = 'pending' | 'accepted' | 'kept'
export type RevisionRisk = 'low' | 'medium' | 'high'
export type RevisionViewMode = 'compare' | 'merged'

export interface RevisionClause {
  id: string
  no: string
  heading: string
  text: string
}

export interface RevisionChapter {
  id: string
  no: string
  title: string
  description: string
  clauses: RevisionClause[]
}

export interface RevisionChange {
  id: string
  chapterId: string
  section: string
  title: string
  original: string
  revised: string
  reason: string
  speaker: string
  department: string
  time: string
  references: string[]
  owner: string
  status: RevisionStatus
  risk: RevisionRisk
}

export interface RevisionAssistantTask {
  title: string
  detail: string
}

export interface RevisionActivity {
  id: number
  time: string
  title: string
  detail: string
  type: 'running' | 'success' | 'info'
}

export interface RevisionSource {
  id: string
  title: string
  type: string
  matched: number
}

