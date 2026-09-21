import { computed, onBeforeUnmount, ref } from 'vue'
import {
  revisionActivities,
  revisionAssistantTasks,
  revisionChapters,
  revisionChanges,
  revisionSources,
} from '../mock/revision'
import type { RevisionChange, RevisionStatus, RevisionViewMode } from '../types/revision'

const clauseOwnerMap: Record<string, string> = {
  command: '情况通报组',
  review: '人员审核组',
  opinion: '舆情监测组',
  onsite: '现场安保组',
  venue: '场馆检查组',
  intelligence: '重点监测组',
}

export function usePlanRevision() {
  const chapters = ref(revisionChapters.map((chapter) => ({ ...chapter })))
  const changes = ref(revisionChanges.map((change) => ({ ...change, references: [...change.references] })))
  const activities = ref(revisionActivities.map((activity) => ({ ...activity })))
  const sources = ref(revisionSources.map((source) => ({ ...source })))
  const selectedChapterId = ref('onsite')
  const viewMode = ref<RevisionViewMode>('compare')
  const assistantReply = ref('已核对全部章节条文，可在下方输入修订指令，例如“调整4.2 安检通道高峰时段通行要求”。')
  const activeTaskIndex = ref(0)
  const sourceVersion = ref('1.3')
  const revisionVersion = ref('1.4')

  const selectedChapter = computed(() => chapters.value.find((chapter) => chapter.id === selectedChapterId.value) ?? chapters.value[0])
  const visibleChanges = computed(() => changes.value.filter((change) => change.chapterId === selectedChapterId.value))
  const pendingCount = computed(() => changes.value.filter((change) => change.status === 'pending').length)
  const acceptedCount = computed(() => changes.value.filter((change) => change.status === 'accepted').length)
  const keptCount = computed(() => changes.value.filter((change) => change.status === 'kept').length)
  const resolvedCount = computed(() => acceptedCount.value + keptCount.value)
  const progress = computed(() => Math.round((resolvedCount.value / changes.value.length) * 100))
  const canSubmit = computed(() => pendingCount.value === 0)
  const currentTask = computed(() => revisionAssistantTasks[activeTaskIndex.value])

  const taskTimer = window.setInterval(() => {
    activeTaskIndex.value = (activeTaskIndex.value + 1) % revisionAssistantTasks.length
  }, 3400)

  onBeforeUnmount(() => window.clearInterval(taskTimer))

  const addActivity = (title: string, detail: string, type: 'running' | 'success' | 'info' = 'success') => {
    activities.value.unshift({
      id: Date.now(),
      time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }),
      title,
      detail,
      type,
    })
    activities.value = activities.value.slice(0, 5)
  }

  const startConsolidation = (meetingPlanVersion: string) => {
    const normalized = meetingPlanVersion.replace('版本', '').trim()
    const [major = '1', minor = '3'] = normalized.split('.')
    sourceVersion.value = normalized
    revisionVersion.value = `${major}.${Number(minor) + 1}`
    addActivity('会议决议已转入统稿', `已承接方案 ${sourceVersion.value} 和会议采纳记录，目标版本为 ${revisionVersion.value}`, 'running')
  }

  const acceptChange = (id: string) => {
    const change = changes.value.find((item) => item.id === id)
    if (!change) return
    change.status = 'accepted'
    addActivity('决议表述已确认', `${change.section}“${change.title}”已写入会议定稿 ${revisionVersion.value}`)
  }

  const keepOriginal = (id: string) => {
    const change = changes.value.find((item) => item.id === id)
    if (!change) return
    change.status = 'kept'
    addActivity('决议本次不纳入', `${change.section}已记录会议裁决结果`, 'info')
  }

  const statusLabel: Record<RevisionStatus, string> = {
    pending: '待确认表述',
    accepted: '已写入统稿',
    kept: '本次不纳入',
  }

  const sendCommand = (command: string) => {
    const text = command.trim()
    if (!text) return

    const match = text.match(/(\d+(?:\.\d+)?)/)
    if (match) {
      const clauseNo = match[1]
      for (const chapter of chapters.value) {
        const clause = chapter.clauses.find((item) => item.no === clauseNo)
        if (!clause) continue
        const section = `${clause.no} ${clause.heading}`
        const existed = changes.value.find((change) => change.section === section)
        if (existed) {
          selectedChapterId.value = chapter.id
          viewMode.value = 'compare'
          assistantReply.value = `第 ${clause.no} 条“${clause.heading}”已有修订记录（${statusLabel[existed.status]}），已切换至对应章节，请在批注卡中处理。`
        } else {
          const change: RevisionChange = {
            id: `rev-cmd-${Date.now()}`,
            chapterId: chapter.id,
            section,
            title: `会话指令修订：${clause.heading}`,
            original: clause.text,
            revised: `${clause.text.replace(/。$/, '')}；结合会话指令补充：${text.replace(clauseNo, '').trim()}。`,
            reason: `来自会议现场补充指令：“${text}”，已定位至对应条文并登记为统稿补充事项。`,
            speaker: '王卫明',
            department: '市局指挥中心',
            time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }),
            references: ['会议现场补充指令', `安保方案版本 ${sourceVersion.value}`],
            owner: clauseOwnerMap[chapter.id] ?? '情况通报组',
            status: 'pending',
            risk: 'medium',
          }
          changes.value.unshift(change)
          selectedChapterId.value = chapter.id
          viewMode.value = 'compare'
          assistantReply.value = `已将现场补充指令登记为第 ${clause.no} 条“${clause.heading}”的统稿补充事项，请确认表述后写入定稿。`
        }
        addActivity('收到会话式修订指令', `第 ${clauseNo} 条：${text}`, 'running')
        return
      }
    }

    if (text.includes('汇总')) {
      assistantReply.value = `当前版本 ${revisionVersion.value}，共 ${changes.value.length} 项修订：已写入 ${acceptedCount.value} 项、待确认 ${pendingCount.value} 项，处理进度 ${progress.value}%。`
    } else if (text.includes('冲突')) {
      assistantReply.value = '已完成冲突与缺项检查：全部条文与引用依据核对一致，未发现规则冲突和责任缺项。'
    } else {
      assistantReply.value = '指令已收到，会议助手正在结合会议决议、条文内容和支撑依据进行处理。'
    }
    addActivity('收到会话式修订指令', text, 'running')
  }

  return {
    chapters,
    changes,
    activities,
    sources,
    selectedChapterId,
    selectedChapter,
    visibleChanges,
    viewMode,
    assistantReply,
    sourceVersion,
    currentTask,
    revisionVersion,
    pendingCount,
    acceptedCount,
    keptCount,
    resolvedCount,
    progress,
    canSubmit,
    startConsolidation,
    acceptChange,
    keepOriginal,
    sendCommand,
  }
}
