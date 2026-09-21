export type ViewMode = 'overview' | 'groups' | 'opinion' | 'tasks'

export type TaskStatus = '推进中' | '已完成' | '待处置'

export interface PatrolPoint {
  id: string
  name: string
  group: string
  x: number
  y: number
  force: number
  status: '正常' | '警戒' | '处置中'
}

export interface TrackPoint {
  id: string
  points: { x: number; y: number }[]
  color: string
}

export interface KeyGroupStat {
  type: 'A' | 'B' | 'C' | 'D'
  label: string
  count: number
  warning: number
  color: string
}

export interface KeyPerson {
  id: string
  name: string
  type: 'A' | 'B' | 'C' | 'D'
  status: string
  age: number
  title: string
  country: string
}

export interface OpinionItem {
  id: string
  time: string
  source: string
  content: string
  sensitive: boolean
}

export interface TaskItem {
  id: string
  group: string
  title: string
  status: TaskStatus
  progress: number
}

export interface CollabItem {
  id: string
  time: string
  from: string
  content: string
  level: 'info' | 'warn' | 'urgent'
}

export interface CommandGroup {
  id: string
  name: string
  online: boolean
  members: number
}

export interface BorderFlowPoint {
  label: string
  gdIn: number
  szIn: number
  out: number
}

export interface BorderRecord {
  id: string
  time: string
  name: string
  type: 'A' | 'B' | 'C' | 'D'
  direction: '入境广东' | '入境深圳' | '出境'
  port: string
  from: string
}

export interface BorderFlowData {
  gdInToday: number
  szInToday: number
  outToday: number
  inProvince: number
  trend: BorderFlowPoint[]
  records: BorderRecord[]
}

export interface DashboardData {
  tick: number
  weather: string
  temperature: number
  location: string
  overallReport: string
  patrolPoints: PatrolPoint[]
  tracks: TrackPoint[]
  keyGroups: KeyGroupStat[]
  keyPersons: KeyPerson[]
  opinions: OpinionItem[]
  tasks: TaskItem[]
  collabs: CollabItem[]
  commandGroups: CommandGroup[]
  borderFlow: BorderFlowData
  taskSummary: {
    total: number
    done: number
    doing: number
    pending: number
  }
}
