import type {
  BorderFlowData,
  BorderRecord,
  CollabItem,
  CommandGroup,
  DashboardData,
  KeyGroupStat,
  KeyPerson,
  OpinionItem,
  PatrolPoint,
  TaskItem,
  TaskStatus,
  TrackPoint,
} from '../types/dashboard'
import { distributionGroups, distributionTasks } from './distribution'

const OPINION_POOL = [
  { content: '大型会议保障任务进入执行阶段，场馆周边交通疏导平稳', sensitive: false },
  { content: '会场东侧道路管制讨论量上升，暂未形成集中负面传播', sensitive: false },
  { content: '网传会场周边出现人员聚集，经核查为参会人员有序入场', sensitive: true },
  { content: '外媒关注会议接待保障能力，相关评论总体偏正面', sensitive: false },
  { content: '匿名账号发布“会场封锁”不实信息，已进入溯源核查', sensitive: true },
  { content: '场馆消防通道整改信息传播正常，未引发次生舆情', sensitive: false },
  { content: '境外社媒转发涉会截图，舆情监测组已纳入重点词表', sensitive: true },
  { content: '市民点赞现场交通引导，会议保障话题热度稳步上升', sensitive: false },
]

const COLLAB_POOL = [
  { from: '人员审核组', content: '首批42人身份及证件核验完成，2份行程材料待补充', level: 'warn' as const },
  { from: '舆情监测组', content: '首轮18项监测词表巡检完成，东侧交通话题持续观察', level: 'info' as const },
  { from: '现场安保组', content: '第三联合机动单元12人、2台车辆已完成编成', level: 'info' as const },
  { from: '场馆检查组', content: '东区消防通道和弱电机房发现2项问题，正在整改', level: 'urgent' as const },
  { from: '重点监测组', content: '分级监测渠道反馈平稳，当前未触发升级条件', level: 'info' as const },
  { from: '情况通报组', content: '已汇集三个作战组反馈，阶段情况通报进入复核', level: 'info' as const },
]

const TASK_PROGRESS: Record<string, number> = {
  'task-x-01': 68,
  'task-y-01': 42,
  'task-z-01': 66,
  'task-z-02': 100,
  'task-e-01': 50,
  'task-f-01': 36,
  'task-g-01': 48,
  'task-g-02': 30,
}

