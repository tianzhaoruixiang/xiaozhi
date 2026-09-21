<script setup lang="ts">
import { computed } from 'vue'
import type { AssistantState } from '../types/assistant'
import { getAvatarPreset, XIAOZHI_AVATAR_ID } from '../data/agentAvatars'

const props = withDefaults(
  defineProps<{
    state: AssistantState
    active: boolean
    /** 已唤醒，正在等指令 */
    awaitingCommand?: boolean
    /** 正在播报唤醒应答「我在」 */
    ackPlaying?: boolean
    /** 麦克风持续待命（未唤醒） */
    micReady?: boolean
    /** 正在识别语音 */
    recognizing?: boolean
    /** 正在收音（语音段） */
    capturing?: boolean
    /** 是否听到周边声音 */
    hearing?: boolean
    /** 0~1 声强，驱动呼吸幅度 */
    soundLevel?: number
  }>(),
  {
    soundLevel: 0,
  },
)

defineEmits<{
  toggle: []
}>()

const preset = computed(() => getAvatarPreset(XIAOZHI_AVATAR_ID))

const phase = computed(() => {
  if (props.ackPlaying) return 'speaking'
  if (props.awaitingCommand) return 'awaiting'
  if (props.recognizing) return 'recognizing'
  if (props.state === 'speaking') return 'speaking'
  if (props.state === 'thinking') return 'thinking'
  if (props.micReady) return 'standby'
  return props.state
})

const stateLabel = computed(() => {
  switch (phase.value) {
    case 'awaiting':
      return props.capturing || props.hearing || (props.soundLevel || 0) > 0.12
        ? '正在收听'
        : '请讲'
    case 'recognizing':
      return '识别中'
    case 'speaking':
      return '应答中'
    case 'thinking':
      return '推演中'
    case 'standby':
      return props.hearing ? '听到声音' : '可唤醒'
    case 'listening':
      return '聆听中'
    default:
      return '待机'
  }
})

const ringBg = computed(
  () =>
    `radial-gradient(circle at 30% 22%, ${preset.value.bg[0]}, ${preset.value.bg[1]})`,
)

/** 声强 → 呼吸缩放 / 光晕 / 频率（大声更快） */
const breathStyle = computed(() => {
  const lvl = Math.min(1, Math.max(0, props.soundLevel || 0))
  const awaiting = Boolean(props.awaitingCommand)
  const voiceIn =
    awaiting || props.capturing || props.hearing || lvl > 0.08

  let activeLvl = 0
  if (voiceIn) {
    activeLvl = Math.max(lvl, awaiting ? 0.28 : 0)
  }

  let scale = 1
  let halo = 0.45
  let glow = 0
  if (awaiting) {
    scale = 1.08 + activeLvl * 0.12
    halo = 0.72 + activeLvl * 0.28
    glow = 22 + activeLvl * 40
  } else if (voiceIn) {
    scale = 1 + activeLvl * 0.14
    halo = 0.52 + activeLvl * 0.48
    glow = 10 + activeLvl * 34
  }

  const period = voiceIn ? Math.max(0.42, 1.75 - activeLvl * 1.3) : 2.4
  return {
    '--breath-scale': String(scale),
    '--breath-halo': String(halo),
    '--breath-glow': `${glow}px`,
    '--breath-lvl': String(activeLvl),
    '--breath-period': `${period.toFixed(2)}s`,
  }
})

const voiceListening = computed(() => {
  return (
    Boolean(props.awaitingCommand) ||
    Boolean(props.capturing) ||
    Boolean(props.hearing) ||
    (props.soundLevel || 0) > 0.08
  )
})

const showEq = computed(() => {
  return (
    Boolean(props.awaitingCommand) ||
    Boolean(props.hearing) ||
    (props.soundLevel || 0) > 0.1
  )
})

const cueText = computed(() => {
  if (!props.awaitingCommand) return ''
  const active =
    props.capturing || props.hearing || (props.soundLevel || 0) > 0.12
  return active ? '正在收听中…' : '已唤醒，请说出指示'
})

</script>

