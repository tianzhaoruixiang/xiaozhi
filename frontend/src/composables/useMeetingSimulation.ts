import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import {
  assistantTasks,
  initialActivities,
  initialSuggestion,
  initialTranscripts,
  participants,
  scriptLines,
} from '../mock/meeting'
import type { AssistantActivity, Suggestion, TranscriptEntry } from '../types/meeting'

const clock = () => new Date().toLocaleTimeString('zh-CN', { hour12: false })

export function useMeetingSimulation() {
  let activitySequence = 1000
  const isRunning = ref(true)
  const meetingSeconds = ref(32 * 60 + 18)
  const scriptIndex = ref(0)
  const charIndex = ref(0)
  const waitTicks = ref(0)
  const liveDraft = ref('')
  const transcripts = ref<TranscriptEntry[]>(structuredClone(initialTranscripts))
  const pendingSuggestion = ref<Suggestion | null>(structuredClone(initialSuggestion))
  const activities = ref<AssistantActivity[]>(structuredClone(initialActivities))
  const taskIndex = ref(0)
  const assistantReply = ref('已持续记录会议内容，当前有 1 条建议等待确认。')
  const planMinor = ref(3)
  const acceptedCount = ref(5)
  const pulse = ref([31, 42, 37, 56, 49, 68, 61, 73, 58, 79, 71, 83])
  const timers: number[] = []

  const currentLine = computed(() => scriptLines[scriptIndex.value])
  const activeSpeaker = computed(() => participants.find((item) => item.id === currentLine.value.speakerId) ?? participants[0])
  const currentTask = computed(() => assistantTasks[taskIndex.value])
  const planVersion = computed(() => `版本 1.${planMinor.value}`)
  const elapsed = computed(() => {
    const hours = Math.floor(meetingSeconds.value / 3600).toString().padStart(2, '0')
    const minutes = Math.floor((meetingSeconds.value % 3600) / 60).toString().padStart(2, '0')
    const seconds = (meetingSeconds.value % 60).toString().padStart(2, '0')
    return `${hours}:${minutes}:${seconds}`
  })

  const addActivity = (title: string, detail: string, type: AssistantActivity['type'] = 'success') => {
    activitySequence += 1
    activities.value.unshift({ id: activitySequence, time: clock().slice(0, 5), title, detail, type })
    activities.value = activities.value.slice(0, 6)
  }

  const finalizeLine = () => {
    const line = currentLine.value
    const time = clock()
    const entry: TranscriptEntry = {
      id: Date.now(),
      speakerId: line.speakerId,
      time,
      content: line.content,
      status: line.suggestion ? 'pending' : undefined,
      tags: line.suggestion?.tags,
    }
    transcripts.value.push(entry)
    if (transcripts.value.length > 30) {
      transcripts.value.splice(0, transcripts.value.length - 30)
    }
    addActivity(`提取${activeSpeaker.value.name}发言要点`, '已识别责任单位和执行要求')

    if (line.suggestion) {
      pendingSuggestion.value = {
        ...line.suggestion,
        id: Date.now() + 1,
        speakerId: line.speakerId,
        time,
      }
      addActivity('形成新的方案更新建议', `等待领导确认是否写入${line.suggestion.chapter}`, 'info')
    }

    scriptIndex.value = (scriptIndex.value + 1) % scriptLines.length
    charIndex.value = 0
    waitTicks.value = 0
    liveDraft.value = ''
  }

  const acceptSuggestion = (editedContent?: string) => {
    if (!pendingSuggestion.value) return
    const suggestion = pendingSuggestion.value
    if (editedContent?.trim()) suggestion.content = editedContent.trim()
    const matched = [...transcripts.value].reverse().find((item) => item.speakerId === suggestion.speakerId && item.status === 'pending')
    if (matched) matched.status = 'accepted'
    planMinor.value += 1
    acceptedCount.value += 1
    addActivity(`安保方案已更新至 ${planVersion.value}`, `已写入${suggestion.chapter}`)
    assistantReply.value = `建议已写入${suggestion.chapter}，方案版本更新为 ${planVersion.value}。`
    pendingSuggestion.value = null
    ElMessage.success('建议已由领导采纳并写入方案')
  }

  const deferSuggestion = () => {
    if (!pendingSuggestion.value) return
    addActivity('建议已加入待办', '将在会议结束前再次提醒', 'info')
    assistantReply.value = '已将该建议加入待确认队列。'
    pendingSuggestion.value = null
    ElMessage.info('已加入待确认队列')
  }

  const sendCommand = (command: string) => {
    const text = command.trim()
    if (!text) return
    assistantReply.value = text.includes('汇总')
      ? `目前已记录 ${transcripts.value.length} 条发言，采纳 ${acceptedCount.value} 条建议，重点集中在人员审核、现场安保部署和场馆应急。`
      : text.includes('变化')
        ? `当前方案为 ${planVersion.value}，本轮会议已补充联合指挥专席、境外人员审核节点前移和重点群体分级监测。`
        : '指令已收到，会议助手正在结合当前发言和方案内容进行处理。'
    addActivity('收到领导指令', text, 'running')
    taskIndex.value = (taskIndex.value + 1) % assistantTasks.length
  }

  const resetDemo = () => {
    isRunning.value = true
    meetingSeconds.value = 32 * 60 + 18
    scriptIndex.value = 0
    charIndex.value = 0
    waitTicks.value = 0
    liveDraft.value = ''
    transcripts.value = structuredClone(initialTranscripts)
    pendingSuggestion.value = structuredClone(initialSuggestion)
    activities.value = structuredClone(initialActivities)
    taskIndex.value = 0
    assistantReply.value = '已持续记录会议内容，当前有 1 条建议等待确认。'
    planMinor.value = 3
    acceptedCount.value = 5
    ElMessage.success('演示数据已重置')
  }

  onMounted(() => {
    timers.push(window.setInterval(() => {
      if (isRunning.value) meetingSeconds.value += 1
    }, 1000))

    timers.push(window.setInterval(() => {
      if (!isRunning.value) return
      const text = currentLine.value.content
      if (charIndex.value < text.length) {
        const amount = Math.random() > 0.68 ? 2 : 1
        charIndex.value = Math.min(charIndex.value + amount, text.length)
        liveDraft.value = text.slice(0, charIndex.value)
      } else if (waitTicks.value < 24) {
        waitTicks.value += 1
      } else {
        finalizeLine()
      }
    }, 58))

    timers.push(window.setInterval(() => {
      if (!isRunning.value) return
      taskIndex.value = (taskIndex.value + 1) % assistantTasks.length
    }, 3200))

    timers.push(window.setInterval(() => {
      if (!isRunning.value) return
      const next = Math.round(35 + Math.random() * 55)
      pulse.value = [...pulse.value.slice(1), next]
    }, 680))
  })

  onBeforeUnmount(() => timers.forEach((timer) => window.clearInterval(timer)))

  return {
    participants,
    isRunning,
    elapsed,
    transcripts,
    activeSpeaker,
    liveDraft,
    currentTask,
    activities,
    pendingSuggestion,
    assistantReply,
    planVersion,
    acceptedCount,
    pulse,
    acceptSuggestion,
    deferSuggestion,
    sendCommand,
    resetDemo,
  }
}
