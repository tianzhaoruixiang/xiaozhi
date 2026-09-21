import type { AssistantWatchItem, ChatMessage, OperationGroup, OperationMaterial, OperationTask } from '../types/operations'
import { distributionGroups } from './distribution'

export const operationGroups: OperationGroup[] = distributionGroups.map((group) => {
  const state = {
    x: { progress: 68, unread: 3, onlineCount: 7, alertCount: 1, statusText: '审核复核中' },
    y: { progress: 54, unread: 1, onlineCount: 10, alertCount: 1, statusText: '持续监测中' },
    z: { progress: 72, unread: 2, onlineCount: 43, alertCount: 0, statusText: '现场布设中' },
    e: { progress: 81, unread: 2, onlineCount: 9, alertCount: 2, statusText: '隐患整改中' },
    f: { progress: 46, unread: 0, onlineCount: 8, alertCount: 0, statusText: '动态监测中' },
    g: { progress: 60, unread: 4, onlineCount: 6, alertCount: 0, statusText: '汇总编报中' },
  }[group.id] ?? { progress: 0, unread: 0, onlineCount: 0, alertCount: 0, statusText: '任务执行中' }
  return { ...group, ...state }
})

export const operationMessages: ChatMessage[] = [
  { id: 'x-1', groupId: 'x', sender: '系统', role: '任务通知', avatar: '令', time: '13:06', kind: 'system', content: '指挥端已下发“境外参会人员审核”任务，最终安保方案、会议纪要和首轮审核清单已送达本组。' },
  { id: 'x-2', groupId: 'x', sender: '陈立', role: '组长', avatar: '陈', time: '13:08', kind: 'text', content: '名单共126人。请先核验身份、证件有效期和申报行程，发现资料不完整的直接在任务卡反馈。' },
  { id: 'x-3', groupId: 'x', sender: '作战助手', role: '智能协同成员', avatar: '智', time: '13:09', kind: 'task', isAssistant: true, title: '首轮审核任务已拆分', content: '已按名单批次分发给4名审核人员，并设置18:00前完成、异常双人复核的规则。', meta: '126人 · 4个批次 · 负责人陈立', progress: 68, tags: ['身份核验', '证件核验', '行程比对'], actions: ['查看任务', '调整分工'], source: '任务 task-x-01 · 最终方案条文 2.1' },
  { id: 'x-4', groupId: 'x', sender: '李娜', role: '审核员', avatar: '李', time: '14:12', kind: 'feedback', title: '第一批名单审核反馈', content: '42人已完成核验，其中40人信息一致，2人缺少完整行程材料，已标记待补充。', meta: '完成 42/42 · 附审核清单1份', tags: ['已完成', '2人待补充'], taskId: 'task-x-01', actions: ['查看附件', '确认反馈'] },
  { id: 'x-5', groupId: 'x', sender: '作战助手', role: '智能协同成员', avatar: '智', time: '14:13', kind: 'alert', isAssistant: true, title: '发现需要人工复核的反馈', content: '两条资料缺失反馈涉及同一接待批次，建议合并联系会务组补充，并由第二审核员复核后关闭。', meta: '依据：李娜14:12反馈、异常双人复核规则', tags: ['中风险', '跨部门协同'], actions: ['创建复核任务', '稍后处理'], source: '来源可追溯' },
  { id: 'x-6', groupId: 'x', sender: '张磊', role: '复核员', avatar: '张', time: '14:18', kind: 'text', content: '@作战助手 请把两条待补充记录合并成复核任务，并同步会务组联络员。' },
  { id: 'x-7', groupId: 'x', sender: '作战助手', role: '智能协同成员', avatar: '智', time: '14:19', kind: 'text', isAssistant: true, content: '已创建“接待批次资料补充复核”任务，负责人张磊，协作人为会务组联络员，要求16:30前反馈。任务已写入本组台账。', tags: ['任务已建立', '已通知协作人'] },

  { id: 'y-1', groupId: 'y', sender: '系统', role: '任务通知', avatar: '令', time: '13:06', kind: 'system', content: '指挥端已下发“会议及场馆舆情监测”任务和监测范围。' },
  { id: 'y-2', groupId: 'y', sender: '赵敏', role: '组长', avatar: '赵', time: '13:20', kind: 'text', content: '重点关注活动名称、举办场馆和周边交通三个方向，异常传播链路立即上报。' },
  { id: 'y-3', groupId: 'y', sender: '作战助手', role: '智能协同成员', avatar: '智', time: '14:02', kind: 'feedback', isAssistant: true, title: '舆情监测阶段反馈', content: '已完成首轮词表巡检，涉及场馆交通的讨论量上升，暂未形成集中负面传播。', meta: '监测主题 18项 · 需关注线索 1项', tags: ['持续观察', '交通话题'], actions: ['查看趋势', '加入重点监测'] },
  { id: 'y-4', groupId: 'y', sender: '周妍', role: '分析员', avatar: '周', time: '14:15', kind: 'text', content: '已将场馆东侧道路管制相关讨论加入重点观察，下一轮15:00反馈。' },

  { id: 'z-1', groupId: 'z', sender: '系统', role: '任务通知', avatar: '令', time: '13:06', kind: 'system', content: '现场安保任务已下发，包含150米外围缓冲区、前置识别岗和第三支联合机动单元。' },
  { id: 'z-2', groupId: 'z', sender: '王凯', role: '组长', avatar: '王', time: '13:24', kind: 'text', content: '各区域负责人按岗点图确认人员、设备和到场路线，东侧区域注意09:30边界切换条件。' },
  { id: 'z-3', groupId: 'z', sender: '刘超', role: '机动单元负责人', avatar: '刘', time: '14:08', kind: 'feedback', title: '第三联合机动单元反馈', content: '12名队员、2台车辆已完成编成，到场路线与交警支队完成确认。', meta: '力量到位率 100% · 联动确认完成', tags: ['编成完成', '路线已确认'], actions: ['查看编成表', '确认反馈'] },
  { id: 'z-4', groupId: 'z', sender: '作战助手', role: '智能协同成员', avatar: '智', time: '14:09', kind: 'text', isAssistant: true, content: '已更新现场安保进度。当前无人员排班冲突，东侧缓冲区恢复条件仍待属地负责人确认。' },

  { id: 'e-1', groupId: 'e', sender: '系统', role: '任务通知', avatar: '令', time: '13:06', kind: 'system', content: '会前重点场馆检查任务已下发，检查范围包括消防通道、弱电机房和临时搭建区域。' },
  { id: 'e-2', groupId: 'e', sender: '孙梅', role: '组长', avatar: '孙', time: '13:35', kind: 'text', content: '检查清单分为三组同步执行，发现隐患必须附现场照片、责任人和整改时限。' },
  { id: 'e-3', groupId: 'e', sender: '高伟', role: '检查员', avatar: '高', time: '14:21', kind: 'alert', title: '场馆检查异常反馈', content: '东区一处消防通道临时堆放物料，已通知场馆方立即清理；弱电机房一项登记记录待补齐。', meta: '2项待整改 · 已附现场照片3张', tags: ['消防通道', '整改中'], actions: ['查看照片', '发起复查'] },
  { id: 'e-4', groupId: 'e', sender: '作战助手', role: '智能协同成员', avatar: '智', time: '14:22', kind: 'task', isAssistant: true, title: '整改复查任务已建立', content: '已分别指定整改责任人，消防通道15:00前复查，弱电机房登记16:00前复核。', meta: '2项子任务 · 到期自动提醒', progress: 50, actions: ['查看任务', '通知责任人'], source: '来源：高伟14:21异常反馈' },

  { id: 'f-1', groupId: 'f', sender: '系统', role: '任务通知', avatar: '令', time: '13:06', kind: 'system', content: '重点群体动态监测任务已下发，按分级清单和触发条件持续回传。' },
  { id: 'f-2', groupId: 'f', sender: '周宁', role: '组长', avatar: '周', time: '13:42', kind: 'text', content: '第一轮分级清单已建立，属地联络员按既定要求反馈动态，重大变化直接报指挥中心。' },
  { id: 'f-3', groupId: 'f', sender: '作战助手', role: '智能协同成员', avatar: '智', time: '14:20', kind: 'feedback', isAssistant: true, title: '动态监测汇总', content: '当前各渠道反馈平稳，未触发升级条件；一项例行反馈将在30分钟后到期。', meta: '已反馈 7项 · 待反馈 1项', tags: ['态势平稳'], actions: ['查看清单', '提醒反馈'] },

  { id: 'g-1', groupId: 'g', sender: '系统', role: '任务通知', avatar: '令', time: '13:06', kind: 'system', content: '情况通报任务已下发，负责汇总六个作战组进展并形成日常、紧急两类通报。' },
  { id: 'g-2', groupId: 'g', sender: '林珊', role: '组长', avatar: '林', time: '13:18', kind: 'text', content: '请各组17:00前提交当日进展、异常和次日安排，重大事项随时报送。' },
  { id: 'g-3', groupId: 'g', sender: '作战助手', role: '智能协同成员', avatar: '智', time: '14:25', kind: 'report', isAssistant: true, title: '阶段情况通报草稿', content: '已汇集人员审核、现场安保、场馆检查三组最新反馈：人员审核总体正常，现场力量编成完成，场馆检查发现2项待整改事项。', meta: '已引用 7条任务反馈 · 3个作战组', tags: ['草稿', '待人工复核'], actions: ['打开通报', '继续汇总'], source: '来源：各组已确认反馈' },
]

