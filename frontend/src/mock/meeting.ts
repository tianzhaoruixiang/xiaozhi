import type { AgendaPhase, AssistantActivity, AssistantTask, Participant, PlanDocument, ScriptLine, Suggestion, TranscriptEntry } from '../types/meeting'

export const participants: Participant[] = [
  { id: 'leader', name: '王卫明', department: '市局指挥中心', role: '指挥长 · 会议主持', initial: '王', color: 'oklch(0.43 0.07 245)', avatar: 1, signedIn: false, isMe: true },
  { id: 'zhou', name: '周晓宁', department: '情报支队', role: '情报负责人', initial: '周', color: 'oklch(0.44 0.08 175)', avatar: 2, signedIn: true },
  { id: 'lin', name: '林珊琪', department: '市局指挥中心', role: '情况通报负责人', initial: '林', color: 'oklch(0.44 0.06 290)', avatar: 3, signedIn: true },
  { id: 'chen', name: '陈立文', department: '出入境管理支队', role: '审核负责人', initial: '陈', color: 'oklch(0.43 0.08 200)', avatar: 4, signedIn: true },
  { id: 'zhao', name: '赵敏婕', department: '网安支队', role: '研判负责人', initial: '赵', color: 'oklch(0.42 0.07 270)', avatar: 5, signedIn: true },
  { id: 'wang', name: '王凯铭', department: '治安支队', role: '现场安保负责人', initial: '王', color: 'oklch(0.43 0.07 55)', avatar: 6, signedIn: true },
  { id: 'liu', name: '刘超群', department: '特警支队', role: '机动力量负责人', initial: '刘', color: 'oklch(0.43 0.07 30)', avatar: 8, signedIn: true },
  { id: 'sun', name: '孙梅芳', department: '内保支队', role: '场馆检查负责人', initial: '孙', color: 'oklch(0.44 0.07 100)', avatar: 7, signedIn: true },
]

export const initialTranscripts: TranscriptEntry[] = [
  {
    id: 1,
    speakerId: 'assistant',
    time: '10:00',
    content: '各位参会人员好，会议即将开始，请在签到栏完成签到入场。当前已有 7 人完成签到，等待最后 1 位参会人员签到。',
  },
]

export const agendaPhases: AgendaPhase[] = [
  {
    id: 'briefing',
    label: '通报前期筹备情况',
    assistantIntro: '人已到齐，会议正式开始。首先进行第二项议程：通报前期筹备情况，请情况通报负责人介绍总体筹备进展。',
    lines: [
      {
        speakerId: 'lin',
        content: '总体筹备进展通报：各专项安保方案已编制完成并通过内部会审，会议材料、场地保障和参会人员组织工作全部就绪，具备进入方案审议的条件。',
      },
      {
        speakerId: 'sun',
        content: '场馆方面，消防通道已经完成第一轮检查，弱电机房和临时搭建区域将纳入下一轮全项检查范围，检查结果将同步报送联合指挥专席。',
      },
      {
        speakerId: 'liu',
        content: '特警支队已完成机动处置力量编成，两组备勤力量和防爆装备检查就绪，可按预案随时增援重点区域，处置预案已与现场安保组完成对接。',
      },
    ],
  },
  {
    id: 'review',
    label: '审议总体安保方案',
    assistantIntro: '筹备情况通报完毕。下面进行第三项议程：审议总体安保方案，请相关责任部门发表审议意见。',
    lines: [
      {
        speakerId: 'zhou',
        content: '情报阵地方面，建议按三级预警标准分级推送情报产品，红色预警直接联动现场指挥部，确保第一时间锁定处置窗口。',
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
    ],
  },
  {
    id: 'opinions',
    label: '各部门补充意见',
    assistantIntro: '总体安保方案审议完毕。下面进行第四项议程：征求各部门补充意见。',
    lines: [
      {
        speakerId: 'zhou',
        content: '建议在市局指挥中心增设跨组联络专席，现场异常由值守人员一键上报，并同步通知相关作战组。',
      },
      {
        speakerId: 'zhao',
        content: '建议围绕周边交通节点和公开参会嘉宾建立关联监测词表，对异常传播链路进行持续研判。',
      },
      {
        speakerId: 'sun',
        content: '内保方面补充一点，建议在贵宾通道和主入口高峰时段实行双岗查验，安检力量配置方案由内保支队牵头细化。',
      },
    ],
  },
  {
    id: 'summary',
    label: '领导总结部署',
    assistantIntro: '各部门补充意见征集完毕。下面进行第五项议程：领导总结部署。',
    lines: [
      {
        speakerId: 'leader',
        content: '总体要求：各作战组会后按分工细化落实措施，重点点位值守表明日报指挥中心备案，现场发现异常直接向联络专席报告。',
      },
      {
        speakerId: 'leader',
        content: '请会议助手汇总已登记的会议建议，检查方案中是否还有职责空白，做好进入统稿确认环节的准备。',
      },
    ],
  },
]

/** 统稿确认阶段：各责任单位负责人对统稿事项逐条表态 */
export const revisionSpeech: ScriptLine[] = [
  { speakerId: 'zhou', content: '统稿中联席会商频次调整为每日两次的表述，与会上讨论一致，情报支队同意采纳。' },
  { speakerId: 'chen', content: '境外人员审核节点前移的条文表述准确，补充的二次确认流程可执行，出入境管理支队同意写入。' },
  { speakerId: 'wang', content: '缓冲区扩大至 150 米的部署条款没有异议，引导标识和应急通道的补充表述建议一并采纳。' },
  { speakerId: 'lin', content: '预案目录和值守表调整属于低风险表述，建议批量确认，加快统稿进度。' },
]

/** 联合会签阶段：各单位负责人会签表态 */
export const signoffSpeech: ScriptLine[] = [
  { speakerId: 'zhou', content: '情报支队对会议定稿内容无异议，同意会签。' },
  { speakerId: 'chen', content: '出入境管理支队确认相关条款已落实审核要求，同意会签。' },
  { speakerId: 'zhao', content: '网安支队对监测预警和舆情处置表述无异议，同意会签。' },
  { speakerId: 'wang', content: '治安支队确认现场安保部署条款完整，同意会签。' },
  { speakerId: 'sun', content: '内保支队对场馆安检和重点部位管控条款无异议，同意会签。' },
]

export const assistantTasks: AssistantTask[] = [
  { title: '正在整理安保方案', detail: '校核已采纳意见，补充第四章岗点职责。', steps: ['提取意见', '关联章节', '校核表述'], activeStep: 2 },
  { title: '正在整理会议纪要', detail: '同步归纳发言要点、议定事项和责任分工。', steps: ['记录发言', '提炼决议', '核对责任'], activeStep: 1 },
  { title: '正在查询历史安保案例', detail: '检索近五年同类会议安保部署和场馆管控材料。', steps: ['构造检索', '筛选案例', '提取依据'], activeStep: 1 },
  { title: '正在分析当前发言', detail: '识别责任单位、时间要求和可能影响的作战组。', steps: ['识别实体', '提炼任务', '分析影响'], activeStep: 1 },
  { title: '正在检查方案完整性', detail: '核对任务边界、责任人和应急处置要求。', steps: ['检查职责', '检查时限', '检查联动'], activeStep: 0 },
]

export const initialActivities: AssistantActivity[] = [
  { id: 1, time: '10:00', title: '等待参会人员签到', detail: '7 人已签到，等待最后 1 位', type: 'info' },
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