<template>
  <button
    class="avatar"
    type="button"
    :data-phase="phase"
    :data-hearing="hearing ? '1' : '0'"
    :data-voice="voiceListening ? '1' : '0'"
    :data-state="state"
    :aria-pressed="active"
    :aria-label="`打开小智助手，当前${stateLabel}`"
    :style="breathStyle"
    @click="$emit('toggle')"
  >
    <span class="avatar-stack">
    <span class="field" aria-hidden="true">
      <span class="wave w1" />
      <span class="wave w2" />
      <span class="wave w3" />
      <span v-if="awaitingCommand" class="listen-ring lr1" />
      <span v-if="awaitingCommand" class="listen-ring lr2" />
    </span>

    <span class="rig" aria-hidden="true">
      <span class="halo" />
      <span class="ring r-outer" />
      <span class="ring r-mid" />
      <span
        class="portrait"
        :style="{ backgroundImage: ringBg }"
      >
        <img
          class="face"
          :src="preset.src"
          alt="小智"
          draggable="false"
        />
        <span v-if="awaitingCommand" class="listen-badge" aria-hidden="true">
          <i /><i /><i />
        </span>
      </span>
      <span v-if="showEq" class="eq" aria-hidden="true">
        <i /><i /><i /><i /><i />
      </span>
    </span>

    <span class="meta">
      <span class="name">小智</span>
      <span class="state">{{ stateLabel }}</span>
    </span>

    <span v-if="awaitingCommand" class="cue" role="status">
      {{ cueText }}
    </span>
    </span>
  </button>
</template>

<style scoped>
.avatar {
  --rig: 118px;
  --breath-scale: 1;
  --breath-halo: 0.45;
  --breath-glow: 0px;
  --breath-lvl: 0;
  --breath-period: 1.6s;
  appearance: none;
  -webkit-appearance: none;
  position: fixed;
  right: clamp(14px, 2.5vw, 28px);
  bottom: clamp(14px, 2.5vw, 28px);
  z-index: 40;
  width: 168px;
  height: auto;
  min-height: calc(var(--rig) + 56px);
  border: 0;
  background: transparent;
  cursor: pointer;
  display: block;
  padding: 0;
  color: var(--color-bg-deep);
  -webkit-tap-highlight-color: transparent;
  transition: z-index 0s;
  overflow: visible;
}

.avatar-stack {
  display: grid;
  justify-items: center;
  gap: 8px;
  width: 100%;
}

.avatar[data-phase='awaiting'] {
  --rig: 136px;
  z-index: 72;
  width: 196px;
  animation: listen-enter 480ms var(--ease-out) both;
}

.field {
  position: absolute;
  width: 170px;
  height: 170px;
  top: -18px;
  pointer-events: none;
}

.wave {
  position: absolute;
  inset: 18px;
  border-radius: 50%;
  border: 1px solid rgba(42, 155, 184, 0.28);
  opacity: 0;
}

.avatar[data-voice='1'] .wave,
.avatar[data-phase='speaking'] .wave {
  animation: ripple var(--breath-period) var(--ease-out) infinite;
}

.avatar[data-hearing='1'] .wave,
.avatar[data-voice='1'] .wave {
  border-color: rgba(94, 200, 232, 0.55);
  border-width: 2px;
}

.avatar[data-phase='awaiting'] .wave {
  border-color: rgba(232, 213, 163, 0.72);
  border-width: 2px;
  opacity: 1;
  animation: ripple var(--breath-period) var(--ease-out) infinite;
}

.listen-ring {
  position: absolute;
  inset: 4px;
  border-radius: 50%;
  border: 2px solid rgba(232, 213, 163, 0.55);
  opacity: 0;
  pointer-events: none;
  animation: listen-ping 1.6s var(--ease-out) infinite;
}

.lr2 {
  animation-delay: 0.8s;
  border-color: rgba(154, 220, 232, 0.5);
}

.w2 { animation-delay: 0.55s !important; }
.w3 { animation-delay: 1.1s !important; }

