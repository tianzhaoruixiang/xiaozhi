<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { mockPlans, mockTodos, mockFocusWork, mockReminders } from '../data/mockPlans'
import type { PlanItem } from '../data/mockPlans'
import { useAssistantChat } from '../composables/useAssistantChat'
import { useAgentCatalog } from '../composables/useAgentCatalog'
import { useVoiceSession } from '../composables/useVoiceSession'
import { useSpeechReport } from '../composables/useSpeechReport'
import WorkbenchHeader from '../components/WorkbenchHeader.vue'
import WorkbenchBoards from '../components/WorkbenchBoards.vue'
import type { WorkbenchPanel } from '../components/WorkbenchBoards.vue'
import AssistantAvatar from '../components/AssistantAvatar.vue'
import AssistantPanel from '../components/AssistantPanel.vue'

const plans = mockPlans

/** 主屏只展示最要紧的几条，完整计划仍交给小智上下文 */
const DESK_LIMIT = 6
const deskSeed = [
  mockFocusWork[0],
  mockTodos[0],
  mockReminders[0],
  mockTodos[1],
].filter(Boolean) as PlanItem[]

const deskRank = (item: PlanItem) => {
  let score = 0
  if (item.category === 'focus') score += 4
  if (item.status === 'doing') score += 2
  if (item.priority === 'high') score += 2
  else if (item.priority === 'medium') score += 1
  return score
}

const seenIds = new Set(deskSeed.map((item) => item.id))
const deskExtras = [...mockFocusWork, ...mockTodos, ...mockReminders]
  .filter((item) => !seenIds.has(item.id))
  .sort((a, b) => deskRank(b) - deskRank(a))

const deskHighlights = [...deskSeed, ...deskExtras].slice(0, DESK_LIMIT)

const boardPanels: WorkbenchPanel[] = [
  {
    title: '今日安排',
    subtitle: '',
    variant: 'todo',
    items: deskHighlights.map((item) => ({ ...item, kind: item.category })),
  },
]
const draft = ref('')
const {
  open,
  state,
  messages,
  streaming,
  error,
  pendingConfirm,
  setOpen,
  toggle,
  send,
  confirmDispatch,
} = useAssistantChat()

const {
  catalog,
  selectedTeam,
  selectedWorkflow,
  selectedMode,
  onTeamChange,
} = useAgentCatalog()

const {
  speaking: reportSpeaking,
  speak,
  stop: stopReport,
  supported: ttsSupported,
  error: ttsError,
  engine: ttsEngine,
} = useSpeechReport()

const lastSpokenId = ref<string | null>(null)
const lastSpokenConfirmId = ref<string | null>(null)

const orchestration = () => ({
  team: selectedTeam.value || undefined,
  workflow: selectedWorkflow.value || undefined,
  mode: selectedMode.value,
})

/**
 * 语音链路：待机（说「你好小智」才醒）→ 播报「我在，请讲」→ 听领导这一整段话
 * → 停嘴自动上报并进入推演 → 播报完成后默认继续聆听下一条。
 */
const {
  supported: voiceSupported,
  listening: voiceListening,
  awake: voiceAwake,
  ackPlaying: voiceAckPlaying,
  hearing: voiceHearing,
  capturing: voiceCapturing,
  recognizing: voiceRecognizing,
  soundLevel: voiceSoundLevel,
  error: voiceError,
  mode: voiceMode,
  pause: pauseListen,
  listenForReply,
  start: startListen,
} = useVoiceSession({
  onWakeDetected: () => {
    pauseListen()
    stopReport()
    state.value = 'listening'
  },
  onCommandStart: () => {
    state.value = 'thinking'
    setOpen(true)
  },
  onCommand: (text) => {
    draft.value = text
    void send(text, plans, orchestration())
  },
})

const beginFollowupListen = (timeoutMs?: number) => {
  state.value = 'listening'
  listenForReply(timeoutMs)
}

const replayReport = (text: string) => {
  pauseListen()
  stopReport()
  void speak(text).then(() => beginFollowupListen())
}

const onAvatarToggle = () => {
  toggle()
  void startListen()
}

/** 底部聆听条：声强越大，呼吸闪光越快 */
const listenBreathStyle = computed(() => {
  const lvl = Math.min(1, Math.max(0, voiceSoundLevel.value || 0))
  const active = Math.max(lvl, 0.14)
  const period = Math.max(0.4, 1.85 - active * 1.4)
  return {
    '--voice-lvl': String(active),
    '--voice-period': `${period.toFixed(2)}s`,
  }
})

const avatarState = computed(() => {
  if (voiceAckPlaying.value || reportSpeaking.value) return 'speaking'
  if (voiceAwake.value) return 'listening'
  if (pendingConfirm.value?.confirm.status === 'pending') return 'listening'
  if (streaming.value) return state.value === 'speaking' ? 'speaking' : 'thinking'
  return state.value === 'listening' ? 'idle' : state.value
})

