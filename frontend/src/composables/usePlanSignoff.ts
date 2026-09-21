import { computed, onBeforeUnmount, ref } from 'vue'
import { signoffActivities, signoffAssistantTasks, signoffDepartments, signoffMaterials, signoffOpinions } from '../mock/signoff'
import type { RevisionChange } from '../types/revision'
import type { SignoffClause, SignoffStatus } from '../types/signoff'

export function usePlanSignoff() {
  const version = ref('1.4')
  const sourceChangeCount = ref(0)
  const clauses = ref<SignoffClause[]>([])
  const departments = ref(signoffDepartments.map((department) => ({ ...department })))
  const opinions = ref(signoffOpinions.map((opinion) => ({ ...opinion })))
  const activities = ref(signoffActivities.map((activity) => ({ ...activity })))
  const selectedDepartmentId = ref('traffic')
  const activeTaskIndex = ref(0)
  const completedAt = ref('')
  const recordId = ref('')
  const materials = ref(structuredClone(signoffMaterials))
  const selectedMaterialId = ref(signoffMaterials[0]?.id ?? '')

  const selectedDepartment = computed(() => departments.value.find((department) => department.id === selectedDepartmentId.value) ?? departments.value[0])
  const selectedOpinion = computed(() => opinions.value.find((opinion) => opinion.departmentId === selectedDepartmentId.value) ?? null)
  const signedCount = computed(() => departments.value.filter((department) => department.status === 'signed').length)
  const pendingCount = computed(() => departments.value.filter((department) => department.status === 'pending').length)
  const objectionCount = computed(() => departments.value.filter((department) => department.status === 'objection').length)
  const progress = computed(() => Math.round((signedCount.value / departments.value.length) * 100))
  const canComplete = computed(() => signedCount.value === departments.value.length && objectionCount.value === 0)
  const currentTask = computed(() => signoffAssistantTasks[activeTaskIndex.value] ?? signoffAssistantTasks[0]!)
  const selectedMaterial = computed(() => materials.value.find((material) => material.id === selectedMaterialId.value) ?? materials.value[0])

  const taskTimer = window.setInterval(() => {
    activeTaskIndex.value = (activeTaskIndex.value + 1) % signoffAssistantTasks.length
  }, 3600)

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

  const prepare = (planVersion: string, changes: RevisionChange[]) => {
    version.value = planVersion
    const resolvedChanges = changes.filter((change) => change.status === 'accepted')
    sourceChangeCount.value = resolvedChanges.length
    clauses.value = resolvedChanges.map((change) => ({
      id: change.id,
      section: change.section,
      title: change.title,
      finalText: change.revised,
      owner: change.owner,
      speaker: change.speaker,
      department: change.department,
      decisionTime: change.time,
      decision: 'accepted' as const,
    }))
    const finalPlan = materials.value.find((material) => material.id === 'final-plan')
    if (finalPlan) {
      finalPlan.meta = `版本 ${planVersion}`
      if (resolvedChanges.length > 0) {
        finalPlan.sections = [{
          title: '本版关键条文',
          items: resolvedChanges.map((change) => `${change.section} ${change.title}：${change.revised}`),
        }]
      }
    }
  }

  const selectMaterial = (materialId: string) => {
    if (materials.value.some((material) => material.id === materialId)) selectedMaterialId.value = materialId
  }

  const updateDepartmentStatus = (id: string, status: SignoffStatus) => {
    const department = departments.value.find((item) => item.id === id)
    if (!department) return
    department.status = status
  }

  const resolveOpinion = (opinionId: string) => {
    const opinion = opinions.value.find((item) => item.id === opinionId)
    if (!opinion) return
    opinion.status = 'resolved'
    updateDepartmentStatus(opinion.departmentId, 'pending')
    const clause = clauses.value.find((item) => item.id === opinion.clauseId)
    if (clause && !clause.finalText.includes('09:30')) {
      clause.finalText += ' 东侧弹性边界在 09:30 后或道路流量降至阈值以下时恢复至 150 米。'
    }
    addActivity('会签意见已闭环', `${opinion.section}已补充边界恢复条件，等待交警支队确认`)
  }

  const signDepartment = (departmentId: string) => {
    const department = departments.value.find((item) => item.id === departmentId)
    if (!department || department.status === 'objection') return false
    department.status = 'signed'
    department.signedAt = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })
    department.sealCode = `QS-${String(department.order).padStart(2, '0')}${Math.floor(10 + Math.random() * 89)}`
    addActivity(`${department.name}完成会签`, `${department.signer}已确认版本 ${version.value}，电子签章记录已保存`)
    return true
  }

  const sendReminder = (departmentId: string) => {
    const department = departments.value.find((item) => item.id === departmentId)
    if (!department || department.status === 'signed') return false
    addActivity('已发送会签提醒', `提醒已发送给${department.name} ${department.signer}`, 'info')
    return true
  }

  const completeAll = () => {
    const openOpinion = opinions.value.find((opinion) => opinion.status === 'open')
    if (openOpinion) resolveOpinion(openOpinion.id)
    departments.value.forEach((department) => {
      if (department.status !== 'signed') {
        department.status = 'signed'
        department.signedAt = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })
        department.sealCode = `QS-${String(department.order).padStart(2, '0')}${Math.floor(10 + Math.random() * 89)}`
      }
    })
    addActivity('全部单位完成会签', `6 个责任单位已确认版本 ${version.value}，可以生成定稿`)
  }

  const completeSignoff = () => {
    if (!canComplete.value) return false
    completedAt.value = new Date().toLocaleString('zh-CN', { hour12: false })
    recordId.value = 'AQ-20260920-014'
    return true
  }

  return {
    version,
    sourceChangeCount,
    clauses,
    departments,
    opinions,
    activities,
    selectedDepartmentId,
    selectedDepartment,
    selectedOpinion,
    currentTask,
    signedCount,
    pendingCount,
    objectionCount,
    progress,
    canComplete,
    completedAt,
    recordId,
    materials,
    selectedMaterialId,
    selectedMaterial,
    prepare,
    selectMaterial,
    resolveOpinion,
    signDepartment,
    sendReminder,
    completeAll,
    completeSignoff,
  }
}