.rig {
  position: relative;
  width: var(--rig);
  height: var(--rig);
  display: grid;
  place-items: center;
  filter: drop-shadow(0 16px 26px rgba(8, 28, 44, 0.32));
  transform: scale(var(--breath-scale));
  transition: transform 90ms linear;
  will-change: transform;
}

.avatar:hover .rig {
  transform: scale(calc(var(--breath-scale) * 1.035)) translate3d(0, -5px, 0);
}

.avatar:active .rig {
  transform: scale(calc(var(--breath-scale) * 1.015)) translate3d(0, -2px, 0);
}

.avatar[data-phase='awaiting'] .rig {
  filter: drop-shadow(0 14px 36px rgba(196, 163, 90, 0.55));
}

.avatar[data-phase='awaiting'] .portrait {
  width: 104px;
  height: 104px;
  box-shadow:
    0 0 0 4px rgba(232, 213, 163, 0.92),
    0 0 calc(32px + var(--breath-lvl) * 40px) rgba(196, 163, 90, 0.7);
  animation: hear-breathe-gold var(--breath-period) ease-in-out infinite;
}

.listen-badge {
  position: absolute;
  right: 6px;
  bottom: 8px;
  z-index: 3;
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 14px;
  padding: 3px 6px;
  border-radius: 999px;
  background: rgba(12, 28, 20, 0.78);
  border: 1px solid rgba(232, 213, 163, 0.65);
}

.listen-badge i {
  display: block;
  width: 2px;
  height: 6px;
  border-radius: 1px;
  background: #f0e0b0;
  transform-origin: bottom center;
  animation: eq-bar var(--breath-period) ease-in-out infinite;
}

.listen-badge i:nth-child(2) {
  height: 11px;
  animation-delay: 0.12s;
}

.listen-badge i:nth-child(3) {
  height: 7px;
  animation-delay: 0.24s;
}

.cue {
  max-width: 12.5rem;
  margin-top: 4px;
  padding: 10px 14px;
  border-radius: 14px;
  font-size: 0.84rem;
  font-weight: 600;
  line-height: 1.35;
  letter-spacing: 0.04em;
  text-align: center;
  color: #0b2a36;
  background: linear-gradient(120deg, #f0e0b0, #9adce8);
  box-shadow:
    0 12px 32px rgba(196, 163, 90, 0.42),
    0 0 24px rgba(232, 213, 163, 0.35);
  animation:
    cue-pop 420ms var(--ease-out) both,
    cue-glow var(--breath-period) ease-in-out infinite;
}

.halo {
  position: absolute;
  inset: 6px;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(126, 215, 239, 0.45),
    transparent 68%
  );
  filter: blur(6px);
  opacity: var(--breath-halo);
  transform: scale(calc(0.92 + var(--breath-lvl) * 0.28));
  transition:
    opacity 90ms linear,
    transform 90ms linear;
}

.avatar[data-phase='awaiting'] .halo {
  background: radial-gradient(
    circle,
    rgba(232, 213, 163, 0.55),
    transparent 70%
  );
}

.avatar[data-voice='1'] .halo {
  box-shadow: 0 0 var(--breath-glow) rgba(94, 200, 232, 0.55);
  animation: halo-flash var(--breath-period) ease-in-out infinite;
}

.avatar[data-phase='awaiting'] .halo {
  animation: halo-flash-gold var(--breath-period) ease-in-out infinite;
}

.ring {
  position: absolute;
  border-radius: 50%;
  border: 1.5px solid transparent;
  pointer-events: none;
}

.r-outer {
  inset: 0;
  border-color: rgba(42, 155, 184, 0.28);
  border-top-color: rgba(232, 213, 163, 0.85);
  border-bottom-color: rgba(42, 155, 184, 0.12);
  animation: spin 10s linear infinite;
}

.r-mid {
  inset: 10px;
  border-color: rgba(42, 155, 184, 0.14);
  border-left-color: rgba(94, 200, 232, 0.75);
  border-right-color: rgba(196, 163, 90, 0.5);
  animation: spin-rev 7.5s linear infinite;
}

.avatar[data-voice='1'] .r-outer,
.avatar[data-voice='1'] .r-mid {
  border-width: 2px;
}

