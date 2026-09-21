export interface Participant {
  id: string
  name: string
  department: string
  role: string
  initial: string
  color: string
}

export interface TranscriptEntry {
  id: number
  speakerId: string
  time: string
  content: string
  status?: 'accepted' | 'pending'
  tags?: string[]
}

export interface Suggestion {
  id: number
  speakerId: string
  time: string
  title: string
  content: string
  chapter: string
  references: number
  tags: string[]
}

export interface ScriptLine {
  speakerId: string
  content: string
  suggestion?: Omit<Suggestion, 'id' | 'speakerId' | 'time'>
}

export interface AssistantTask {
  title: string
  detail: string
  steps: string[]
  activeStep: number
}

export interface AssistantActivity {
  id: number
  time: string
  title: string
  detail: string
  type: 'running' | 'success' | 'info'
}

export interface PlanChapter {
  id: string
  no: string
  title: string
  items: string[]
}

export interface WorkGroup {
  id: string
  name: string
  lead: string
  department: string
  size: number
  tasks: string[]
}

export interface MeetingMinuteAction {
  id: string
  content: string
  owner: string
  deadline: string
}

export interface MeetingMinutes {
  title: string
  recorder: string
  status: string
  summary: string
  decisions: string[]
  actions: MeetingMinuteAction[]
}

export interface PlanDocument {
  draftUnit: string
  updatedAt: string
  changes: string[]
  chapters: PlanChapter[]
  groups: WorkGroup[]
  minutes: MeetingMinutes
}
