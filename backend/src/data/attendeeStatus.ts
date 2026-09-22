export type AttendanceMode = 'in_person' | 'travel_proxy' | 'remote'

export interface AttendeeStatus {
  name: string
  role: string
  dept: string
  mode: AttendanceMode
  note?: string
  proxyAssistant?: string
}

/**
 * 参会人实时状态（演示数据）。
 * travel_proxy：本人出差/外出，由数智助手代参会。
 */
export const ATTENDEE_STATUS: AttendeeStatus[] = [
  {
    name: '陈厅长',
    role: '厅长',
    dept: '厅领导',
    mode: 'in_person',
    note: '领导人出席',
  },
  {
    name: '王主任',
    role: '办公室主任',
    dept: '市政府办公室',
    mode: 'in_person',
  },
  {
    name: '李秘书',
    role: '综合秘书',
    dept: '市政府办公室',
    mode: 'in_person',
  },
  {
    name: '赵处长',
    role: '应急管理局处长',
    dept: '应急管理局',
    mode: 'in_person',
  },
  {
    name: '周科长',
    role: '人社局科长',
    dept: '人力资源和社会保障局',
    mode: 'in_person',
  },
  {
    name: '张可信',
    role: '发改委项目负责人',
    dept: '发展和改革委员会',
    mode: 'travel_proxy',
    note: '目前在基层督导调研，无法现场参会',
    proxyAssistant: '张可信的数智助手',
  },
  {
    name: '刘副厅长',
    role: '副厅长',
    dept: '厅领导',
    mode: 'travel_proxy',
    note: '赴外地调研，授权数智助手代参会',
    proxyAssistant: '刘副厅长的数智助手',
  },
  {
    name: '孙处长',
    role: '住建局处长',
    dept: '住房和城乡建设局',
    mode: 'remote',
    note: '视频连线参会',
  },
  {
    name: '吴科长',
    role: '财政局科长',
    dept: '财政局',
    mode: 'in_person',
  },
  {
    name: '郑干事',
    role: '法制办干事',
    dept: '司法局（法制）',
    mode: 'in_person',
  },
]

export function listProxyAttendees() {
  return ATTENDEE_STATUS.filter((a) => a.mode === 'travel_proxy')
}

export function formatAttendeeStatusHint(): string {
  return ATTENDEE_STATUS.map((a) => {
    if (a.mode === 'travel_proxy') {
      return `${a.name}（${a.role}/${a.dept}）：出差/外出，由「${a.proxyAssistant}」代参会。${a.note ?? ''}`
    }
    if (a.mode === 'remote') {
      return `${a.name}（${a.role}/${a.dept}）：远程视频参会。${a.note ?? ''}`
    }
    return `${a.name}（${a.role}/${a.dept}）：现场参会${a.note ? `。${a.note}` : ''}`
  }).join('\n')
}