.avatar[data-voice='1'] .r-outer {
  animation-duration: calc(var(--breath-period) * 4);
}

.avatar[data-voice='1'] .r-mid {
  animation-duration: calc(var(--breath-period) * 3);
}

.portrait {
  position: relative;
  z-index: 1;
  width: 92px;
  height: 92px;
  border-radius: 50%;
  overflow: hidden;
  isolation: isolate;
  box-shadow:
    0 0 0 2px rgba(255, 255, 255, 0.82),
    0 8px 20px rgba(12, 40, 58, 0.28);
  transition: box-shadow 120ms linear;
}

.avatar[data-voice='1'] .portrait {
  box-shadow:
    0 0 0 2px rgba(126, 215, 239, 0.75),
    0 0 calc(16px + var(--breath-lvl) * 28px) rgba(42, 155, 184, 0.5);
  animation: hear-breathe var(--breath-period) ease-in-out infinite;
}

.face {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
  border-radius: 50%;
  transform: scale(1.04);
  user-select: none;
  pointer-events: none;
}

.eq {
  position: absolute;
  z-index: 2;
  bottom: 8px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: flex-end;
  gap: 3px;
  height: 16px;
  padding: 3px 7px;
  border-radius: 999px;
  background: rgba(6, 20, 31, 0.72);
  backdrop-filter: blur(6px);
}

.eq i {
  display: block;
  width: 3px;
  height: 6px;
  border-radius: 2px;
  background: #9adce8;
  transform-origin: bottom center;
  animation: eq-bar var(--breath-period) ease-in-out infinite;
}

.avatar[data-phase='awaiting'] .eq i {
  background: #e8d5a3;
}

.eq i:nth-child(2) { animation-delay: 0.1s; height: 10px; }
.eq i:nth-child(3) { animation-delay: 0.2s; height: 14px; }
.eq i:nth-child(4) { animation-delay: 0.15s; height: 9px; }
.eq i:nth-child(5) { animation-delay: 0.05s; height: 7px; }

.meta {
  display: grid;
  justify-items: center;
  gap: 2px;
  padding: 6px 12px 7px;
  border-radius: 16px;
  background:
    linear-gradient(135deg, rgba(12, 28, 42, 0.88), rgba(18, 48, 73, 0.82));
  border: 1px solid rgba(94, 200, 232, 0.28);
  box-shadow: 0 10px 24px rgba(8, 22, 36, 0.28);
  backdrop-filter: blur(10px);
  min-width: 76px;
  transition:
    border-color var(--dur-mid) var(--ease-soft),
    box-shadow var(--dur-mid) var(--ease-soft),
    background var(--dur-mid) var(--ease-soft);
}

.name {
  font-family: var(--font-display);
  font-size: 0.86rem;
  letter-spacing: 0.28em;
  text-indent: 0.28em;
  color: #eef7fc;
}

.state {
  font-size: 0.68rem;
  letter-spacing: 0.08em;
  color: rgba(232, 213, 163, 0.9);
}

