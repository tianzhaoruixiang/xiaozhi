import type { AssistantActivity, AssistantTask, Participant, PlanDocument, ScriptLine, Suggestion, TranscriptEntry } from '../types/meeting'

export const participants: Participant[] = [
  { id: 'leader', name: '张卫明', department: '市局指挥中心', role: '指挥长 · 会议主持', initial: '张', color: 'oklch(0.43 0.07 245)', avatar: 1 },
  { id: 'zhou', name: '周晓宁', department: '情报支队', role: '情报负责人', initial: '周', color: 'oklch(0.44 0.08 175)', avatar: 2 },
  { id: 'lin', name: '林珊琪', department: '市局指挥中心', role: '情况通报负责人', initial: '林', color: 'oklch(0.44 0.06 290)', avatar: 3 },
  { id: 'chen', name: '陈立文', department: '出入境管理支队', role: '审核负责人', initial: '陈', color: 'oklch(0.43 0.08 200)', avatar: 4 },
  { id: 'zhao', name: '赵敏婕', department: '网安支队', role: '研判负责人', initial: '赵', color: 'oklch(0.42 0.07 270)', avatar: 5 },
  { id: 'wang', name: '王凯铭', department: '治安支队', role: '现场安保负责人', initial: '王', color: 'oklch(0.43 0.07 55)', avatar: 6 },
  { id: 'liu', name: '刘超群', department: '特警支队', role: '机动力量负责人', initial: '刘', color: 'oklch(0.43 0.07 30)', avatar: 8 },
  { id: 'sun', name: '孙梅芳', department: '内保支队', role: '场馆检查负责人', initial: '孙', color: 'oklch(0.44 0.07 100)', avatar: 7 },
]

export const initialTranscripts: TranscriptEntry[] = [
  {
    id: 1,
    speakerId: 'leader',
    time: '10:25:06',
    content: '请各部门围绕现有方案提出补充意见，重点核实人员审核、现场安保部署和应急处置安排。',
  },
  {
    id: 2,
    speakerId: 'wang',
    time: '10:28:41',
    content: '建议主入口安检通道高峰时段全部开启，并预留应急疏散通道，确保通行速度与安全检查质量。',
    status: 'accepted',
  },
  {
    id: 3,
    speakerId: 'liu',
    time: '10:31:52',
    content: '建议在东侧交通转换区增设一支联合机动处置单元，现有力量到场时间超过预设阈值。',
    status: 'pending',
    tags: ['机动力量', '力量编成'],
  },
]

export const initialSuggestion: Suggestion = {
  id: 101,
  speakerId: 'liu',
  time: '10:31:52',
  title: '增设一支联合机动处置单元',
  content: '在东侧交通转换区配置联合机动单元，弥补现有力量到场时间不足。',
  chapter: '第四章 现场安保部署',
  references: 2,
  tags: ['机动力量', '力量编成'],
}

export const scriptLines: ScriptLine[] = [
  {
    speakerId: 'zhou',
    content: '建议在市局指挥中心增设跨组联络专席，现场异常由值守人员一键上报，并同步通知相关作战组。',
  },
  {
    speakerId: 'chen',
    content: '境外参会人员名单建议提前至会前 72 小时提交审核，临时变更人员必须经过二次确认，并同步更新入场名单。',
    suggestion: {
      title: '境外人员审核节点前移',
      content: '境外名单会前 72 小时提交首轮审核，会前 24 小时完成增补名单复核。',
      chapter: '第二章 人员审核与管控',
      references: 2,
      tags: ['境外审核', '名单复核'],
    },
  },
  {
    speakerId: 'zhao',
    content: '建议围绕周边交通节点和公开参会嘉宾建立关联监测词表，对异常传播链路进行持续研判。',
  },
  {
    speakerId: 'sun',
    content: '场馆消防通道已经完成第一轮检查，弱电机房和临时搭建区域将纳入下一轮全项检查范围。',
  },
  {
    speakerId: 'wang',
    content: '建议将外围安保缓冲区由 100 米调整为 150 米，东侧城市主干道根据早高峰流量动态调整管控边界。',
    suggestion: {
      title: '外围缓冲区扩大至 150 米',
      content: '以主会场建筑外沿为基准设置 150 米缓冲区，东侧主干道按早高峰流量弹性管控。',
      chapter: '第四章 现场安保部署',
      references: 3,
      tags: ['现场安保', '缓冲区'],
    },
  },
  {
    speakerId: 'leader',
    content: '请会议助手汇总已采纳意见，检查方案中是否还有职责空白，并准备进入统稿确认环节。',
  },
]

