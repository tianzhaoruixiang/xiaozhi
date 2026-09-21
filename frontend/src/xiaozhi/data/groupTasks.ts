import { computed } from 'vue'

export type TaskStatus = 'todo' | 'doing' | 'done' | 'risk'

export interface TaskMember {
  id: string
  name: string
  role: string
  status: TaskStatus
  /** 0-100 */
  progress: number
  note: string
}

export interface GroupTask {
  id: string
  title: string
  detail: string
  owner: string
  due: string
  status: TaskStatus
  /** 0-100 */
  progress: number
  members: TaskMember[]
}

export interface TaskGroup {
  id: string
  name: string
  lead: string
  scope: string
  /** 当前组：高总工作台默认展示这一组 */
  current?: boolean
  tasks: GroupTask[]
}

export const STATUS_META: Record<TaskStatus, { label: string; short: string }> = {
  todo: { label: '待启动', short: '待启动' },
  doing: { label: '进行中', short: '进行中' },
  done: { label: '已完成', short: '已完成' },
  risk: { label: '受阻', short: '受阻' },
}

/**
 * 各组专项任务台账（演示数据）。
 * 组 → 任务 → 成员三级：张处工作台看各组汇总，高总工作台看当前组下钻到成员。
 */
const initialGroups: TaskGroup[] = [
  {
    id: 'g1',
    name: '广告事业部寻访组',
    lead: '张磊',
    scope: '推荐算法 · 广告投放',
    current: true,
    tasks: [
      {
        id: 't1',
        title: '推荐算法专家寻访',
        detail: '按岗位画像触达推荐算法方向人选，完成初筛与意向确认',
        owner: '张磊',
        due: '本周五',
        status: 'doing',
        progress: 65,
        members: [
          {
            id: 'm1',
            name: '张磊',
            role: '组长 · 统筹',
            status: 'doing',
            progress: 65,
            note: '正在对齐岗位画像与候选人优先级',
          },
          {
            id: 'm2',
            name: '李娜',
            role: '候选人触达',
            status: 'doing',
            progress: 72,
            note: '已触达 9 人，4 人同意进一步沟通',
          },
          {
            id: 'm3',
            name: '王强',
            role: '画像与评估',
            status: 'doing',
            progress: 58,
            note: '完成技术栈拆解，待补评估口径',
          },
          {
            id: 'm4',
            name: '陈晓',
            role: '面试协调',
            status: 'doing',
            progress: 40,
            note: '已排定 2 场线上沟通',
          },
        ],
      },
      {
        id: 't2',
        title: '广告投放专家画像',
        detail: '梳理投放方向专家能力模型，输出评估口径供全组复用',
        owner: '刘洋',
        due: '下周三',
        status: 'doing',
        progress: 45,
        members: [
          {
            id: 'm5',
            name: '刘洋',
            role: '行业调研',
            status: 'doing',
            progress: 52,
            note: '完成 3 家竞品投放团队梳理',
          },
          {
            id: 'm6',
            name: '赵敏',
            role: '竞品对标',
            status: 'doing',
            progress: 38,
            note: '待补投放 ROI 指标口径',
          },
        ],
      },
      {
        id: 't3',
        title: '短名单上报 HRBP',
        detail: '汇总短名单与评估说明，确认后上报 HRBP 归档',
        owner: '张磊',
        due: '已完成',
        status: 'done',
        progress: 100,
        members: [
          {
            id: 'm7',
            name: '张磊',
            role: '确认上报',
            status: 'done',
            progress: 100,
            note: '已同意并归档 Word 交付物',
          },
          {
            id: 'm8',
            name: '李娜',
            role: '材料汇编',
            status: 'done',
            progress: 100,
            note: '短名单与评估说明已齐备',
          },
        ],
      },
    ],
  },
  {
    id: 'g2',
    name: '数据平台寻访组',
    lead: '孙倩',
    scope: '数据架构 · 实时计算',
    tasks: [
      {
        id: 't4',
        title: '数据架构师寻访',
        detail: '围绕数据中台与湖仓架构方向筛选并触达目标人选',
        owner: '孙倩',
        due: '本周四',
        status: 'doing',
        progress: 55,
        members: [
          {
            id: 'm9',
            name: '孙倩',
            role: '组长 · 统筹',
            status: 'doing',
            progress: 55,
            note: '已锁定 6 位目标人选',
          },
          {
            id: 'm10',
            name: '周航',
            role: '候选人评估',
            status: 'doing',
            progress: 60,
            note: '完成 3 人初评，1 人待复评',
          },
          {
            id: 'm11',
            name: '吴桐',
            role: '渠道拓展',
            status: 'doing',
            progress: 45,
            note: '补充行业社群与内推渠道',
          },
        ],
      },
      {
        id: 't5',
        title: '实时计算专家寻访',
        detail: '明确 Flink / 流批一体方向画像，搭建目标人才池',
        owner: '吴桐',
        due: '下周一',
        status: 'todo',
        progress: 15,
        members: [
          {
            id: 'm12',
            name: '吴桐',
            role: '目标池搭建',
            status: 'todo',
            progress: 15,
            note: '目标池框架已建，待补人选',
          },
          {
            id: 'm13',
            name: '孙倩',
            role: '岗位画像',
            status: 'doing',
            progress: 20,
            note: '画像初稿待业务侧确认',
          },
        ],
      },
    ],
  },
  {
    id: 'g3',
    name: '风控算法寻访组',
    lead: '周航',
    scope: '风控建模 · 反欺诈',
    tasks: [
      {
        id: 't6',
        title: '风控建模专家寻访',
        detail: '筛选风控建模与策略方向专家，完成首轮意向沟通',
        owner: '周航',
        due: '本周五',
        status: 'doing',
        progress: 70,
        members: [
          {
            id: 'm14',
            name: '周航',
            role: '组长 · 统筹',
            status: 'doing',
            progress: 70,
            note: '已确定 2 位重点跟进人选',
          },
          {
            id: 'm15',
            name: '郑楠',
            role: '候选人触达',
            status: 'doing',
            progress: 68,
            note: '触达 7 人，2 人待回复',
          },
        ],
      },
      {
        id: 't7',
        title: '反欺诈专家寻访',
        detail: '面向反欺诈与黑产对抗方向寻访，当前人选储备不足',
        owner: '郑楠',
        due: '待定',
        status: 'risk',
        progress: 30,
        members: [
          {
            id: 'm16',
            name: '郑楠',
            role: '候选人触达',
            status: 'risk',
            progress: 30,
            note: '受阻：目标人选集中且意向不足，需换渠道',
          },
        ],
      },
    ],
  },
]

