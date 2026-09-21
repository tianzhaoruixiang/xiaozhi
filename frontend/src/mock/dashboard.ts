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

const GROUPS = ['一组', '二组', '三组', '四组', '五组', '六组']

const OPINION_POOL = [
  { content: '大型国际会议安保部署进入实战阶段，周边交通有序疏导', sensitive: false },
  { content: '网传会场周边出现可疑人员聚集，核查后为游客排队拍照', sensitive: true },
  { content: '外媒关注本地区接待保障能力，评论总体偏正面', sensitive: false },
  { content: '社交平台出现涉会敏感谣言，已启动溯源与辟谣联动', sensitive: true },
  { content: '市民点赞志愿服务与交通引导，相关话题热度上升', sensitive: false },
  { content: '匿名账号散布“会场封锁”不实信息，属敏感预警内容', sensitive: true },
  { content: '周边商户营业秩序平稳，夜间巡查反馈良好', sensitive: false },
  { content: '境外社媒转发涉会截图，内容含煽动性表述需重点盯防', sensitive: true },
]

const COLLAB_POOL = [
  { from: '交警支队', content: '东门匝道车流峰值已过，建议保持现有分流方案', level: 'info' as const },
  { from: '武警机动队', content: '南广场完成二次清场，待命点位已就位', level: 'info' as const },
  { from: '网安支队', content: '发现敏感舆情线索，已推送属地核查', level: 'warn' as const },
  { from: '特勤一组', content: 'VIP通道临时管控升级，请各组同步避让', level: 'urgent' as const },
  { from: '医疗保障组', content: '急救点位人员轮换完成，设备自检正常', level: 'info' as const },
  { from: '情报研判中心', content: '重点群体 B 类人员轨迹异常，请二组核处', level: 'warn' as const },
]

const TASK_TITLES = [
  '会场周界封控巡查',
  '重点通道安检复核',
  '停车场清场核验',
  '舆情线索落地核查',
  'VIP 线路护卫演练',
  '应急通道畅通保障',
  '周边旅馆排查回访',
  '无人机低空侦察',
]

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
    { x: 48, y: 28, name: '北门岗' },
    { x: 22, y: 46, name: '西门岗' },
    { x: 78, y: 44, name: '东门岗' },
    { x: 52, y: 72, name: '南门岗' },
    { x: 54, y: 48, name: '主会场' },
    { x: 12, y: 40, name: '停车A区' },
    { x: 88, y: 40, name: '停车B区' },
    { x: 32, y: 78, name: '南广场西' },
    { x: 70, y: 78, name: '南广场东' },
  ]
  return positions.map((p, i) => ({
    id: `P${i + 1}`,
    name: p.name,
    group: GROUPS[i % GROUPS.length],
    x: p.x,
    y: p.y,
    force: rand(4, 18),
    status: pick(['正常', '正常', '正常', '警戒', '处置中'] as const),
  }))
}

function createTracks(): TrackPoint[] {
  return [
    {
      id: 'T1',
      color: '#00f2ff',
      points: [
        { x: 14, y: 72 }, { x: 28, y: 62 }, { x: 42, y: 52 },
        { x: 55, y: 42 }, { x: 72, y: 34 },
      ],
    },
    {
      id: 'T2',
      color: '#3d7cff',
      points: [
        { x: 86, y: 70 }, { x: 74, y: 58 }, { x: 62, y: 50 },
        { x: 50, y: 42 }, { x: 36, y: 32 },
      ],
    },
    {
      id: 'T3',
      color: '#ffb020',
      points: [
        { x: 18, y: 30 }, { x: 32, y: 38 }, { x: 48, y: 55 },
        { x: 64, y: 66 }, { x: 82, y: 74 },
      ],
    },
  ]
}

function createKeyGroups(): KeyGroupStat[] {
  return [
    { type: 'A', label: 'A类重点', count: rand(18, 36), warning: rand(0, 4), color: '#2ee6a6' },
    { type: 'B', label: 'B类重点', count: rand(40, 72), warning: rand(1, 8), color: '#ff9f1a' },
    { type: 'C', label: 'C类重点', count: rand(60, 110), warning: rand(0, 6), color: '#a78bfa' },
    { type: 'D', label: 'D类重点', count: rand(90, 160), warning: rand(0, 5), color: '#3d9bff' },
  ]
}

