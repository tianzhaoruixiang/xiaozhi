/**
 * 模拟厅长当日日程台账（供日程查询 / 安排工具使用）
 */
export type ScheduleItemKind =
  | 'meeting'
  | 'inspection'
  | 'review'
  | 'travel'
  | 'other'

export interface DirectorScheduleItem {
  id: string
  /** 开始 HH:MM */
  startTime: string
  /** 结束 HH:MM */
  endTime: string
  title: string
  location?: string
  kind: ScheduleItemKind
  /** 是否可改期/插入 */
  flexible: boolean
  note?: string
}

/** 厅长：陈厅长（模拟） */
export const DIRECTOR_NAME = '陈厅长'

export const DIRECTOR_SCHEDULE: DirectorScheduleItem[] = [
  {
    id: 'sch-0900',
    startTime: '09:00',
    endTime: '09:40',
    title: '早间工作碰头',
    location: '七楼厅长办公室',
    kind: 'meeting',
    flexible: false,
    note: '固定例会，不宜改期',
  },
  {
    id: 'sch-1030',
    startTime: '10:30',
    endTime: '11:30',
    title: '基层督导调研（市南片区）',
    location: '外出',
    kind: 'inspection',
    flexible: false,
    note: '已与区里确认，数智助手可代参其他会',
  },
  {
    id: 'sch-1400',
    startTime: '14:00',
    endTime: '15:00',
    title: '（待安排空档）',
    kind: 'other',
    flexible: true,
    note: '可安排专题会、人员调度会等',
  },
  {
    id: 'sch-1530',
    startTime: '15:30',
    endTime: '16:20',
    title: '签批文件与文稿阅处',
    location: '七楼厅长办公室',
    kind: 'review',
    flexible: true,
    note: '可压缩至 40 分钟',
  },
  {
    id: 'sch-1630',
    startTime: '16:30',
    endTime: '17:30',
    title: '跨部门协调碰头',
    location: '五楼党委会议室',
    kind: 'meeting',
    flexible: true,
  },
  {
    id: 'sch-1930',
    startTime: '19:30',
    endTime: '20:30',
    title: '晚间文稿阅处',
    location: '七楼厅长办公室',
    kind: 'review',
    flexible: true,
  },
]

export function getDirectorSchedule(): DirectorScheduleItem[] {
  return [...DIRECTOR_SCHEDULE].sort((a, b) =>
    a.startTime.localeCompare(b.startTime),
  )
}