watch(
  () => {
    const latest = [...messages.value]
      .reverse()
      .find((m) => m.role === 'assistant' && m.oralReport)
    return latest
      ? { id: latest.id, oral: latest.oralReport as string }
      : null
  },
  async (curr) => {
    if (!curr?.oral || curr.id === lastSpokenId.value) return
    lastSpokenId.value = curr.id
    pauseListen()
    stopReport()
    state.value = 'speaking'
    setOpen(true)
    await speak(curr.oral)
    if (lastSpokenId.value === curr.id) {
      if (streaming.value) state.value = 'thinking'
      else beginFollowupListen()
    }
  },
)

watch(
  () => {
    const latest = [...messages.value]
      .reverse()
      .find((m) => m.role === 'assistant' && m.dispatchConfirm?.status === 'pending' && m.dispatchConfirm.oral)
    return latest?.dispatchConfirm
      ? { id: latest.dispatchConfirm.id, oral: latest.dispatchConfirm.oral as string }
      : null
  },
  async (curr) => {
    if (!curr?.oral || curr.id === lastSpokenConfirmId.value) return
    lastSpokenConfirmId.value = curr.id
    pauseListen()
    stopReport()
    state.value = 'speaking'
    setOpen(true)
    await speak(curr.oral)
    if (lastSpokenConfirmId.value === curr.id) beginFollowupListen(45000)
  },
)

watch(streaming, (isStreaming) => {
  if (pendingConfirm.value?.confirm.status === 'pending') return
  if (isStreaming) pauseListen()
  else if (!reportSpeaking.value) beginFollowupListen()
})

watch(reportSpeaking, (speaking) => {
  if (speaking) pauseListen()
  else if (pendingConfirm.value?.confirm.status === 'pending') beginFollowupListen(45000)
  else if (!streaming.value) beginFollowupListen()
})

const onSubmit = (text: string) => {
  draft.value = ''
  setOpen(true)
  if (pendingConfirm.value?.confirm.status === 'pending') {
    void send(text, plans, orchestration())
    return
  }
  pauseListen()
  stopReport()
  state.value = 'thinking'
  void send(text, plans, orchestration())
}

const onModeChange = (mode: string) => {
  if (mode === 'hybrid' || mode === 'config' || mode === 'dynamic') {
    selectedMode.value = mode
  }
}
</script>

<template>
  <div class="workbench xiaozhi-scope">
    <div class="atmosphere" aria-hidden="true">
      <div class="mesh" />
      <div class="orb orb-a" />
      <div class="orb orb-b" />
      <div class="grain" />
    </div>

    <div class="shell">
      <WorkbenchHeader
        compact
        brand="厅长工作台"
        tagline="今日须过目的几件事"
      >
        <template #actions>
          <RouterLink class="desk-link" to="/personal">个人工作台</RouterLink>
        </template>
      </WorkbenchHeader>
      <WorkbenchBoards fill brief :panels="boardPanels" :columns="1" label="今日工作台" />
    </div>

    <AssistantPanel
      chat-only
      :open="open"
      :messages="messages"
      :streaming="streaming"
      :error="error || voiceError || ttsError"
      :draft="draft"
      :voice-supported="voiceSupported"
      :voice-listening="voiceListening"
      :voice-awaiting="voiceAwake"
      :voice-ack-playing="voiceAckPlaying"
      :voice-capturing="voiceCapturing"
      :voice-recognizing="voiceRecognizing"
      :voice-mode="voiceMode"
      :sound-level="voiceSoundLevel"
      :hearing="voiceHearing"
      :report-speaking="reportSpeaking"
      :tts-supported="ttsSupported"
      :tts-engine="ttsEngine"
      :teams="catalog?.teams"
      :workflows="catalog?.workflows"
      :selected-team="selectedTeam"
      :selected-workflow="selectedWorkflow"
      :selected-mode="selectedMode"
      @close="setOpen(false)"
      @update:draft="draft = $event"
      @submit="onSubmit"
      @replay-report="replayReport"
      @confirm-dispatch="(approved: boolean) => { void confirmDispatch(approved) }"
      @update:team="onTeamChange"
      @update:workflow="selectedWorkflow = $event"
      @update:mode="onModeChange"
    />

    <AssistantAvatar
      :state="avatarState"
      :active="open"
      :awaiting-command="voiceAwake && !voiceAckPlaying"
      :ack-playing="voiceAckPlaying"
      :mic-ready="voiceSupported && voiceListening"
      :recognizing="voiceRecognizing"
      :capturing="voiceCapturing"
      :hearing="voiceHearing"
      :sound-level="voiceSoundLevel"
      @toggle="onAvatarToggle"
    />

    <div
      v-if="voiceAwake || voiceAckPlaying"
      class="listen-banner"
      :style="listenBreathStyle"
      role="status"
      aria-live="assertive"
    >
      <span class="pulse" aria-hidden="true" />
      <template v-if="voiceAckPlaying">
        <strong>我在</strong>
        <span>请讲，说完停一下我就开始办</span>
      </template>
      <template v-else>
        <strong>{{ voiceCapturing ? '正在聆听…' : '小智已唤醒' }}</strong>
        <span>{{ voiceCapturing ? '请继续说出您的指示' : '请直接说出您的指示，停顿后自动发送' }}</span>
      </template>
    </div>
  </div>