function createKeyPersons(): KeyPerson[] {
  const surnames = ['张', '李', '王', '赵', '陈', '刘', '周', '吴', '郑', '孙', '马', '朱', '胡', '郭', '何', '高', '林', '罗', '梁', '宋']
  const given = ['伟', '强', '磊', '洋', '勇', '军', '杰', '涛', '超', '明', '芳', '娜', '敏', '静', '丽', '艳', '霞', '婷', '雪', '慧']
  const titles = ['随行人员', '商务代表', '媒体记者', '安保人员', '联络官', '技术专家', '翻译官', '医疗保障', '后勤协调', '观察员']
  const countries = ['中国', '新加坡', '马来西亚', '泰国', '日本', '韩国', '德国', '法国', '英国', '美国', '澳大利亚', '印度尼西亚']
  const statuses = ['在控', '核处中', '轨迹异常', '已核查'] as const
  const types = ['A', 'B', 'C', 'D'] as const

  return Array.from({ length: 48 }, (_, i) => ({
    id: `KP${1000 + i}`,
    name: `${surnames[i % surnames.length]}${given[(i * 3) % given.length]}${given[(i * 7) % given.length]}`,
    type: types[i % 4],
    status: statuses[i % statuses.length],
    age: 22 + ((i * 5) % 37),
    title: titles[i % titles.length],
    country: countries[i % countries.length],
  }))
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
  return Array.from({ length: 8 }, (_, i) => {
    const status = pick(['推进中', '已完成', '待处置'] as const)
    const progress =
      status === '已完成' ? 100 : status === '待处置' ? rand(0, 15) : rand(35, 92)
    return {
      id: `TK${i + 1}`,
      group: GROUPS[i % GROUPS.length],
      title: TASK_TITLES[i],
      status,
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

const COMMAND_GROUPS = ['一组', '二组', '三组', '四组']

function createCommandGroups(): CommandGroup[] {
  return COMMAND_GROUPS.map((name, i) => ({
    id: `G${i + 1}`,
    name,
    online: Math.random() > 0.08,
    members: rand(6, 24),
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
  const trend = hours.map((h, i) => ({
    label: `${h}:00`,
    gdIn: 18 + i * 3 + rand(0, 8),
    szIn: 10 + i * 2 + rand(0, 6),
    out: 8 + i + rand(0, 5),
  }))
  return {
    gdInToday: trend.reduce((s, p) => s + p.gdIn, 0),
    szInToday: trend.reduce((s, p) => s + p.szIn, 0),
    outToday: trend.reduce((s, p) => s + p.out, 0),
    inProvince: 86 + rand(0, 20),
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
    type: pick(['A', 'B', 'C', 'D'] as const),
    direction: dirs[(tick + i) % dirs.length],
    port: ports[(tick + i) % ports.length],
    from: froms[(tick + i * 3) % froms.length],
  }))
}

function refreshBorderFlow(prev: BorderFlowData, tick: number): BorderFlowData {
  const trend = prev.trend.map((p, i) =>
    i === prev.trend.length - 1
      ? {
          ...p,
          gdIn: Math.max(8, p.gdIn + rand(-2, 4)),
          szIn: Math.max(5, p.szIn + rand(-2, 3)),
          out: Math.max(3, p.out + rand(-1, 2)),
        }
      : p,
  )
  const records =
    tick % 3 === 0
      ? [createBorderRecords(tick)[0], ...prev.records.slice(0, 7)]
      : prev.records

  return {
    gdInToday: Math.max(prev.gdInToday, trend.reduce((s, p) => s + p.gdIn, 0)),
    szInToday: Math.max(prev.szInToday, trend.reduce((s, p) => s + p.szIn, 0)),
    outToday: Math.max(prev.outToday, trend.reduce((s, p) => s + p.out, 0)),
    inProvince: Math.max(60, prev.inProvince + rand(-1, 2)),
    trend,
    records,
  }
}

export function createInitialData(): DashboardData {
  const tasks = createTasks()
  return {
    tick: 0,
    weather: '晴',
    temperature: 27,
    location: '',
    overallReport: '总体可控，各组按预案推进，重点群体预警已闭环处置。',
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
  const patrolPoints = prev.patrolPoints.map((p) => ({
    ...p,
    force: Math.max(3, p.force + rand(-1, 1)),
    status: Math.random() > 0.9 ? pick(['正常', '警戒', '处置中'] as const) : p.status,
    x: Math.min(90, Math.max(10, p.x + (Math.random() - 0.5) * 0.35)),
    y: Math.min(82, Math.max(18, p.y + (Math.random() - 0.5) * 0.35)),
  }))

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

  const keyGroups = prev.keyGroups.map((g) => ({
    ...g,
    count: Math.max(10, g.count + rand(-1, 2)),
    warning: Math.max(0, g.warning + rand(-1, 1)),
  }))

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
            '总体可控，各组按预案推进，重点群体预警已闭环处置。',
            '东侧通道客流上升，已增派机动力量支援。',
            '敏感舆情已压降至黄线以下，持续盯防中。',
            '任务销号进度稳步提升，待处置事项已清零过半。',
          ])
        : prev.overallReport,
    patrolPoints,
    tracks: shiftTracks(prev.tracks),
    keyGroups,
    keyPersons:
      tick % 6 === 0
        ? prev.keyPersons.map((p, i) =>
            i % 7 === tick % 7
              ? { ...p, status: pick(['在控', '核处中', '轨迹异常', '已核查']) }
              : p,
          )
        : prev.keyPersons,
    opinions,
    tasks,
    collabs,
    commandGroups: tick % 5 === 0 ? createCommandGroups() : prev.commandGroups,
    borderFlow: refreshBorderFlow(prev.borderFlow, tick),
    taskSummary: summarizeTasks(tasks),
  }
}
