import { computed, onBeforeUnmount, ref } from 'vue'
import type { DistributionGroup, DistributionMaterial, DistributionTask } from '../types/distribution'
import type { ChatMessage, OperationGroup, OperationTask } from '../types/operations'
import {
  assistantWatchItems,
  operationGroups,
  operationMaterials,
  operationMessages,
  simulatedUpdates,
  supplementalOperationTasks,
} from '../mock/operations'
import { distributionGroups, distributionMaterials, distributionTasks } from '../mock/distribution'

const taskState: Record<string, { status: OperationTask['status']; progress: number; feedbackCount: number; updatedAt: string }> = {
  'task-x-01': { status: 'doing', progress: 68, feedbackCount: 5, updatedAt: '14:19' },
  'task-y-01': { status: 'doing', progress: 54, feedbackCount: 3, updatedAt: '14:15' },
  'task-z-01': { status: 'doing', progress: 70, feedbackCount: 2, updatedAt: '14:09' },
  'task-z-02': { status: 'done', progress: 100, feedbackCount: 2, updatedAt: '14:08' },
  'task-e-01': { status: 'doing', progress: 81, feedbackCount: 6, updatedAt: '14:22' },
  'task-f-01': { status: 'doing', progress: 46, feedbackCount: 7, updatedAt: '14:20' },
  'task-g-01': { status: 'doing', progress: 60, feedbackCount: 4, updatedAt: '14:25' },
  'task-g-02': { status: 'pending', progress: 0, feedbackCount: 0, updatedAt: '13:06' },
}

