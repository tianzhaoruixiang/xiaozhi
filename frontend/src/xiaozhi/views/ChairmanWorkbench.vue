<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { mockPlans, mockTodos, mockFocusWork, mockReminders } from '../data/mockPlans'
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
const boardPanels: WorkbenchPanel[] = [
  {
    title: '待办事项',
    subtitle: '按时间推进办理',
    variant: 'todo',
    items: mockTodos,
  },
  {
    title: '重点工作',
    subtitle: '阶段主线任务',
    variant: 'focus',
    items: mockFocusWork,
  },
  {
    title: '重要事项提醒',
    subtitle: '临期与必办提示',
    variant: 'reminder',
    items: mockReminders,
    warn: true,
  },
]
const draft = ref('')
const {
  open,
  state,
  messages,
  streaming,
  error,
  setOpen,
  toggle,
  send,
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

const orchestration = () => ({
  team: selectedTeam.value || undefined,
  workflow: selectedWorkflow.value || undefined,
  mode: selectedMode.value,
})

/**
 * 语音链路：待机（说「你好小智」才醒）→ 播报「我在，请讲」→ 听领导这一整段话
 * → 停嘴自动上报并进入推演。
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
  resume: resumeListen,
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
  // 唤醒收听优先，避免应答/汇报播报盖掉收听态
  if (voiceAwake.value && !voiceAckPlaying.value) return 'listening'
  if (reportSpeaking.value) return 'speaking'
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
      state.value = streaming.value ? 'thinking' : 'idle'
      if (!streaming.value) resumeListen()
    }
  },
)

watch(streaming, (isStreaming) => {
  if (isStreaming) pauseListen()
  else if (!reportSpeaking.value) resumeListen()
})

watch(reportSpeaking, (speaking) => {
  if (speaking) pauseListen()
  else if (!streaming.value) resumeListen()
})

const onSubmit = (text: string) => {
  draft.value = ''
  pauseListen()
  stopReport()
  state.value = 'thinking'
  setOpen(true)
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
      <div class="orb orb-c" />
      <div class="grid-layer" />
      <div class="grain" />
      <div class="vignette" />
      <div class="horizon" />
    </div>

    <div class="shell">
      <WorkbenchHeader>
        <template #actions>
          <RouterLink class="desk-link" to="/personal">个人工作台</RouterLink>
        </template>
      </WorkbenchHeader>
      <WorkbenchBoards :panels="boardPanels" label="今日工作台" />
    </div>

    <AssistantPanel
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
      @replay-report="(text: string) => { pauseListen(); stopReport(); void speak(text).then(() => resumeListen()) }"
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
  min-height: 100%;
  overflow: visible;
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
  inset: -10%;
  background:
    conic-gradient(from 210deg at 30% 20%, rgba(46, 196, 214, 0.08), transparent 40%),
    conic-gradient(from 40deg at 78% 18%, rgba(201, 168, 108, 0.07), transparent 35%);
  filter: blur(8px);
  opacity: 0.9;
}

.orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(44px);
  animation: float-orb 16s ease-in-out infinite;
  opacity: 0.75;
}

.orb-a {
  width: 340px;
  height: 340px;
  top: 6%;
  left: -5%;
  background: radial-gradient(circle, rgba(46, 196, 214, 0.38), transparent 70%);
}

.orb-b {
  width: 280px;
  height: 280px;
  top: 10%;
  right: -3%;
  background: radial-gradient(circle, rgba(201, 168, 108, 0.3), transparent 70%);
  animation-duration: 19s;
  animation-delay: -5s;
}

.orb-c {
  width: 400px;
  height: 240px;
  bottom: 4%;
  left: 26%;
  background: radial-gradient(circle, rgba(26, 122, 146, 0.2), transparent 70%);
  animation-duration: 22s;
  animation-delay: -9s;
}

.grid-layer {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(20, 40, 58, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(20, 40, 58, 0.04) 1px, transparent 1px);
  background-size: 56px 56px;
  mask-image: radial-gradient(ellipse 78% 68% at 50% 26%, black, transparent 78%);
  animation: grid-drift 32s linear infinite;
  opacity: 0.8;
}

.grain {
  position: absolute;
  inset: 0;
  opacity: 0.035;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  mix-blend-mode: multiply;
}

.vignette {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at center, transparent 40%, rgba(6, 20, 31, 0.16) 100%);
}

.horizon {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 42%;
  background:
    linear-gradient(180deg, transparent, rgba(6, 20, 31, 0.05) 45%, rgba(6, 20, 31, 0.1)),
    repeating-linear-gradient(
      90deg,
      transparent,
      transparent 96px,
      rgba(46, 196, 214, 0.035) 96px,
      rgba(46, 196, 214, 0.035) 97px
    );
  mask-image: linear-gradient(180deg, transparent, black 48%);
}

.shell {
  position: relative;
  z-index: 1;
  max-width: 1120px;
  margin: 0 auto;
  padding: clamp(28px, 5vw, 56px) clamp(20px, 4vw, 40px) 150px;
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