</template>

<style scoped>
.workbench {
  position: relative;
  height: 100dvh;
  min-height: 100dvh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background:
    radial-gradient(1200px 620px at 6% -10%, rgba(46, 196, 214, 0.2), transparent 58%),
    radial-gradient(920px 540px at 96% 0%, rgba(201, 168, 108, 0.14), transparent 50%),
    radial-gradient(780px 420px at 48% 110%, rgba(26, 122, 146, 0.14), transparent 55%),
    linear-gradient(168deg, #c5d8e6 0%, #e7f0f6 42%, #eef4f8 78%, #e9eef3 100%);
}

.atmosphere {
  pointer-events: none;
  position: absolute;
  inset: 0;
  z-index: 0;
}

.mesh {
  position: absolute;
  inset: -8%;
  background:
    radial-gradient(ellipse at 18% 8%, rgba(46, 196, 214, 0.12), transparent 52%),
    radial-gradient(ellipse at 88% 12%, rgba(201, 168, 108, 0.1), transparent 48%);
  filter: blur(12px);
}

.orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(52px);
  opacity: 0.55;
}

.orb-a {
  width: 280px;
  height: 280px;
  top: 4%;
  left: -6%;
  background: radial-gradient(circle, rgba(46, 196, 214, 0.28), transparent 70%);
}

.orb-b {
  width: 220px;
  height: 220px;
  top: 8%;
  right: -4%;
  background: radial-gradient(circle, rgba(201, 168, 108, 0.22), transparent 70%);
}

.grain {
  position: absolute;
  inset: 0;
  opacity: 0.025;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  mix-blend-mode: multiply;
}

.shell {
  position: relative;
  z-index: 1;
  flex: 1;
  min-height: 0;
  width: 100%;
  max-width: 760px;
  margin: 0 auto;
  padding: 22px clamp(20px, 4vw, 40px) 28px;
  display: flex;
  flex-direction: column;
}

.listen-banner {
  --voice-lvl: 0.14;
  --voice-period: 1.4s;
  position: fixed;
  left: 50%;
  bottom: clamp(28px, 5vw, 48px);
  z-index: 70;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 10px 14px;
  max-width: min(92vw, 420px);
  padding: 14px 20px;
  border-radius: 999px;
  background:
    linear-gradient(120deg, rgba(12, 28, 42, 0.94), rgba(28, 52, 40, 0.92));
  border: 1px solid rgba(232, 213, 163, 0.55);
  box-shadow:
    0 16px 40px rgba(6, 20, 31, 0.35),
    0 0 calc(20px + var(--voice-lvl) * 36px) rgba(196, 163, 90, 0.35);
  color: #eef7fc;
  animation:
    banner-in 420ms var(--ease-out) both,
    banner-breath var(--voice-period) ease-in-out infinite;
}

.listen-banner .pulse {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #e8d5a3;
  box-shadow: 0 0 calc(8px + var(--voice-lvl) * 16px) rgba(232, 213, 163, 0.9);
  animation: voice-pulse-flash var(--voice-period) ease-in-out infinite;
  flex-shrink: 0;
}

.listen-banner strong {
  font-family: var(--font-display);
  font-size: 0.95rem;
  letter-spacing: 0.06em;
  color: #f0e0b0;
  white-space: nowrap;
}

.listen-banner span {
  font-size: 0.86rem;
  color: rgba(237, 244, 248, 0.78);
}

@keyframes banner-in {
  from { opacity: 0; transform: translate(-50%, 12px); }
  to { opacity: 1; transform: translate(-50%, 0); }
}

@keyframes banner-breath {
  0%, 100% {
    box-shadow:
      0 16px 40px rgba(6, 20, 31, 0.35),
      0 0 calc(16px + var(--voice-lvl) * 20px) rgba(196, 163, 90, 0.28);
  }
  50% {
    box-shadow:
      0 16px 40px rgba(6, 20, 31, 0.35),
      0 0 calc(36px + var(--voice-lvl) * 48px) rgba(232, 213, 163, 0.55);
  }
}

@keyframes voice-pulse-flash {
  0%, 100% {
    transform: scale(1);
    opacity: 0.8;
  }
  50% {
    transform: scale(1.45);
    opacity: 1;
  }
}
</style>