export const assistantWatchItems: AssistantWatchItem[] = [
  { id: 'watch-x', groupId: 'x', tone: 'warning', title: '1项复核任务临近时限', detail: '接待批次资料补充复核将在16:30到期，目前等待会务组反馈。', action: '提醒负责人' },
  { id: 'watch-y', groupId: 'y', tone: 'info', title: '交通话题热度上升', detail: '相关讨论暂未形成集中负面传播，建议维持30分钟轮询。', action: '查看趋势' },
  { id: 'watch-z', groupId: 'z', tone: 'info', title: '边界切换条件待确认', detail: '东侧缓冲区09:30后的恢复条件尚待属地负责人反馈。', action: '发起确认' },
  { id: 'watch-e', groupId: 'e', tone: 'warning', title: '2项场馆隐患待销号', detail: '消防通道和弱电机房登记问题已进入整改计时。', action: '查看整改' },
  { id: 'watch-f', groupId: 'f', tone: 'success', title: '当前未触发升级条件', detail: '重点群体动态反馈平稳，继续按既定频次监测。', action: '查看清单' },
  { id: 'watch-g', groupId: 'g', tone: 'info', title: '3个作战组尚未提交日报', detail: '舆情监测、重点监测组仍在汇总，现场安保组需补充次日安排。', action: '一键催报' },
]

