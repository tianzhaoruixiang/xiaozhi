import type {
  SignoffActivity,
  SignoffAssistantTask,
  SignoffDepartment,
  SignoffMaterial,
  SignoffOpinion,
} from '../types/signoff'
import { planDocument } from './meeting'

export const signoffDepartments: SignoffDepartment[] = [
  { id: 'command', name: '市局指挥中心', signer: '张伟', role: '指挥长', order: 1, status: 'signed', signedAt: '11:48', sealCode: 'QZ-2401' },
  { id: 'security', name: '治安支队', signer: '王凯', role: '支队负责人', order: 2, status: 'signed', signedAt: '11:51', sealCode: 'ZA-0816' },
  { id: 'entry', name: '出入境管理支队', signer: '陈立', role: '审核负责人', order: 3, status: 'signed', signedAt: '11:54', sealCode: 'CRJ-0328' },
  { id: 'cyber', name: '网安支队', signer: '赵敏', role: '研判负责人', order: 4, status: 'pending' },
  { id: 'traffic', name: '交警支队', signer: '何建', role: '交通保障负责人', order: 5, status: 'objection' },
  { id: 'fire', name: '消防救援支队', signer: '马宁', role: '现场联络人', order: 6, status: 'pending' },
]

export const signoffOpinions: SignoffOpinion[] = [
  {
    id: 'opinion-traffic-01',
    departmentId: 'traffic',
    clauseId: 'rev-401',
    section: '4.1 核心区域划分',
    author: '何建',
    department: '交警支队',
    time: '11:57',
    content: '同意采用东侧弹性边界，但需明确早高峰结束时间及恢复 150 米边界的触发条件。',
    proposal: '补充“09:30 后或道路流量降至阈值以下时，恢复 150 米缓冲区”的执行条件。',
    status: 'open',
  },
]

export const signoffActivities: SignoffActivity[] = [
  { id: 1, time: '11:48', title: '指挥中心完成会签', detail: '确认方案版本、指挥关系及下发范围', type: 'success' },
  { id: 2, time: '11:54', title: '出入境管理支队完成会签', detail: '境外人员审核节点与名单复核要求已确认', type: 'success' },
  { id: 3, time: '11:57', title: '交警支队提出补充意见', detail: '需明确东侧弹性边界恢复条件', type: 'running' },
]

export const signoffAssistantTasks: SignoffAssistantTask[] = [
  { title: '正在汇总会签意见', detail: '对照最终条文定位各部门意见和影响范围' },
  { title: '正在检查签署完整性', detail: '核验签署人员、单位权限和电子签章记录' },
  { title: '正在检测意见冲突', detail: '比对交通保障要求与现场安保边界条件' },
  { title: '正在生成定稿记录', detail: '整理版本摘要、签署时间和审计编号' },
]

export const signoffMaterials: SignoffMaterial[] = [
  {
    id: 'final-plan',
    title: '大型会议保障安保方案',
    kind: '会议定稿',
    meta: '版本 1.4',
    status: '会签依据',
    sections: [
      {
        title: '本版关键条文',
        items: planDocument.changes,
      },
    ],
  },
  {
    id: 'meeting-minutes',
    title: planDocument.minutes.title,
    kind: '会议纪要',
    meta: '2026-09-20 10:29',
    status: '会议生成',
    sections: [
      {
        title: '会议概述',
        items: [planDocument.minutes.summary],
      },
      {
        title: '议定事项',
        items: planDocument.minutes.decisions,
      },
      {
        title: '责任任务',
        items: planDocument.minutes.actions.map((action) => `${action.owner}：${action.content}（${action.deadline}）`),
      },
    ],
  },
  {
    id: 'accepted-decisions',
    title: '领导采纳意见清单',
    kind: '决策记录',
    meta: '8 条已采纳',
    status: '已归档',
    sections: [
      {
        title: '采纳意见摘要',
        items: [
          '增设跨组联络专席，重大情况同步会商。',
          '境外人员审核节点前移至会前 72 小时。',
          '主入口高峰时段开放全部安检通道并保留疏散通道。',
          '弱电机房和临时搭建区域纳入会前专项检查。',
        ],
      },
    ],
  },
]