.cue {
  max-width: 12.5rem;
  margin-top: 4px;
  padding: 10px 14px;
  border-radius: 14px;
  font-size: 0.84rem;
  font-weight: 600;
  line-height: 1.35;
  letter-spacing: 0.04em;
  text-align: center;
  color: #0b2a36;
  background: linear-gradient(120deg, #f0e0b0, #9adce8);
  box-shadow:
    0 12px 32px rgba(196, 163, 90, 0.42),
    0 0 24px rgba(232, 213, 163, 0.35);
  animation:
    cue-pop 420ms var(--ease-out) both,
    cue-glow var(--breath-period) ease-in-out infinite;
}

.avatar[data-phase='awaiting'] .meta {
  border-color: rgba(232, 213, 163, 0.85);
  background: linear-gradient(135deg, rgba(48, 36, 12, 0.94), rgba(18, 48, 73, 0.9));
  box-shadow: 0 0 28px rgba(196, 163, 90, 0.45);
  min-width: 88px;
}

.avatar[data-phase='awaiting'] .state {
  color: #f0e0b0;
  animation: status-blink var(--breath-period) ease-in-out infinite;
}

.avatar[data-phase='standby'][data-hearing='1'] .meta {
  border-color: rgba(94, 200, 232, 0.55);
}

.avatar[data-phase='standby'][data-hearing='1'] .state {
  color: #9adce8;
}

.avatar[data-phase='standby'] .meta {
  border-color: rgba(94, 200, 232, 0.35);
}

.avatar[data-phase='standby'] .state {
  color: #9adce8;
}

.avatar[data-phase='thinking'] .portrait {
  animation: soft-pulse 1.2s ease-in-out infinite;
}

.avatar[data-phase='speaking'] .portrait {
  box-shadow:
    0 0 0 2px rgba(126, 215, 239, 0.75),
    0 0 32px rgba(42, 155, 184, 0.5);
}

.avatar[data-phase='recognizing'] .portrait {
  box-shadow:
    0 0 0 2px rgba(94, 200, 232, 0.7),
    0 0 28px rgba(42, 155, 184, 0.4);
}

.avatar[aria-pressed='true'] .meta {
  border-color: rgba(232, 213, 163, 0.55);
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes spin-rev {
  to { transform: rotate(-360deg); }
}

@keyframes ripple {
  0% { transform: scale(0.78); opacity: 0.55; }
  100% { transform: scale(1.35); opacity: 0; }
}

@keyframes soft-pulse {
  0%, 100% { filter: brightness(1); }
  50% { filter: brightness(1.06); }
}

@keyframes hear-breathe {
  0%, 100% {
    filter: brightness(1);
    transform: scale(1);
  }
  50% {
    filter: brightness(1.12);
    transform: scale(1.045);
  }
}

@keyframes hear-breathe-gold {
  0%, 100% {
    filter: brightness(1);
    transform: scale(1);
    box-shadow:
      0 0 0 3px rgba(232, 213, 163, 0.7),
      0 0 22px rgba(196, 163, 90, 0.4);
  }
  50% {
    filter: brightness(1.16);
    transform: scale(1.05);
    box-shadow:
      0 0 0 3px rgba(255, 236, 180, 0.95),
      0 0 calc(36px + var(--breath-lvl) * 40px) rgba(232, 213, 163, 0.75);
  }
}

@keyframes halo-flash {
  0%, 100% { opacity: var(--breath-halo); filter: blur(6px); }
  50% {
    opacity: calc(var(--breath-halo) + 0.28);
    filter: blur(10px);
  }
}

@keyframes halo-flash-gold {
  0%, 100% { opacity: var(--breath-halo); filter: blur(6px); }
  50% {
    opacity: calc(var(--breath-halo) + 0.32);
    filter: blur(12px);
  }
}

@keyframes eq-bar {
  0%, 100% { transform: scaleY(0.45); opacity: 0.7; }
  50% { transform: scaleY(1); opacity: 1; }
}

@keyframes cue-pop {
  from { opacity: 0; transform: translate3d(0, 8px, 0); }
  to { opacity: 1; transform: translate3d(0, 0, 0); }
}

@keyframes cue-glow {
  0%, 100% {
    box-shadow:
      0 12px 32px rgba(196, 163, 90, 0.35),
      0 0 16px rgba(232, 213, 163, 0.25);
  }
  50% {
    box-shadow:
      0 12px 32px rgba(196, 163, 90, 0.55),
      0 0 32px rgba(255, 236, 180, 0.55);
  }
}

@keyframes listen-enter {
  from {
    opacity: 0.55;
    transform: scale(0.92) translate3d(0, 12px, 0);
  }
  to {
    opacity: 1;
    transform: scale(1) translate3d(0, 0, 0);
  }
}

@keyframes listen-ping {
  0% {
    transform: scale(0.72);
    opacity: 0.7;
  }
  100% {
    transform: scale(1.35);
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .wave,
  .ring,
  .halo,
  .portrait,
  .eq i,
  .state,
  .cue,
  .listen-ring,
  .listen-badge i,
  .rig {
    animation: none !important;
    transition: none !important;
  }
}
</style>