/** 组进度 = 组内任务进度均值 */
export function groupProgress(group: TaskGroup): number {
  if (!group.tasks.length) return 0
  const total = group.tasks.reduce((sum, task) => sum + task.progress, 0)
  return Math.round(total / group.tasks.length)
}

/** 组状态：有受阻则受阻；全部完成才完成；有推进则进行中 */
export function groupStatus(group: TaskGroup): TaskStatus {
  if (!group.tasks.length) return 'todo'
  if (group.tasks.some((t) => t.status === 'risk')) return 'risk'
  if (group.tasks.every((t) => t.status === 'done')) return 'done'
  if (group.tasks.some((t) => t.status === 'doing' || t.status === 'done')) return 'doing'
  return 'todo'
}

export function countDoneTasks(group: TaskGroup): number {
  return group.tasks.filter((t) => t.status === 'done').length
}

export function useGroupTasks() {
  const groups = computed(() => initialGroups)
  const currentGroup = computed(
    () => initialGroups.find((g) => g.current) ?? initialGroups[0],
  )

  const allTasks = computed(() => initialGroups.flatMap((g) => g.tasks))

  const summary = computed(() => ({
    groupCount: initialGroups.length,
    taskCount: allTasks.value.length,
    memberCount: allTasks.value.reduce((sum, t) => sum + t.members.length, 0),
    doneCount: allTasks.value.filter((t) => t.status === 'done').length,
    riskCount: allTasks.value.filter((t) => t.status === 'risk').length,
    progress: allTasks.value.length
      ? Math.round(
          allTasks.value.reduce((sum, t) => sum + t.progress, 0) /
            allTasks.value.length,
        )
      : 0,
  }))

  return { groups, currentGroup, summary }
}