export const assistantTasks: AssistantTask[] = [
  { title: '正在整理安保方案', detail: '校核已采纳意见，补充第四章岗点职责。', steps: ['提取意见', '关联章节', '校核表述'], activeStep: 2 },
  { title: '正在整理会议纪要', detail: '同步归纳发言要点、议定事项和责任分工。', steps: ['记录发言', '提炼决议', '核对责任'], activeStep: 1 },
  { title: '正在查询历史安保案例', detail: '检索近五年同类会议安保部署和场馆管控材料。', steps: ['构造检索', '筛选案例', '提取依据'], activeStep: 1 },
  { title: '正在分析当前发言', detail: '识别责任单位、时间要求和可能影响的作战组。', steps: ['识别实体', '提炼任务', '分析影响'], activeStep: 1 },
  { title: '正在检查方案完整性', detail: '核对任务边界、责任人和应急处置要求。', steps: ['检查职责', '检查时限', '检查联动'], activeStep: 0 },
]

export const initialActivities: AssistantActivity[] = [
  { id: 1, time: '10:32', title: '正在查询历史安保案例', detail: '已找到3份材料，正在比对场馆适用性', type: 'running' },
  { id: 2, time: '10:31', title: '提取刘超群发言要点', detail: '已形成 1 条方案更新建议，等待领导确认', type: 'success' },
  { id: 3, time: '10:29', title: '安保方案已更新至版本 1.3', detail: '已补充联合指挥专席与境外人员审核节点', type: 'success' },
]