const groupFeedbackMaterials: Record<string, { title: string; type: string; read: boolean }> = {
  x: { title: '境外参会人员首轮审核表', type: '审核台账', read: true },
  y: { title: '舆情监测日报（第1期）', type: '监测日报', read: false },
  z: { title: '岗点值守反馈记录', type: '值守记录', read: false },
  e: { title: '隐患整改反馈清单', type: '整改台账', read: true },
  f: { title: '重点群体动态监测记录', type: '监测记录', read: false },
  g: { title: '每日情况通报（第1期）', type: '情况通报', read: true },
}

export const operationMaterials: OperationMaterial[] = operationGroups.flatMap((group) => [
  { id: `${group.id}-m1`, groupId: group.id, title: `${group.name}任务清单`, type: '任务附件', read: true, category: 'issued' as const },
  { id: `${group.id}-m2`, groupId: group.id, title: '最终安保方案相关条文', type: '正式文件', read: group.id !== 'y', category: 'issued' as const },
  { id: `${group.id}-m3`, groupId: group.id, title: groupFeedbackMaterials[group.id]!.title, type: groupFeedbackMaterials[group.id]!.type, read: groupFeedbackMaterials[group.id]!.read, category: 'feedback' as const },
])

export const supplementalOperationTasks: OperationTask[] = [
  { id: 'op-x-review', groupId: 'x', title: '接待批次资料补充复核', description: '核对两条补充行程材料并完成双人复核。', owner: '张磊', collaborators: ['会务组联络员'], deadline: '今日 16:30', deliverable: '复核记录', priority: 'urgent', status: 'doing', progress: 45, feedbackCount: 2, updatedAt: '14:19', sourceClauseIds: ['rev-102'] },
  { id: 'op-x-report', groupId: 'x', title: '形成境外人员审核结论', description: '汇总审核结果、异常事项和处置记录。', owner: '陈立', collaborators: ['李娜', '张磊'], deadline: '今日 18:30', deliverable: '审核结论报告', priority: 'important', status: 'pending', progress: 0, feedbackCount: 0, updatedAt: '13:09', sourceClauseIds: ['rev-201'] },
  { id: 'op-y-round', groupId: 'y', title: '执行重点话题轮询', description: '持续监测会议、场馆和交通关联话题。', owner: '周妍', collaborators: ['属地网安'], deadline: '持续任务', deliverable: '异常线索', priority: 'important', status: 'doing', progress: 54, feedbackCount: 3, updatedAt: '14:15', sourceClauseIds: ['rev-301'] },
  { id: 'op-z-switch', groupId: 'z', title: '确认东侧边界切换条件', description: '核对09:30后的缓冲区恢复条件、口令和责任人。', owner: '王凯', collaborators: ['交警支队'], deadline: '09月23日 16:00', deliverable: '现场确认记录', priority: 'important', status: 'review', progress: 90, feedbackCount: 2, updatedAt: '14:09', sourceClauseIds: ['rev-401'] },
  { id: 'op-e-fire', groupId: 'e', title: '消防通道隐患整改复查', description: '清理临时堆放物料并上传复查照片。', owner: '高伟', collaborators: ['场馆方'], deadline: '今日 15:00', deliverable: '整改照片与销号记录', priority: 'urgent', status: 'exception', progress: 50, feedbackCount: 2, updatedAt: '14:22', sourceClauseIds: ['rev-501'] },
  { id: 'op-e-room', groupId: 'e', title: '弱电机房登记复核', description: '补齐登记记录并由场馆负责人确认。', owner: '孙梅', collaborators: ['场馆方'], deadline: '今日 16:00', deliverable: '复核记录', priority: 'important', status: 'doing', progress: 60, feedbackCount: 1, updatedAt: '14:22', sourceClauseIds: ['rev-501'] },
  { id: 'op-f-round', groupId: 'f', title: '属地动态例行反馈', description: '按分级清单收集本轮动态并核对触发条件。', owner: '周宁', collaborators: ['属地分局'], deadline: '今日 15:00', deliverable: '动态反馈记录', priority: 'normal', status: 'review', progress: 88, feedbackCount: 7, updatedAt: '14:20', sourceClauseIds: [] },
  { id: 'op-g-daily', groupId: 'g', title: '汇总六组作战日报', description: '归集进展、异常和次日安排，形成情况通报草稿。', owner: '林珊', collaborators: ['各作战组联络员'], deadline: '今日 17:30', deliverable: '当日情况通报', priority: 'important', status: 'doing', progress: 60, feedbackCount: 7, updatedAt: '14:25', sourceClauseIds: ['rev-101'] },
]

