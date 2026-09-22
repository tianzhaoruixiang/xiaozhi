import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import type { AssistantActivity, Participant, ScriptLine, Suggestion, TranscriptEntry } from '../types/meeting'
import {
  agendaPhases,
  assistantTasks,
  initialActivities,
  initialTranscripts,
  participants as seedParticipants,
} from '../mock/meeting'

const clock = () => new Date().toLocaleTimeString('zh-CN', { hour12: false })

export function useMeetingSimulation() {
  let activitySequence = 1000
  let entrySequence = 100
  const participants = reactive<Participant[]>(seedParticipants.map((p) => ({ ...p })))
  const isRunning = ref(false)
  const meetingSeconds = ref(0)
  // 议程推进：-1 未开始；0..agendaPhases.length-1 对应议程进行中；agendaPhases.length 全部完成
  const phaseIndex = ref(-1)
  const phaseLineIndex = ref(0)
  // 统稿确认/联合会签阶段的表态发言队列（优先于讨论议程）
  const stageSpeechQueue = ref<ScriptLine[]>([])
  const stageSpeechIndex = ref(0)
  const charIndex = ref(0)
  const waitTicks = ref(0)
  const liveDraft = ref('')
  const transcripts = ref<TranscriptEntry[]>(structuredClone(initialTranscripts))
  // 讨论阶段识别到的建议统一登记，全部推迟到统稿确认阶段处理
  const registeredSuggestions = ref<Suggestion[]>([])
  const activities = ref<AssistantActivity[]>(structuredClone(initialActivities))
  const taskIndex = ref(0)
  const assistantReply = ref('正在等待所有参会人员签到，签到完成后会议将自动开始。')
  const planMinor = ref(0)
  const pulse = ref([31, 42, 37, 56, 49, 68, 61, 73, 58, 79, 71, 83])
  const timers: number[] = []

  const me = computed(() => participants.find((p) => p.isMe))
  const signedCount = computed(() => participants.filter((p) => p.signedIn).length)
  const totalCount = computed(() => participants.length)
  const allSigned = computed(() => participants.every((p) => p.signedIn))
  const meetingDone = computed(() => phaseIndex.value >= agendaPhases.length)
  const currentLine = computed(() => {
    // 统稿/会签阶段表态优先
    if (stageSpeechQueue.value.length) {
      return stageSpeechQueue.value[stageSpeechIndex.value] ?? null
    }
    if (phaseIndex.value < 0 || phaseIndex.value >= agendaPhases.length) return null
    return agendaPhases[phaseIndex.value].lines[phaseLineIndex.value] ?? null
  })
  const activeSpeaker = computed(
    () => participants.find((item) => item.id === currentLine.value?.speakerId) ?? participants[0],
  )
  const currentTask = computed(() => assistantTasks[taskIndex.value])
  const planVersion = computed(() => `版本 1.${planMinor.value}`)
  const elapsed = computed(() => {
    const hours = Math.floor(meetingSeconds.value / 3600)
    const minutes = Math.floor((meetingSeconds.value % 3600) / 60)
    const seconds = meetingSeconds.value % 60
    return [hours, minutes, seconds].map((n) => String(n).padStart(2, '0')).join(':')
  })

  const addActivity = (title: string, detail: string, type: AssistantActivity['type'] = 'running') => {
    activities.value.unshift({ id: activitySequence += 1, time: clock(), title, detail, type })
    if (activities.value.length > 8) activities.value.pop()
  }

  const nextEntryId = () => {
    entrySequence += 1
    return entrySequence + Date.now()
  }

  /** 会议助手在记录流中发言 */
  const pushAssistant = (content: string) => {
    transcripts.value.push({ id: nextEntryId(), speakerId: 'assistant', time: clock(), content })
  }

  /** 进入统稿确认/联合会签：启动该阶段的表态发言队列 */
  const startStageSpeech = (queue: ScriptLine[]) => {
    stageSpeechQueue.value = queue
    stageSpeechIndex.value = 0
    charIndex.value = 0
    waitTicks.value = 0
    liveDraft.value = ''
  }

  /** 离开统稿/会签或阶段切换：停止表态发言 */
  const stopStageSpeech = () => {
    stageSpeechQueue.value = []
    stageSpeechIndex.value = 0
    liveDraft.value = ''
  }

  /** 进入指定议程阶段：助手播报议程切换，随后开始该阶段发言 */
  const enterPhase = (index: number) => {
    phaseIndex.value = index
    phaseLineIndex.value = 0
    charIndex.value = 0
    waitTicks.value = 0
    liveDraft.value = ''
    const target = agendaPhases[index]
    if (target) {
      pushAssistant(target.assistantIntro)
      addActivity(`进入议程：${target.label}`, '会议助手已播报议程切换', 'running')
    }
  }

  /** 用户点击签到——会议助手宣布开始，从第一项发言议程开始 */
  const signIn = () => {
    const self = me.value
    if (!self || self.signedIn) return
    self.signedIn = true
    ElMessage.success(`${self.name} 签到成功`)
    transcripts.value.push({
      id: nextEntryId(),
      speakerId: 'assistant',
      time: clock(),
      content: `${self.name}已完成签到，全体参会人员签到完毕。`,
    })
    assistantReply.value = '签到完成。会议正式开始，我将全程记录发言、实时提炼要点。'
    // 短暂反馈后立即启动会议，让演示节奏更紧凑
    window.setTimeout(() => {
      isRunning.value = true
      addActivity('会议开始', '全体参会人员签到完毕，开始通报前期筹备情况', 'success')
      assistantReply.value = '会议助手已就位，将全程记录发言、实时提炼要点并形成统稿建议。'
      enterPhase(0)
    }, 650)
  }

  /** 发言进行到一半时即识别并登记建议，不等待整段转写结束。 */
  const registerSuggestion = (line: ScriptLine, time = clock()) => {
    if (!line.suggestion) return false
    const key = `${line.speakerId}:${line.suggestion.chapter}`
    const already = registeredSuggestions.value.some((suggestion) => `${suggestion.speakerId}:${suggestion.chapter}` === key)
    if (already) return false

    registeredSuggestions.value.push({
      ...line.suggestion,
      id: nextEntryId(),
      speakerId: line.speakerId,
      time,
    })
    planMinor.value += 1
    addActivity('快速识别建议并同步方案', `方案版本更新为 ${planVersion.value}，正在修订${line.suggestion.chapter}`, 'info')
    assistantReply.value = `已在发言过程中识别“${line.suggestion.title}”，并同步标记到${line.suggestion.chapter}。`
    return true
  }

  /** 一条发言转写完成：登记建议并决定下一位发言人或推进议程 */
  const finalizeLine = () => {
    const line = currentLine.value
    if (!line) return
    const time = clock()
    transcripts.value.push({
      id: nextEntryId(),
      speakerId: line.speakerId,
      time,
      content: line.content,
      status: line.suggestion ? 'pending' : undefined,
      tags: line.suggestion?.tags,
    })
    if (transcripts.value.length > 40) transcripts.value.splice(0, transcripts.value.length - 40)
    addActivity(`提取${activeSpeaker.value.name}发言要点`, '已识别责任单位和执行要求')

    // 极短发言或恢复播放时兜底登记；已提前识别的建议会自动去重。
    registerSuggestion(line, time)

    // 统稿/会签表态队列：推进下一条或结束
    if (stageSpeechQueue.value.length) {
      if (stageSpeechIndex.value < stageSpeechQueue.value.length - 1) {
        stageSpeechIndex.value += 1
        charIndex.value = 0
        waitTicks.value = 0
        liveDraft.value = ''
      } else {
        stopStageSpeech()
      }
      return
    }

    // 阶段内还有下一位发言人 → 继续；否则推进到下一议程
    const phaseLines = agendaPhases[phaseIndex.value].lines
    if (phaseLineIndex.value < phaseLines.length - 1) {
      phaseLineIndex.value += 1
    } else {
      // “各部门补充意见”阶段循环播放各部门发言，等待领导手动进入统稿，不自动结束
      if (agendaPhases[phaseIndex.value].id === 'opinions') {
        phaseLineIndex.value = 0
        charIndex.value = 0
        waitTicks.value = 0
        liveDraft.value = ''
        return
      }
      const next = phaseIndex.value + 1
      if (next < agendaPhases.length) {
        enterPhase(next)
        return
      }
      // 全部议程完成
      phaseIndex.value = agendaPhases.length
      liveDraft.value = ''
      charIndex.value = 0
      waitTicks.value = 0
      pushAssistant(`全部议程已完成。会议期间共登记 ${registeredSuggestions.value.length} 条建议，请打开当前方案完成审阅和签章确认。`)
      assistantReply.value = '议程全部完成，请打开当前方案审阅方案、工作组和纪要，完成签章后可下发任务。'
      addActivity('全部议程完成', `已登记 ${registeredSuggestions.value.length} 条统稿建议`, 'success')
      return
    }
    charIndex.value = 0
    waitTicks.value = 0
    liveDraft.value = ''
  }

  const sendCommand = (command: string) => {
    const text = command.trim()
    if (!text) return
    assistantReply.value = text.includes('汇总')
        ? `目前已记录 ${transcripts.value.length} 条发言，登记 ${registeredSuggestions.value.length} 条方案建议，重点集中在人员审核、现场安保部署和场馆应急。`
      : text.includes('变化')
        ? `当前方案为 ${planVersion.value}，会议期间已随建议登记同步更新 ${planMinor.value} 次，签章确认后可下发。`
        : '指令已收到，会议助手正在结合当前发言和方案内容进行处理。'
    addActivity('收到领导指令', text, 'running')
    taskIndex.value = (taskIndex.value + 1) % assistantTasks.length
  }

  const resetDemo = () => {
    isRunning.value = false
    meetingSeconds.value = 0
    phaseIndex.value = -1
    phaseLineIndex.value = 0
    stageSpeechQueue.value = []
    stageSpeechIndex.value = 0
    charIndex.value = 0
    waitTicks.value = 0
    liveDraft.value = ''
    transcripts.value = structuredClone(initialTranscripts)
    registeredSuggestions.value = []
    activities.value = structuredClone(initialActivities)
    assistantReply.value = '正在等待所有参会人员签到，签到完成后会议将自动开始。'
    planMinor.value = 0
    taskIndex.value = 0
    participants.forEach((p) => { p.signedIn = !p.isMe })
  }

  onMounted(() => {
    // 会议计时：签到后开始
    timers.push(window.setInterval(() => {
      if (!isRunning.value) return
      meetingSeconds.value += 1
    }, 1000))
    // 发言逐字转写：加快到每字约 42ms，并在发言中段提前识别建议。
    timers.push(window.setInterval(() => {
      if (!isRunning.value) return
      const line = currentLine.value
      if (!line) return
      const text = line.content
      if (charIndex.value < text.length) {
        charIndex.value += 1
        liveDraft.value = text.slice(0, Math.min(charIndex.value, text.length))
        const recognitionPoint = Math.max(12, Math.ceil(text.length * 0.48))
        if (charIndex.value === recognitionPoint) registerSuggestion(line)
      } else if (waitTicks.value < 9) {
        waitTicks.value += 1
      } else {
        finalizeLine()
      }
    }, 42))
    // 助手负载曲线
    timers.push(window.setInterval(() => {
      if (!isRunning.value) return
      pulse.value = [...pulse.value.slice(1), 40 + Math.round(Math.random() * 45)]
    }, 1400))
  })

  onBeforeUnmount(() => {
    timers.forEach((timer) => window.clearInterval(timer))
  })

  return {
    participants,
    isRunning,
    me,
    allSigned,
    signedCount,
    totalCount,
    phase: computed(() => phaseIndex.value),
    meetingDone,
    meetingSeconds,
    elapsed,
    liveDraft,
    transcripts,
    registeredSuggestions,
    activeSpeaker,
    currentTask,
    activities,
    assistantReply,
    planVersion,
    pulse,
    signIn,
    sendCommand,
    startStageSpeech,
    stopStageSpeech,
    resetDemo,
  }
}
