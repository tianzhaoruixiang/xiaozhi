export interface MeetingArchiveDoc {
  id: string
  year: number
  date: string
  title: string
  meetingType: string
  topics: string[]
  attendees: string[]
  summary: string
  decisions: string[]
  attachments: string[]
  keywords: string[]
}

/** 历年调度会 / 联席会议档案（演示数据） */
export const MEETING_ARCHIVES: MeetingArchiveDoc[] = [
  {
    id: 'mtg-2023-dispatch-q2',
    year: 2023,
    date: '2023-06-15',
    title: '2023 年第二季度人员调度联席会',
    meetingType: '人员调度会',
    topics: ['重点任务力量配置', '跨部门抽调', '值守安排'],
    attendees: ['市政府办公室', '应急管理局', '人社局', '发改委'],
    summary:
      '明确重点任务人员抽调原则：先保一线、再保值守；跨部门抽调须办公室统筹备案；应急值守实行双岗互备。',
    decisions: [
      '跨部门抽调须提前 48 小时报办公室备案',
      '应急值守双岗互备，名单每周更新',
      '人社局建立临时抽调人员台账',
    ],
    attachments: ['2023Q2调度纪要.pdf', '抽调原则.docx'],
    keywords: ['人员调度', '抽调', '值守', '联席会'],
  },
  {
    id: 'mtg-2023-emergency',
    year: 2023,
    date: '2023-09-08',
    title: '防汛应急人员调度专题会',
    meetingType: '应急调度',
    topics: ['抢险力量预置', '物资保障', '信息报送'],
    attendees: ['应急管理局', '住建局', '交通运输局', '办公室'],
    summary:
      '按风险区域预置抢险力量；住建、交通分别明确道路与管网应急班组；办公室统一信息报送口径，每两小时一报。',
    decisions: [
      '高风险点位力量前移，24 小时待命',
      '信息报送统一走办公室值班渠道',
      '形成防汛调度人员名册并动态维护',
    ],
    attachments: ['防汛力量预置表.xlsx', '报送口径.docx'],
    keywords: ['应急', '防汛', '调度', '值守'],
  },
  {
    id: 'mtg-2024-prep',
    year: 2024,
    date: '2024-03-12',
    title: '人员调度会预备沟通',
    meetingType: '调度预备',
    topics: ['议程确认', '参会名单', '背景材料'],
    attendees: ['办公室', '人社局', '发改委', '财政局'],
    summary:
      '确认调度会议程：力量配置、跨部门协同、值守安排。办公室负责材料打包；人社局提供在岗底数；发改委补充重点项目用工需求。',
    decisions: [
      '材料 T-1 日 17:00 前锁定',
      '出差无法出席人员由数智助手代参并注明',
      '预备沟通结论形成纪要抄送各部门',
    ],
    attachments: ['议程草案.docx', '参会名单.xlsx'],
    keywords: ['调度会', '预备沟通', '议程', '参会名单'],
  },
  {
    id: 'mtg-2024-duty',
    year: 2024,
    date: '2024-11-20',
    title: '节假日值班与人员调度安排会',
    meetingType: '值班调度',
    topics: ['值班表', '应急联络', '替班机制'],
    attendees: ['办公室', '应急管理局', '人社局'],
    summary:
      '明确节假日值班带班领导与联络员；建立替班审批机制；应急联络群 24 小时在线。',
    decisions: [
      '替班须提前报办公室同意',
      '带班领导名单对外公示口径由办公室统一',
    ],
    attachments: ['节日值班表.xlsx'],
    keywords: ['值班', '调度', '替班', '联络'],
  },
  {
    id: 'mtg-2025-dispatch-q1',
    year: 2025,
    date: '2025-03-28',
    title: '2025 年第一季度人员调度会',
    meetingType: '人员调度会',
    topics: ['开年重点任务', '基层督导力量', '跨部门协同'],
    attendees: ['办公室', '发改委', '人社局', '住建局', '财政局'],
    summary:
      '围绕开年重点任务明确督导力量配置；要求各部门按周报送在岗与可调配人员；办公室建立调度决议跟踪表。',
    decisions: [
      '督导力量名册对领导办公室开放',
      '可调配人员周报纳入值班简报',
      '办公室建立「历次调度决议跟踪表」',
    ],
    attachments: ['2025Q1调度决议跟踪.xlsx', '督导力量名册.pdf'],
    keywords: ['人员调度', '督导', '协同', '决议跟踪'],
  },
  {
    id: 'mtg-2025-staffing',
    year: 2025,
    date: '2025-08-06',
    title: '重点项目人员抽调推进会',
    meetingType: '抽调协调',
    topics: ['抽调进度', '专业力量匹配', '保障措施'],
    attendees: ['人社局', '发改委', '办公室'],
    summary:
      '重点项目专业力量抽调进入中期：技术骨干基本到位，综合保障岗待补齐；须在正式调度会前完成风险说明页。',
    decisions: [
      '保障岗人选会前 3 日确定',
      '风险说明覆盖专业缺口、出差代参、值守冲突',
      '调度材料含历次相关会议决议摘要',
    ],
    attachments: ['抽调进度周报.docx', '风险说明草稿.docx'],
    keywords: ['抽调', '重点项目', '调度会', '保障'],
  },
  {
    id: 'mtg-2022-annual',
    year: 2022,
    date: '2022-12-18',
    title: '2022 年度人员统筹务虚会',
    meetingType: '务虚会',
    topics: ['年度力量结构', '应急预备队', '能力建设'],
    attendees: ['办公室', '人社局', '应急管理局'],
    summary:
      '提出建立应急预备队与常态抽调清单；强调一专多能与跨部门协同演练。',
    decisions: [
      '组建市级应急预备队名册',
      '每半年组织一次跨部门协同演练',
    ],
    attachments: ['年度人员统筹纪要.pdf'],
    keywords: ['统筹', '预备队', '演练', '能力建设'],
  },
]
