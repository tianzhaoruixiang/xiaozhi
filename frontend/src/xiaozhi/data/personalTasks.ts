import { computed, ref } from 'vue'

export type TaskStatus = 'todo' | 'doing' | 'done'
export type TaskPriority = 'high' | 'medium' | 'low'

export interface PersonalTask {
  id: string
  time: string
  title: string
  detail: string
  priority: TaskPriority
  status: TaskStatus
}

const initialSpecial: PersonalTask[] = [
  {
    id: 's1',
    time: '进行中',
    title: '广告事业部 · 推荐领域专家寻访',
    detail: '梳理推荐算法 / 广告投放专家画像，对接潜在候选人并准备推荐短名单',
    priority: 'high',
    status: 'doing',
  },
]

/** 重点任务：暂为空台账，待业务侧补充 */
const initialKey: PersonalTask[] = []

const initialDaily: PersonalTask[] = [
  {
    id: 'd1',
    time: '每日',
    title: '浏览简历',
    detail: '筛选广告 / 推荐相关简历，标记可跟进与待观察人选',
    priority: 'high',
    status: 'todo',
  },
  {
    id: 'd2',
    time: '每日',
    title: '刷领英积累潜在目标',
    detail: '按关键词与公司标签拓展潜在专家池，记录可触达线索',
    priority: 'high',
    status: 'todo',
  },
  {
    id: 'd3',
    time: '每日',
    title: '候选人跟进回访',
    detail: '对已建联人选做意向确认，更新阶段与下一步动作',
    priority: 'medium',
    status: 'doing',
  },
]

const initialReminders: PersonalTask[] = [
  {
    id: 'r1',
    time: '今日 15:00',
    title: '广告事业部用人需求对齐会',
    detail: '会议室待确认；请提前准备专家画像一页纸与进度简报',
    priority: 'high',
    status: 'todo',
  },
  {
    id: 'r2',
    time: '今日 17:30前',
    title: '回复客户邮件',
    detail: '答复上周推荐人选反馈，并确认下周面试场次',
    priority: 'high',
    status: 'todo',
  },
  {
    id: 'r3',
    time: '明日 10:00',
    title: '候选人初面提醒',
    detail: '与张某确认视频面试链接与岗位亮点话术',
    priority: 'medium',
    status: 'todo',
  },
]

/** 短名单上报后到达的两个新专项任务 */
const FOLLOWUP_ONLINE: PersonalTask = {
  id: 's2',
  time: '待启动',
  title: '线上沟通',
  detail: '就短名单人选安排线上沟通，确认意向、经历匹配与可面试窗口',
  priority: 'high',
  status: 'todo',
}

const FOLLOWUP_OFFLINE: PersonalTask = {
  id: 's3',
  time: '待启动',
  title: '邀请线下沟通',
  detail: '对重点候选人发出线下沟通邀请，协调时间、地点与参会人',
  priority: 'high',
  status: 'todo',
}

/** 共享响应式任务台账（猎头工作台） */
const specialTasks = ref<PersonalTask[]>(
  initialSpecial.map((t) => ({ ...t })),
)
const keyTasks = ref<PersonalTask[]>(initialKey.map((t) => ({ ...t })))
const dailyTasks = ref<PersonalTask[]>(initialDaily.map((t) => ({ ...t })))
const reminders = ref<PersonalTask[]>(initialReminders.map((t) => ({ ...t })))

/** 新任务提醒：专项任务按钮上的红色 +N */
const newSpecialNotice = ref(0)
let followupTimer: number | undefined

export function usePersonalTasks() {
  const allClickableTasks = computed(() => [
    ...specialTasks.value,
    ...keyTasks.value,
    ...dailyTasks.value,
  ])

  const findTask = (id: string) =>
    allClickableTasks.value.find((t) => t.id === id) ?? null

  /**
   * 短名单同意上报 HRBP 后：推荐领域专家寻访 → 已完成
   * 新任务由 scheduleFollowupSpecialTasks 延迟追加
   */
  const completeSourcingAfterHrbpReport = (sourcingTaskId = 's1') => {
    const sourcing = specialTasks.value.find((t) => t.id === sourcingTaskId)
    if (sourcing) {
      sourcing.status = 'done'
      sourcing.time = '已完成'
      sourcing.detail =
        '短名单已同意并上报 HRBP；后续转入线上沟通与线下邀约'
    }
    return { completedId: sourcingTaskId }
  }

  /** 把两个新专项任务写入台账，返回实际新增的 id */
  const addFollowupSpecialTasks = () => {
    const addedIds: string[] = []
    for (const task of [FOLLOWUP_ONLINE, FOLLOWUP_OFFLINE]) {
      if (!specialTasks.value.some((t) => t.id === task.id)) {
        specialTasks.value.push({ ...task })
        addedIds.push(task.id)
      }
    }
    return addedIds
  }

  /** 上报后延迟到达：模拟两个新任务并点亮红色 +N 提醒 */
  const scheduleFollowupSpecialTasks = (delayMs = 5000) => {
    if (followupTimer !== undefined) window.clearTimeout(followupTimer)
    followupTimer = window.setTimeout(() => {
      followupTimer = undefined
      const addedIds = addFollowupSpecialTasks()
      if (addedIds.length) newSpecialNotice.value += addedIds.length
    }, delayMs)
  }

  const clearNewSpecialNotice = () => {
    newSpecialNotice.value = 0
  }

  /** 线上/线下沟通方案上报 HRBP 后，将对应任务标为已完成 */
  const completeCommunicationAfterHrbpReport = (
    taskId: string,
    kind: 'online-plan' | 'offline-plan',
  ) => {
    const task =
      specialTasks.value.find((t) => t.id === taskId) ??
      keyTasks.value.find((t) => t.id === taskId)
    if (!task) return { completedId: null as string | null }
    task.status = 'done'
    task.time = '已完成'
    task.detail =
      kind === 'online-plan'
        ? '线上沟通方案已同意并上报 HRBP'
        : '线下沟通方案已同意并上报 HRBP'
    return { completedId: taskId }
  }

  return {
    specialTasks,
    keyTasks,
    dailyTasks,
    reminders,
    newSpecialNotice,
    allClickableTasks,
    findTask,
    completeSourcingAfterHrbpReport,
    addFollowupSpecialTasks,
    scheduleFollowupSpecialTasks,
    clearNewSpecialNotice,
    completeCommunicationAfterHrbpReport,
  }
}

/** 兼容旧静态导出（只读初始快照，页面请用 usePersonalTasks） */
export const personalSpecialTasks = initialSpecial
export const personalKeyTasks = initialKey
export const personalDailyTasks = initialDaily
export const personalReminders = initialReminders