export function getTaskExecutionProgress(taskId: string, progress?: number) {
  return progress ?? TASK_PROGRESS[taskId] ?? 12
}

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function nowTime() {
  const d = new Date()
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function createPatrolPoints(): PatrolPoint[] {
  const positions = [
    { x: 48, y: 28, name: '主会场识别岗', group: '人员审核组', force: 8, status: '正常' },
    { x: 22, y: 46, name: '北门安检通道', group: '现场安保组', force: 16, status: '正常' },
    { x: 78, y: 44, name: '东侧缓冲区', group: '现场安保组', force: 18, status: '警戒' },
    { x: 52, y: 72, name: '联合机动待命区', group: '现场安保组', force: 12, status: '正常' },
    { x: 54, y: 48, name: '联合指挥专席', group: '情况通报组', force: 6, status: '正常' },
    { x: 12, y: 40, name: '舆情监测专席', group: '舆情监测组', force: 12, status: '正常' },
    { x: 88, y: 40, name: '弱电机房', group: '场馆检查组', force: 4, status: '处置中' },
    { x: 32, y: 78, name: '临时搭建检查区', group: '场馆检查组', force: 6, status: '正常' },
    { x: 70, y: 78, name: '重点监测专席', group: '重点监测组', force: 9, status: '正常' },
  ]
  return positions.map((p, i) => ({
    id: `P${i + 1}`,
    name: p.name,
    group: p.group,
    x: p.x,
    y: p.y,
    force: p.force,
    status: p.status as PatrolPoint['status'],
  }))
}

function createTracks(): TrackPoint[] {
  return [
    {
      id: 'T1',
      color: '#4cc9e0',
      points: [
        { x: 14, y: 72 }, { x: 28, y: 62 }, { x: 42, y: 52 },
        { x: 55, y: 42 }, { x: 72, y: 34 },
      ],
    },
    {
      id: 'T2',
      color: '#5a9fd6',
      points: [
        { x: 86, y: 70 }, { x: 74, y: 58 }, { x: 62, y: 50 },
        { x: 50, y: 42 }, { x: 36, y: 32 },
      ],
    },
    {
      id: 'T3',
      color: '#e8a94e',
      points: [
        { x: 18, y: 30 }, { x: 32, y: 38 }, { x: 48, y: 55 },
        { x: 64, y: 66 }, { x: 82, y: 74 },
      ],
    },
  ]
}

function createKeyGroups(): KeyGroupStat[] {
  return [
    { type: 'A', label: '核心关注', count: 12, warning: 0, color: '#7ad4e8' },
    { type: 'B', label: '重点核查', count: 18, warning: 1, color: '#58b4d4' },
    { type: 'C', label: '持续监测', count: 46, warning: 0, color: '#4290c0' },
    { type: 'D', label: '常规关注', count: 50, warning: 0, color: '#3570a8' },
  ]
}

function createKeyPersons(): KeyPerson[] {
  const surnames = ['张', '李', '王', '赵', '陈', '刘', '周', '吴', '郑', '孙', '马', '朱', '胡', '郭', '何', '高', '林', '罗', '梁', '宋']
  const given = ['伟', '强', '磊', '洋', '勇', '军', '杰', '涛', '超', '明', '芳', '娜', '敏', '静', '丽', '艳', '霞', '婷', '雪', '慧']
  const titles = ['随行人员', '商务代表', '媒体记者', '安保人员', '联络官', '技术专家', '翻译官', '医疗保障', '后勤协调', '观察员']
  const countries = ['中国', '新加坡', '马来西亚', '泰国', '日本', '韩国', '德国', '法国', '英国', '美国', '澳大利亚', '印度尼西亚']
  return Array.from({ length: 126 }, (_, i) => {
    const type: KeyPerson['type'] = i < 12 ? 'A' : i < 30 ? 'B' : i < 76 ? 'C' : 'D'
    return {
      id: `KP${1000 + i}`,
      name: `${surnames[i % surnames.length]}${given[(i * 3) % given.length]}${given[(i * 7) % given.length]}`,
      type,
      status: i === 17 ? '核处中' : i < 30 ? '已核查' : '在控',
      age: 22 + ((i * 5) % 37),
      title: titles[i % titles.length],
      country: countries[i % countries.length],
    }
  })
}

function createOpinions(tick: number): OpinionItem[] {
  return Array.from({ length: 12 }, (_, i) => {
    const item = OPINION_POOL[(tick + i) % OPINION_POOL.length]
    return {
      id: `OP${tick}-${i}`,
      time: nowTime(),
      source: pick(['微博', '短视频', '论坛', '外媒', '本地APP']),
      content: item.content,
      sensitive: item.sensitive,
    }
  })
}

function createTasks(): TaskItem[] {
  const groupNames = new Map(distributionGroups.map((group) => [group.id, group.name]))
  return distributionTasks.map((task) => {
    const progress = getTaskExecutionProgress(task.id)
    return {
      id: task.id,
      group: groupNames.get(task.groupId) ?? task.groupId,
      title: task.title,
      status: progress >= 100 ? '已完成' : '推进中',
      progress,
    }
  })
}

function createCollabs(tick: number): CollabItem[] {
  return Array.from({ length: 8 }, (_, i) => {
    const item = COLLAB_POOL[(tick + i) % COLLAB_POOL.length]
    return {
      id: `CB${tick}-${i}`,
      time: nowTime(),
      from: item.from,
      content: item.content,
      level: item.level,
    }
  })
}

function createCommandGroups(): CommandGroup[] {
  return distributionGroups.map((group) => ({
    id: group.id,
    name: group.name,
    online: true,
    members: group.memberCount,
  }))
}

function shiftTracks(tracks: TrackPoint[]): TrackPoint[] {
  return tracks.map((t) => ({
    ...t,
    points: t.points.map((p, idx) => ({
      x: Math.min(90, Math.max(10, p.x + (idx % 2 === 0 ? 0.12 : -0.1))),
      y: Math.min(82, Math.max(18, p.y + (idx % 2 === 0 ? -0.08 : 0.1))),
    })),
  }))
}

function createBorderFlow(): BorderFlowData {
  const hours = ['08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18']
  const gdSeries = [4, 7, 9, 12, 13, 14, 16, 18, 14, 11, 8]
  const szSeries = [3, 5, 7, 9, 10, 11, 12, 13, 9, 7, 6]
  const outSeries = [0, 1, 1, 1, 1, 2, 2, 1, 2, 2, 1]
  const trend = hours.map((h, i) => ({
    label: `${h}:00`,
    gdIn: gdSeries[i]!,
    szIn: szSeries[i]!,
    out: outSeries[i]!,
  }))
  return {
    gdInToday: trend.reduce((s, p) => s + p.gdIn, 0),
    szInToday: trend.reduce((s, p) => s + p.szIn, 0),
    outToday: trend.reduce((s, p) => s + p.out, 0),
    inProvince: 112,
    trend,
    records: createBorderRecords(0),
  }
}

function createBorderRecords(tick: number): BorderRecord[] {
  const names = ['张伟强', '李芳娜', '王磊洋', '赵静丽', '陈明杰', '刘涛超', '周雪慧', '吴勇军']
  const ports = ['深圳湾口岸', '福田口岸', '皇岗口岸', '宝安机场', '广州白云机场', '南沙客运港']
  const froms = ['新加坡', '马来西亚', '泰国', '日本', '韩国', '香港', '澳门', '法国']
  const dirs = ['入境广东', '入境深圳', '出境'] as const
  return Array.from({ length: 8 }, (_, i) => ({
    id: `BF${tick}-${i}`,
    time: nowTime(),
    name: names[(tick + i) % names.length],
    type: (i < 1 ? 'A' : i < 3 ? 'B' : i < 6 ? 'C' : 'D') as BorderRecord['type'],
    direction: dirs[(tick + i) % dirs.length],
    port: ports[(tick + i) % ports.length],
    from: froms[(tick + i * 3) % froms.length],
  }))
}

function refreshBorderFlow(prev: BorderFlowData, tick: number): BorderFlowData {
  const records =
    tick % 3 === 0
      ? [createBorderRecords(tick)[0], ...prev.records.slice(0, 7)]
      : prev.records

  return {
    ...prev,
    records,
  }
}

export function createInitialData(): DashboardData {
  const tasks = createTasks()
  return {
    tick: 0,
    weather: '晴',
    temperature: 27,
    location: '深圳国际交流中心 · 联合指挥中心',
    overallReport: '会议部署的8项任务已全部下发，6个作战组进入执行阶段，当前重点关注东侧缓冲区和场馆隐患整改。',
    patrolPoints: createPatrolPoints(),
    tracks: createTracks(),
    keyGroups: createKeyGroups(),
    keyPersons: createKeyPersons(),
    opinions: createOpinions(0),
    tasks,
    collabs: createCollabs(0),
    commandGroups: createCommandGroups(),
    borderFlow: createBorderFlow(),
    taskSummary: summarizeTasks(tasks),
  }
}

function summarizeTasks(tasks: TaskItem[]) {
  return {
    total: tasks.length,
    done: tasks.filter((t) => t.status === '已完成').length,
    doing: tasks.filter((t) => t.status === '推进中').length,
    pending: tasks.filter((t) => t.status === '待处置').length,
  }
}

export function refreshDashboardData(prev: DashboardData): DashboardData {
  const tick = prev.tick + 1
  const patrolPoints = prev.patrolPoints

  const tasks: TaskItem[] =
    tick % 3 === 0
      ? prev.tasks.map((t) => {
          if (t.status === '已完成') return t
          const next = Math.min(100, t.progress + rand(0, 3))
          let status: TaskStatus = t.status
          if (next >= 100) status = '已完成'
          else if (t.status === '待处置' && next > 10) status = '推进中'
          return {
            ...t,
            progress: next,
            status,
          }
        })
      : prev.tasks

  const keyGroups = prev.keyGroups

  const opinions =
    tick % 2 === 0
      ? [createOpinions(tick)[0], ...prev.opinions.slice(0, 11)]
      : prev.opinions

  const collabs =
    tick % 2 === 0
      ? [createCollabs(tick)[0], ...prev.collabs.slice(0, 7)]
      : prev.collabs

  return {
    ...prev,
    tick,
    temperature: 26 + (tick % 3),
    overallReport:
      tick % 5 === 0
        ? pick([
            '6个作战组在线，8项会议任务按计划推进，整体态势可控。',
            '东侧缓冲区边界条件待确认，现场安保组持续跟进。',
            '舆情监测首轮词表巡检完成，交通话题保持重点观察。',
            '场馆检查发现2项问题，消防通道和弱电机房正在整改。',
          ])
        : prev.overallReport,
    patrolPoints,
    tracks: shiftTracks(prev.tracks),
    keyGroups,
    keyPersons: prev.keyPersons,
    opinions,
    tasks,
    collabs,
    commandGroups: prev.commandGroups,
    borderFlow: refreshBorderFlow(prev.borderFlow, tick),
    taskSummary: summarizeTasks(tasks),
  }
}