export const planDocument: PlanDocument = {
  draftUnit: '市局联合指挥中心',
  updatedAt: '2026-09-20 10:29',
  changes: [
    '第一章增设公安、外事、网信、消防联合指挥专席，重大情况同步会商',
    '第二章境外人员审核节点前移至会前 72 小时，增补名单会前 24 小时复核',
    '第五章会前检查补充弱电机房与临时搭建检查项，整改后复核销号',
    '第六章建立重点群体分级监测清单，明确三级触发条件与通报时限',
  ],
  chapters: [
    {
      id: 'command',
      no: '第一章',
      title: '组织指挥体系',
      items: [
        '统一指挥、分级负责、属地管理，由市局牵头建立安保总指挥部',
        '增设公安、外事、网信、消防联合指挥专席，重大情况同步会商',
        '每日 8 时、16 时信息报送，重大情况随时报告；实行领导带班和 24 小时值班',
      ],
    },
    {
      id: 'review',
      no: '第二章',
      title: '人员审核与管控',
      items: [
        '境外参会人员名单会前 72 小时提交审核，会前 24 小时完成增补复核',
        '参会名单实行两级复核，复核疑问退回原单位限期说明',
        '入场凭证专用证件核验，专人专管、遗失即报，无证人员不得进入管控区域',
      ],
    },
    {
      id: 'opinion',
      no: '第三章',
      title: '舆情监测与处置',
      items: [
        '建立 7×24 小时舆情监测值班制度，重要舆情形成专报逐级上报',
        '围绕活动名称、主办单位和会议地点开展网络舆情监测',
        '舆情按影响程度三级处置：即时处置、会商处置、提请联合指挥专席',
      ],
    },
    {
      id: 'onsite',
      no: '第四章',
      title: '现场安保部署',
      items: [
        '以主会场建筑外沿为基准设置 100 米外围安保缓冲区',
        '入口安检通道配备安检门、手持探测仪，高峰时段全部开启并预留疏散通道',
        '定人定岗定责，重点部位双人双岗；南北两侧各驻守一支机动处置单元',
      ],
    },
    {
      id: 'venue',
      no: '第五章',
      title: '场馆检查与应急',
      items: [
        '会前完成消防通道、疏散出口、配电设施和重点设备检查',
        '隐患实行清单管理，逐项明确责任单位与完成时限，复查销号后投入使用',
        '制定突发事件应急预案，活动前组织一次桌面推演',
      ],
    },
    {
      id: 'intelligence',
      no: '第六章',
      title: '重点群体监测与通报',
      items: [
        '围绕重点群体建立动态监测清单，发现异常情况及时上报',
        '各工作组按规定向联合指挥中心报告工作进展和风险情况',
      ],
    },
  ],
  groups: [
    {
      id: 'group-x',
      name: '人员审核组',
      lead: '陈立文',
      department: '出入境管理支队',
      size: 8,
      tasks: [
        '境外参会人员首轮审核，形成需补充材料清单',
        '参会名单两级复核与增补名单确认',
        '专用证件核验与入场管控',
      ],
    },
    {
      id: 'group-y',
      name: '舆情监测组',
      lead: '赵敏婕',
      department: '网安支队',
      size: 12,
      tasks: [
        '建立活动关联舆情监测词表与日报模板',
        '7×24 小时舆情值守监测，重要舆情专报上报',
        '异常传播链路研判与分级响应',
      ],
    },
    {
      id: 'group-z',
      name: '现场安保组',
      lead: '王凯铭',
      department: '治安支队',
      size: 46,
      tasks: [
        '外围缓冲区布设与前置识别岗，落实东侧早高峰弹性边界',
        '安检通道与固定岗点值守，重点部位双人双岗',
        '机动处置单元驻守与现场处置',
      ],
    },
    {
      id: 'group-e',
      name: '场馆检查组',
      lead: '孙梅芳',
      department: '内保支队',
      size: 10,
      tasks: [
        '重点场馆全项检查，覆盖弱电机房与临时搭建区域',
        '隐患清单整改跟踪与复核销号',
        '应急处置联动与桌面推演配合',
      ],
    },
    {
      id: 'group-f',
      name: '重点监测组',
      lead: '周晓宁',
      department: '情报支队',
      size: 9,
      tasks: [
        '建立重点群体分级监测清单，明确触发条件与跟进责任人',
        '重点级别情况同步推送联合指挥专席',
        '风险研判与情况通报时限管理',
      ],
    },
    {
      id: 'group-g',
      name: '情况通报组',
      lead: '林珊琪',
      department: '市局指挥中心',
      size: 6,
      tasks: [
        '联合专席日常与紧急情况通报',
        '重大事项双人复核流程与审批留痕',
        '各组信息汇总与上报口径统一',
      ],
    },
  ],
  minutes: {
    title: '大型会议保障动员会会议纪要',
    recorder: '会议助手 · 小智',
    status: '实时草拟中',
    summary: '会议听取了前期筹备情况，审议总体安保方案，并围绕人员审核、现场安保、场馆检查、舆情监测和应急处置等事项进行了讨论。',
    decisions: [
      '同意增设公安、外事、网信、消防联合指挥专席，重大情况同步会商。',
      '境外参会人员名单提前至会前 72 小时提交审核，增补名单于会前 24 小时完成复核。',
      '主入口安检通道在高峰时段全部开启，并保留独立应急疏散通道。',
      '会前检查增加弱电机房与临时搭建区域，隐患整改实行复核销号。',
    ],
    actions: [
      { id: 'minute-action-1', content: '完成境外参会人员首轮审核并形成补充材料清单', owner: '人员审核组', deadline: '会前 72 小时' },
      { id: 'minute-action-2', content: '核定主入口安检通道和应急疏散通道布设', owner: '现场安保组', deadline: '9月21日 18:00' },
      { id: 'minute-action-3', content: '完成弱电机房、临时搭建区域专项检查', owner: '场馆检查组', deadline: '9月22日 12:00' },
    ],
  },
}
