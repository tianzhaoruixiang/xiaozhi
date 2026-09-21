export type PlanStatus = 'todo' | 'doing' | 'done'
export type PlanPriority = 'high' | 'medium' | 'low'
export type PlanCategory = 'todo' | 'focus' | 'reminder'

export interface PlanItem {
  id: string
  time: string
  title: string
  detail: string
  priority: PlanPriority
  status: PlanStatus
  category: PlanCategory
}

/** 待办事项 */
export const mockTodos: PlanItem[] = [
  {
    id: 't1',
    time: '10:30',
    title: '人员调度协调材料复核',
    detail: '核对抽调名单、单位意见与当日可用力量',
    priority: 'high',
    status: 'doing',
    category: 'todo',
  },
  {
    id: 't2',
    time: '14:00',
    title: '主持人员调度会',
    detail: '明确议题顺序、发言单位与会后纪要责任人',
    priority: 'high',
    status: 'todo',
    category: 'todo',
  },
  {
    id: 't3',
    time: '16:00',
    title: '现场督导路线确认',
    detail: '确认陪同人员、联络口径与抵达时序',
    priority: 'medium',
    status: 'todo',
    category: 'todo',
  },
  {
    id: 't4',
    time: '19:30',
    title: '阅处晚间文稿',
    detail: '审阅调度纪要草案与应急值守简报',
    priority: 'low',
    status: 'todo',
    category: 'todo',
  },
]

/** 重点工作 */
export const mockFocusWork: PlanItem[] = [
  {
    id: 'f1',
    time: '本周',
    title: '跨部门力量统筹',
    detail: '围绕重点任务优化人员配置，压实责任单位',
    priority: 'high',
    status: 'doing',
    category: 'focus',
  },
  {
    id: 'f2',
    time: '本周',
    title: '调度机制规范化',
    detail: '完善会前材料、会中研判与会后跟踪闭环',
    priority: 'high',
    status: 'todo',
    category: 'focus',
  },
  {
    id: 'f3',
    time: '本月',
    title: '基层督导与回访',
    detail: '对重点点位开展现场督导并形成问题台账',
    priority: 'medium',
    status: 'todo',
    category: 'focus',
  },
]

/** 重要事项提醒 */
export const mockReminders: PlanItem[] = [
  {
    id: 'r1',
    time: '13:30前',
    title: '调度会材料齐套',
    detail: '各部门书面材料需提前提交，缺件不得上会',
    priority: 'high',
    status: 'todo',
    category: 'reminder',
  },
  {
    id: 'r2',
    time: '今日',
    title: '外出领导代参会确认',
    detail: '确认代参会人员授权与汇报口径',
    priority: 'high',
    status: 'todo',
    category: 'reminder',
  },
  {
    id: 'r3',
    time: '18:00前',
    title: '值守交接提醒',
    detail: '晚间值守交接需含未办结事项与应急联系人',
    priority: 'medium',
    status: 'todo',
    category: 'reminder',
  },
]

/** 供智能体上下文使用的合并列表 */
export const mockPlans: PlanItem[] = [
  ...mockTodos,
  ...mockFocusWork,
  ...mockReminders,
]
