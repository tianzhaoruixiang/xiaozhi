import { computed, onBeforeUnmount, ref } from 'vue'
import type { Participant } from '../types/meeting'
import type { ConfirmationActivity, ParticipantConfirmation } from '../types/confirmation'

const assistantTasks = [
  { title: '正在归并会议决议', detail: '将已采纳意见写入最终方案，并保留决策依据。' },
  { title: '正在拆解工作部署', detail: '按作战组生成负责人、时限、协作单位与交付物。' },
  { title: '正在进行一致性检查', detail: '核对方案条款、任务清单和下发材料是否完整一致。' },
  { title: '等待全员最终确认', detail: '确认完成后将自动下发方案、纪要和任务清单。' },
]

export function useMeetingConfirmation() {
  const version = ref('1.4')
  const records = ref<ParticipantConfirmation[]>([])
  const activities = ref<ConfirmationActivity[]>([])
  const activeTaskIndex = ref(0)
  const prepared = ref(false)
  const dispatching = ref(false)
  const dispatched = ref(false)

  const confirmedCount = computed(() => records.value.filter((record) => record.status === 'confirmed').length)
  const pendingCount = computed(() => records.value.filter((record) => record.status === 'pending').length)
  const totalCount = computed(() => records.value.length)
  const progress = computed(() => totalCount.value ? Math.round((confirmedCount.value / totalCount.value) * 100) : 0)
  const allConfirmed = computed(() => totalCount.value > 0 && pendingCount.value === 0)
  const currentTask = computed(() => {
    if (dispatched.value) return { title: '方案与任务已下发', detail: '下发记录已经生成，会议闭环完成。' }
    if (dispatching.value) return { title: '正在自动下发', detail: '正在发送最终方案、会议纪要和各组任务清单。' }
    if (prepared.value) return assistantTasks[Math.max(activeTaskIndex.value, 3)]!
    return assistantTasks[activeTaskIndex.value]!
  })

  const taskTimer = window.setInterval(() => {
    if (!prepared.value && !dispatching.value && !dispatched.value) {
      activeTaskIndex.value = (activeTaskIndex.value + 1) % 3
    }
  }, 2500)

  onBeforeUnmount(() => window.clearInterval(taskTimer))

  const now = () => new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })

  const addActivity = (title: string, detail: string, type: ConfirmationActivity['type'] = 'success') => {
    activities.value.unshift({ id: Date.now() + Math.random(), time: now(), title, detail, type })
    activities.value = activities.value.slice(0, 6)
  }

  const prepare = (planVersion: string, participants: Participant[], decisionCount: number, taskCount: number) => {
    version.value = planVersion
    const confirmedAt = now()
    records.value = participants
      .filter((participant) => participant.signedIn)
      .map((participant) => ({
        participantId: participant.id,
        status: participant.isMe ? 'pending' as const : 'confirmed' as const,
        confirmedAt: participant.isMe ? undefined : confirmedAt,
      }))
    prepared.value = true
    dispatching.value = false
    dispatched.value = false
    activeTaskIndex.value = 3
    activities.value = [
      { id: 3, time: now(), title: '等待主持人确认', detail: `其他 ${Math.max(0, records.value.length - 1)} 位参会人员已确认，主持人确认后即可下发`, type: 'running' },
      { id: 2, time: now(), title: '完成任务拆解与校验', detail: `${taskCount} 项任务均已补全负责人、时限和交付物`, type: 'success' },
      { id: 1, time: now(), title: '完成会议决议归并', detail: `${decisionCount} 项会议决议已写入方案 ${planVersion}`, type: 'success' },
    ]
  }

  const statusOf = (participantId: string) => records.value.find((record) => record.participantId === participantId)?.status ?? 'pending'

  const confirmParticipant = (participantId: string) => {
    const record = records.value.find((item) => item.participantId === participantId)
    if (!record || record.status === 'confirmed' || dispatching.value || dispatched.value) return false
    record.status = 'confirmed'
    record.confirmedAt = now()
    addActivity('收到参会人员确认', `确认进度 ${confirmedCount.value}/${totalCount.value}`)
    return true
  }

  const confirmAll = () => {
    const pending = records.value.filter((record) => record.status === 'pending')
    const confirmedAt = now()
    pending.forEach((record) => {
      record.status = 'confirmed'
      record.confirmedAt = confirmedAt
    })
    if (pending.length) addActivity('全员确认完成', `${pending.length} 位待确认人员的回执已同步`, 'success')
    return pending.length
  }

  const startDispatch = () => {
    if (!allConfirmed.value || dispatching.value || dispatched.value) return false
    dispatching.value = true
    addActivity('触发自动下发', '全员确认完成，正在生成下发记录并发送相关材料', 'running')
    return true
  }

  const markDispatched = () => {
    dispatching.value = false
    dispatched.value = true
    addActivity('下发完成', '方案、纪要和任务清单已发送至各作战组', 'success')
  }

  return {
    version,
    records,
    activities,
    prepared,
    dispatching,
    dispatched,
    confirmedCount,
    pendingCount,
    totalCount,
    progress,
    allConfirmed,
    currentTask,
    prepare,
    statusOf,
    confirmParticipant,
    confirmAll,
    startDispatch,
    markDispatched,
  }
}
