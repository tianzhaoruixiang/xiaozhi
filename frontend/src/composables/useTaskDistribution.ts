import { computed, onBeforeUnmount, ref } from 'vue'
import {
  distributionActivities,
  distributionAssistantTasks,
  distributionGroups,
  distributionMaterials,
  distributionTasks,
} from '../mock/distribution'
import type { DistributionTask } from '../types/distribution'
import type { SignoffClause } from '../types/signoff'

export function useTaskDistribution() {
  const planVersion = ref('1.4')
  const signoffRecordId = ref('')
  const sourceClauses = ref<SignoffClause[]>([])
  const groups = ref(distributionGroups.map((group) => ({ ...group })))
  const tasks = ref(distributionTasks.map((task) => ({ ...task, collaborators: [...task.collaborators], sourceClauseIds: [...task.sourceClauseIds] })))
  const materials = ref(distributionMaterials.map((material) => ({ ...material })))
  const activities = ref(distributionActivities.map((activity) => ({ ...activity })))
  const selectedGroupId = ref('z')
  const activeTaskIndex = ref(0)
  const dispatched = ref(false)

  const selectedGroup = computed(() => groups.value.find((group) => group.id === selectedGroupId.value) ?? groups.value[0])
  const visibleTasks = computed(() => tasks.value.filter((task) => task.groupId === selectedGroupId.value))
  const confirmedCount = computed(() => tasks.value.filter((task) => task.status === 'confirmed' || task.status === 'sent').length)
  const pendingCount = computed(() => tasks.value.filter((task) => task.status === 'pending').length)
  const sentCount = computed(() => tasks.value.filter((task) => task.status === 'sent').length)
  const canDispatch = computed(() => pendingCount.value === 0 && !dispatched.value)
  const progress = computed(() => Math.round((confirmedCount.value / tasks.value.length) * 100))
  const currentTask = computed(() => distributionAssistantTasks[activeTaskIndex.value] ?? distributionAssistantTasks[0]!)

  const taskTimer = window.setInterval(() => {
    activeTaskIndex.value = (activeTaskIndex.value + 1) % distributionAssistantTasks.length
  }, 3500)

  onBeforeUnmount(() => window.clearInterval(taskTimer))

  const addActivity = (title: string, detail: string, type: 'success' | 'running' | 'info' = 'success') => {
    activities.value.unshift({
      id: Date.now(),
      time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }),
      title,
      detail,
      type,
    })
    activities.value = activities.value.slice(0, 6)
  }

  const prepare = (version: string, recordId: string, clauses: SignoffClause[]) => {
    planVersion.value = version
    signoffRecordId.value = recordId
    sourceClauses.value = clauses.map((clause) => ({ ...clause }))
  }

  const groupTasks = (groupId: string) => tasks.value.filter((task) => task.groupId === groupId)
  const groupProgress = (groupId: string) => {
    const items = groupTasks(groupId)
    if (!items.length) return 0
    return Math.round((items.filter((task) => task.status !== 'pending').length / items.length) * 100)
  }
  const groupStatus = (groupId: string) => {
    const items = groupTasks(groupId)
    if (items.every((task) => task.status === 'sent')) return 'sent'
    if (items.every((task) => task.status !== 'pending')) return 'ready'
    return 'draft'
  }
  const taskSources = (task: DistributionTask) => sourceClauses.value.filter((clause) => task.sourceClauseIds.includes(clause.id))

  const confirmTask = (taskId: string) => {
    const task = tasks.value.find((item) => item.id === taskId)
    if (!task || task.status !== 'pending') return false
    task.status = 'confirmed'
    addActivity('任务内容已确认', `${task.title}已纳入${groups.value.find((group) => group.id === task.groupId)?.name ?? '作战组'}任务清单`)
    return true
  }

  const confirmGroup = (groupId: string) => {
    const targets = tasks.value.filter((task) => task.groupId === groupId && task.status === 'pending')
    targets.forEach((task) => { task.status = 'confirmed' })
    const group = groups.value.find((item) => item.id === groupId)
    if (targets.length) addActivity('作战组任务已确认', `${group?.name ?? '当前作战组'}的 ${targets.length} 项任务已完成核对`)
    return targets.length
  }

  const confirmAll = () => {
    const targets = tasks.value.filter((task) => task.status === 'pending')
    targets.forEach((task) => { task.status = 'confirmed' })
    if (targets.length) addActivity('全部任务完成核对', `${targets.length} 项任务已补全负责人、时限和交付物`)
    return targets.length
  }

  const dispatchAll = () => {
    if (!canDispatch.value) return false
    tasks.value.forEach((task) => { task.status = 'sent' })
    materials.value.forEach((material, index) => { material.status = index === 0 ? 'read' : 'sent' })
    dispatched.value = true
    addActivity('任务与材料已下发', '6 个工作组组长已收到任务清单和关联材料，执行成员由组长在组内组建')
    return true
  }

  return {
    planVersion,
    signoffRecordId,
    sourceClauses,
    groups,
    tasks,
    materials,
    activities,
    selectedGroupId,
    selectedGroup,
    visibleTasks,
    currentTask,
    confirmedCount,
    pendingCount,
    sentCount,
    canDispatch,
    progress,
    dispatched,
    prepare,
    groupTasks,
    groupProgress,
    groupStatus,
    taskSources,
    confirmTask,
    confirmGroup,
    confirmAll,
    dispatchAll,
  }
}
