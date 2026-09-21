import type {
  DistributionActivity,
  DistributionAssistantTask,
  DistributionGroup,
  DistributionMaterial,
  DistributionTask,
} from '../types/distribution'

export const distributionGroups: DistributionGroup[] = [
  {
    id: 'x', name: '人员审核组', responsibility: '境外参会人员审核', lead: '陈立', department: '出入境管理支队', memberCount: 8, color: '#54d6ff',
    members: [
      { name: '李娜', role: '审核员', unit: '出入境管理支队' },
      { name: '张磊', role: '复核员', unit: '出入境管理支队' },
      { name: '王芳', role: '材料核对员', unit: '出入境管理支队' },
    ],
    membersPulled: true,
  },
  {
    id: 'y', name: '舆情监测组', responsibility: '会议及场馆舆情监测', lead: '赵敏', department: '网安支队', memberCount: 12, color: '#6e8cff',
    members: [
      { name: '周妍', role: '分析员', unit: '网安支队' },
      { name: '徐磊', role: '值守监测员', unit: '网安支队' },
    ],
    membersPulled: false,
  },
  {
    id: 'z', name: '现场安保组', responsibility: '核心区域现场安保', lead: '王凯', department: '治安支队', memberCount: 46, color: '#45e0b4',
    members: [
      { name: '刘超', role: '机动单元负责人', unit: '特警支队' },
      { name: '马强', role: '岗点值守负责人', unit: '治安支队' },
      { name: '赵虎', role: '前置识别岗负责人', unit: '治安支队' },
    ],
    membersPulled: true,
  },
  {
    id: 'e', name: '场馆检查组', responsibility: '会前重点场馆检查', lead: '孙梅', department: '内保支队', memberCount: 10, color: '#efc24f',
    members: [
      { name: '高伟', role: '检查员', unit: '内保支队' },
      { name: '宋洁', role: '复核员', unit: '场馆运营方' },
    ],
    membersPulled: true,
  },
  {
    id: 'f', name: '重点监测组', responsibility: '重点群体动态监测', lead: '周宁', department: '情报支队', memberCount: 9, color: '#e78962',
    members: [
      { name: '吴倩', role: '监测员', unit: '情报支队' },
      { name: '郑凯', role: '属地联络员', unit: '属地分局' },
    ],
    membersPulled: true,
  },
  {
    id: 'g', name: '情况通报组', responsibility: '情况汇总与通报', lead: '林珊', department: '市局指挥中心', memberCount: 6, color: '#a985ff',
    members: [
      { name: '郑晓', role: '通报专员', unit: '市局指挥中心' },
      { name: '何静', role: '信息归集员', unit: '市局指挥中心' },
    ],
    membersPulled: false,
  },
]

export const distributionTasks: DistributionTask[] = [
  {
    id: 'task-x-01', groupId: 'x', title: '完成境外参会人员首轮审核',
    description: '按最终名单完成身份、证件和行程信息核验，形成需补充材料清单。',
    owner: '陈立', collaborators: ['外事办联络员', '会务组'], deadline: '09月22日 18:00',
    deliverable: '首轮审核清单', priority: 'important', status: 'confirmed', sourceClauseIds: ['rev-201'],
  },
  {
    id: 'task-y-01', groupId: 'y', title: '建立活动关联舆情监测词表',
    description: '覆盖活动名称、场馆、交通节点和公开参会嘉宾，建立异常传播链路监测规则。',
    owner: '赵敏', collaborators: ['宣传部门', '属地网安'], deadline: '09月22日 12:00',
    deliverable: '监测词表与日报模板', priority: 'important', status: 'pending', sourceClauseIds: ['rev-301'],
  },
  {
    id: 'task-z-01', groupId: 'z', title: '布设外围缓冲区与前置识别岗',
    description: '落实 150 米缓冲区及东侧早高峰弹性边界，明确 09:30 后恢复条件。',
    owner: '王凯', collaborators: ['交警支队', '属地分局'], deadline: '09月23日 16:00',
    deliverable: '岗点图与边界切换预案', priority: 'urgent', status: 'pending', sourceClauseIds: ['rev-401'],
  },
  {
    id: 'task-z-02', groupId: 'z', title: '配置第三支联合机动单元',
    description: '在东侧交通转换区配置联合机动单元，完成力量编成和到场路线确认。',
    owner: '刘超', collaborators: ['特警支队', '交警支队'], deadline: '09月23日 18:00',
    deliverable: '机动力量编成表', priority: 'important', status: 'confirmed', sourceClauseIds: ['rev-402'],
  },
  {
    id: 'task-e-01', groupId: 'e', title: '完成重点场馆全项检查',
    description: '检查消防通道、弱电机房及临时搭建区域，隐患整改后复核销号。',
    owner: '孙梅', collaborators: ['消防救援支队', '场馆方'], deadline: '09月23日 12:00',
    deliverable: '检查清单与销号记录', priority: 'important', status: 'confirmed', sourceClauseIds: ['rev-501'],
  },
  {
    id: 'task-f-01', groupId: 'f', title: '建立重点群体分级监测清单',
    description: '结合活动风险要素形成分级清单，明确触发条件和跟进责任人。',
    owner: '周宁', collaborators: ['属地分局', '情报专班'], deadline: '09月22日 20:00',
    deliverable: '分级监测清单', priority: 'normal', status: 'pending', sourceClauseIds: ['rev-601'],
  },
  {
    id: 'task-g-01', groupId: 'g', title: '建立联合指挥情况通报机制',
    description: '按联合专席要求形成日常、紧急两类通报模板和发送范围。',
    owner: '林珊', collaborators: ['各作战组联络员'], deadline: '09月22日 18:00',
    deliverable: '情况通报模板', priority: 'normal', status: 'pending', sourceClauseIds: ['rev-101'],
  },
  {
    id: 'task-g-02', groupId: 'g', title: '配置重大事项双人复核流程',
    description: '将重点人员和境外人员处置事项纳入双人复核，并启用审批留痕。',
    owner: '林珊', collaborators: ['法制支队', '人员审核组'], deadline: '09月23日 10:00',
    deliverable: '复核流程与人员名单', priority: 'important', status: 'pending', sourceClauseIds: ['rev-102'],
  },
]

export const distributionMaterials: DistributionMaterial[] = [
  { id: 'material-1', title: '最终安保方案', type: '正式文件', recipients: '6 个作战组', status: 'ready' },
  { id: 'material-2', title: '安保动员会会议纪要', type: '会议材料', recipients: '组长及联络员', status: 'ready' },
  { id: 'material-3', title: '作战组任务清单', type: '任务附件', recipients: '91 名执行人员', status: 'ready' },
]

export const distributionActivities: DistributionActivity[] = [
  { id: 1, time: '12:16', title: '完成方案任务拆解', detail: '从最终方案提取 8 项执行任务', type: 'success' },
  { id: 2, time: '12:17', title: '建立六个作战组', detail: '已匹配组长、成员和协作单位', type: 'success' },
  { id: 3, time: '12:18', title: '正在核对跨组依赖', detail: '检查现场安保组与交警支队协同时段', type: 'running' },
]

export const distributionAssistantTasks: DistributionAssistantTask[] = [
  { title: '正在核对任务完整性', detail: '检查负责人、时限、交付物和上报规则' },
  { title: '正在匹配跨组协作关系', detail: '核对人员审核、现场安保和情况通报依赖' },
  { title: '正在检查资源冲突', detail: '比对人员排班、车辆和现场力量使用时段' },
  { title: '正在生成下发材料', detail: '按作战组整理任务清单和必要附件' },
]