export function useGroupOperations() {
  const planVersion = ref('1.4')
  const signoffRecordId = ref('')
  const groups = ref<OperationGroup[]>(operationGroups.map((group) => ({ ...group })))
  const tasks = ref<OperationTask[]>([])
  const messages = ref<ChatMessage[]>(operationMessages.map((message) => ({ ...message, tags: message.tags ? [...message.tags] : undefined, actions: message.actions ? [...message.actions] : undefined })))
  const materials = ref(operationMaterials.map((item) => ({ ...item })))
  const activeGroupId = ref('x')
  const selectedTaskId = ref('task-x-01')
  const composerText = ref('')
  const simulationStarted = ref(false)
  let simulationTimer: number | undefined
  let updateIndex = 0

  const activeGroup = computed(() => groups.value.find((group) => group.id === activeGroupId.value) ?? groups.value[0])
  const activeMessages = computed(() => messages.value.filter((message) => message.groupId === activeGroupId.value))
  const activeTasks = computed(() => tasks.value.filter((task) => task.groupId === activeGroupId.value))
  const activeMaterials = computed(() => materials.value.filter((item) => item.groupId === activeGroupId.value))
  const selectedTask = computed(() => activeTasks.value.find((task) => task.id === selectedTaskId.value) ?? activeTasks.value[0])
  const watchItem = computed(() => assistantWatchItems.find((item) => item.groupId === activeGroupId.value))
  const overallProgress = computed(() => Math.round(groups.value.reduce((sum, group) => sum + group.progress, 0) / Math.max(groups.value.length, 1)))
  const activeSummary = computed(() => ({
    completed: activeTasks.value.filter((task) => task.status === 'done').length,
    progressing: activeTasks.value.filter((task) => task.status === 'doing' || task.status === 'review').length,
    exceptions: activeTasks.value.filter((task) => task.status === 'exception').length,
    feedbacks: activeTasks.value.reduce((sum, task) => sum + task.feedbackCount, 0),
  }))

  const now = () => new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })
  const makeId = (prefix: string) => `${prefix}-${Date.now()}-${Math.round(Math.random() * 1000)}`

  const startSimulation = () => {
    if (simulationStarted.value) return
    simulationStarted.value = true
    const queue = [
      ...simulatedUpdates.x,
      ...simulatedUpdates.e,
      ...simulatedUpdates.g,
      ...simulatedUpdates.z,
      ...simulatedUpdates.y,
      ...simulatedUpdates.f,
    ]
    simulationTimer = window.setInterval(() => {
      const update = queue[updateIndex]
      if (!update) {
        if (simulationTimer) window.clearInterval(simulationTimer)
        return
      }
      messages.value.push({ ...update, id: makeId(update.groupId), time: now() })
      const group = groups.value.find((item) => item.id === update.groupId)
      if (group && update.groupId !== activeGroupId.value) group.unread += 1
      updateIndex += 1
    }, 5600)
  }

  const prepare = (version: string, recordId: string, sourceGroups: DistributionGroup[], sourceTasks: DistributionTask[], sourceMaterials: DistributionMaterial[]) => {
    planVersion.value = version
    signoffRecordId.value = recordId
    groups.value = sourceGroups.map((group) => ({
      ...group,
      ...(operationGroups.find((item) => item.id === group.id) ?? { progress: 0, unread: 0, onlineCount: 0, alertCount: 0, statusText: '任务执行中' }),
    }))
    const uniqueSourceTasks = Array.from(new Map(sourceTasks.map((task) => [task.id, task])).values())
    const baseTasks = uniqueSourceTasks.map((task): OperationTask => ({
      ...task,
      ...(taskState[task.id] ?? { status: 'pending' as const, progress: 0, feedbackCount: 0, updatedAt: '13:06' }),
      collaborators: [...task.collaborators],
      sourceClauseIds: [...task.sourceClauseIds],
    }))
    const baseTaskIds = new Set(baseTasks.map((task) => task.id))
    const supplementalTasks = supplementalOperationTasks
      .filter((task) => !baseTaskIds.has(task.id))
      .map((task) => ({ ...task, collaborators: [...task.collaborators], sourceClauseIds: [...task.sourceClauseIds] }))
    tasks.value = [...baseTasks, ...supplementalTasks]
    materials.value = operationMaterials.map((item) => {
      const source = sourceMaterials.find((material) => material.title.includes('方案') || material.title.includes('任务'))
      return { ...item, read: source?.status === 'read' ? true : item.read }
    })
    activeGroupId.value = 'x'
    selectedTaskId.value = 'task-x-01'
    const xGroup = groups.value.find((group) => group.id === 'x')
    if (xGroup) xGroup.unread = 0
    startSimulation()
  }

  const ensurePrepared = () => {
    if (tasks.value.length) {
      startSimulation()
      return
    }
    prepare('1.4', 'AQ-20260920-014', distributionGroups, distributionTasks, distributionMaterials)
  }

  const selectGroup = (groupId: string) => {
    activeGroupId.value = groupId
    const group = groups.value.find((item) => item.id === groupId)
    if (group) group.unread = 0
    selectedTaskId.value = tasks.value.find((task) => task.groupId === groupId)?.id ?? ''
  }

  const sendMessage = (content = composerText.value) => {
    const trimmed = content.trim()
    if (!trimmed) return false
    messages.value.push({
      id: makeId('message'), groupId: activeGroupId.value, sender: '指挥员', role: '联合指挥中心', avatar: '指',
      time: now(), kind: 'text', content: trimmed,
    })
    composerText.value = ''
    window.setTimeout(() => {
      messages.value.push({
        id: makeId('assistant'), groupId: activeGroupId.value, sender: '作战助手', role: '智能协同成员', avatar: '智',
        time: now(), kind: 'text', isAssistant: true,
        content: trimmed.includes('日报')
          ? '已收到。正在汇总本组任务进度、成员反馈和异常处置记录，可直接点击“生成日报”查看草稿。'
          : '指令已记录。我已关联当前作战组任务台账，并将持续跟踪后续反馈。',
        tags: ['指令已识别', '已关联任务'],
      })
    }, 650)
    return true
  }

  const createTask = () => {
    const group = activeGroup.value
    if (!group) return
    const newTask: OperationTask = {
      id: makeId('task'), groupId: group.id, title: group.id === 'x' ? '补充材料联合复核' : `${group.responsibility}补充核验`,
      description: '根据最新群内反馈补充建立，由组长确认后执行。', owner: group.lead,
      collaborators: ['相关任务成员'], deadline: '今日 17:00', deliverable: '复核反馈记录', priority: 'important',
      status: 'pending', progress: 0, feedbackCount: 0, updatedAt: now(), sourceClauseIds: [],
    }
    tasks.value.unshift(newTask)
    selectedTaskId.value = newTask.id
    messages.value.push({
      id: makeId('task-card'), groupId: group.id, sender: '作战助手', role: '智能协同成员', avatar: '智', time: now(),
      kind: 'task', isAssistant: true, taskId: newTask.id, title: newTask.title,
      content: '已根据当前反馈生成补充任务草案，请确认负责人和完成时限后下发。', meta: `${newTask.owner} · ${newTask.deadline}`,
      progress: 0, tags: ['待确认'], actions: ['确认下发', '调整任务'], source: '来源：当前群聊反馈',
    })
  }

  const submitFeedback = () => {
    const task = selectedTask.value
    if (!task) return
    task.feedbackCount += 1
    task.progress = Math.min(100, Math.max(task.progress, 72) + 8)
    task.status = task.progress >= 100 ? 'review' : 'doing'
    task.updatedAt = now()
    messages.value.push({
      id: makeId('feedback'), groupId: activeGroupId.value, sender: '指挥员', role: '联合指挥中心', avatar: '指', time: now(),
      kind: 'feedback', taskId: task.id, title: `${task.title}补充反馈`, content: '已核对当前执行进展，关键节点按计划推进，补充材料已上传群文件。',
      meta: `任务进度 ${task.progress}% · 反馈记录 ${task.feedbackCount}条`, tags: ['已回传'], actions: ['查看附件', '确认反馈'],
    })
  }

  const generateDailyReport = () => {
    const group = activeGroup.value
    if (!group) return
    const summary = activeSummary.value
    messages.value.push({
      id: makeId('report'), groupId: group.id, sender: '作战助手', role: '智能协同成员', avatar: '智', time: now(), kind: 'report', isAssistant: true,
      title: `${group.name}作战日报草稿`,
      content: `已汇总本组${activeTasks.value.length}项任务：完成${summary.completed}项、执行中${summary.progressing}项、异常${summary.exceptions}项；共归集${summary.feedbacks}条有效反馈。建议将未闭环事项列入下一时段重点。`,
      meta: `自动引用 ${activeMessages.value.filter((message) => message.kind === 'feedback' || message.kind === 'alert').length} 条群内反馈`,
      tags: ['草稿', '待组长确认'], actions: ['打开日报', '发送至情况通报组'], source: `来源：${group.name}任务台账与群聊反馈`,
    })
  }

  const handleCardAction = (message: ChatMessage, action: string) => {
    if (action.includes('创建') || action.includes('确认下发')) createTask()
    else if (action.includes('发送至情况通报组')) {
      messages.value.push({ id: makeId('sent'), groupId: activeGroupId.value, sender: '系统', role: '协同通知', avatar: '令', time: now(), kind: 'system', content: `${message.title ?? '本组日报'}已发送至情况通报组素材池，并保留来源记录。` })
      const gGroup = groups.value.find((group) => group.id === 'g')
      if (gGroup && activeGroupId.value !== 'g') gGroup.unread += 1
    } else {
      messages.value.push({ id: makeId('action'), groupId: activeGroupId.value, sender: '系统', role: '操作记录', avatar: '令', time: now(), kind: 'system', content: `已执行“${action}”，处理结果已写入本组作战记录。` })
    }
  }

  const remind = () => {
    const item = watchItem.value
    if (!item) return
    messages.value.push({ id: makeId('remind'), groupId: activeGroupId.value, sender: '作战助手', role: '智能协同成员', avatar: '智', time: now(), kind: 'text', isAssistant: true, content: `已执行“${item.action}”，通知已发送给对应负责人，等待新的任务反馈。`, tags: ['提醒已发送'] })
  }

  onBeforeUnmount(() => { if (simulationTimer) window.clearInterval(simulationTimer) })

  return {
    planVersion, signoffRecordId, groups, tasks, messages, materials, activeGroupId, selectedTaskId, composerText,
    activeGroup, activeMessages, activeTasks, activeMaterials, selectedTask, watchItem, overallProgress, activeSummary,
    prepare, ensurePrepared, selectGroup, sendMessage, createTask, submitFeedback, generateDailyReport, handleCardAction, remind,
  }
}