export const simulatedUpdates: Record<string, ChatMessage[]> = {
  x: [
    { id: 'x-auto-1', groupId: 'x', sender: '会务组联络员', role: '协作成员', avatar: '会', time: '14:27', kind: 'text', content: '两条缺失行程材料已收到，正在核对版本，预计10分钟内回传。' },
    { id: 'x-auto-2', groupId: 'x', sender: '作战助手', role: '智能协同成员', avatar: '智', time: '14:28', kind: 'text', isAssistant: true, content: '已将协作反馈关联至复核任务，任务状态更新为“处理中”，下一检查节点为14:38。', tags: ['反馈已归集', '状态已更新'] },
  ],
  y: [{ id: 'y-auto-1', groupId: 'y', sender: '作战助手', role: '智能协同成员', avatar: '智', time: '14:29', kind: 'text', isAssistant: true, content: '最新轮询完成，交通话题增速已回落，未发现跨平台扩散。' }],
  z: [{ id: 'z-auto-1', groupId: 'z', sender: '东侧区域负责人', role: '区域负责人', avatar: '东', time: '14:29', kind: 'feedback', title: '缓冲区条件反馈', content: '边界切换现场条件已核对，恢复口令和责任人确认完毕。', meta: '现场确认 · 1份记录', tags: ['条件已确认'] }],
  e: [{ id: 'e-auto-1', groupId: 'e', sender: '场馆方联络员', role: '协作成员', avatar: '馆', time: '14:30', kind: 'text', content: '消防通道物料已开始清理，预计14:45完成并上传复查照片。' }],
  f: [{ id: 'f-auto-1', groupId: 'f', sender: '属地联络员', role: '协作成员', avatar: '属', time: '14:31', kind: 'feedback', title: '例行动态反馈', content: '本轮核查无异常变化，相关事项继续保持常态关注。', meta: '按时反馈 · 无异常', tags: ['已完成'] }],
  g: [{ id: 'g-auto-1', groupId: 'g', sender: '作战助手', role: '智能协同成员', avatar: '智', time: '14:31', kind: 'text', isAssistant: true, content: '已收到重点监测组例行动态反馈，情况通报草稿的“重点监测”部分已自动更新。', tags: ['草稿已更新'] }],
}
