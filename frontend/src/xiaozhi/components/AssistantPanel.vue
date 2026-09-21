<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import type { ChatMessage } from '../types/assistant'
import AgentCollabTimeline from './AgentCollabTimeline.vue'
import MarkdownView from './MarkdownView.vue'
import DispatchConfirmCard from './DispatchConfirmCard.vue'
import XiaozhiWorkingHint from './XiaozhiWorkingHint.vue'

const props = withDefaults(
  defineProps<{
    open: boolean
    messages: ChatMessage[]
    streaming: boolean
    error: string | null
    draft: string
    voiceSupported: boolean
    voiceListening: boolean
    voiceAwaiting?: boolean
    /** 正在播报唤醒应答「我在，请讲」 */
    voiceAckPlaying?: boolean
    voiceCapturing?: boolean
    voiceRecognizing?: boolean
    voiceMode?: 'local-asr' | 'browser-cloud' | 'unavailable'
    /** 0~1 声强，驱动聆听呼吸闪光 */
    soundLevel?: number
    hearing?: boolean
    reportSpeaking?: boolean
    ttsSupported?: boolean
    ttsEngine?: string
    teams?: Array<{ name: string; displayName: string; defaultWorkflow?: string }>
    workflows?: Array<{ name: string; displayName: string }>
    selectedTeam?: string
    selectedWorkflow?: string
    selectedMode?: string
    /** 厅长工作台：默认只保留对话，协作过程收入弹窗 */
    chatOnly?: boolean
  }>(),
  { chatOnly: false },
)

const emit = defineEmits<{
  close: []
  submit: [text: string]
  'update:draft': [value: string]
  'replay-report': [text: string]
  'confirm-dispatch': [approved: boolean]
  'update:team': [value: string]
  'update:workflow': [value: string]
  'update:mode': [value: string]
}>()

const shortcuts = ['今天重点事项', '准备下午人员调度会并通知相关部门']
const scroller = ref<HTMLElement | null>(null)
const collabOpen = ref(false)

const activeCollab = computed(() => {
  for (let i = props.messages.length - 1; i >= 0; i -= 1) {
    const msg = props.messages[i]
    if (msg.role === 'assistant' && (msg.steps?.length || msg.taskPlan)) {
      return {
        steps: msg.steps ?? [],
        taskPlan: msg.taskPlan ?? null,
      }
    }
  }
  return { steps: [], taskPlan: null }
})

const awaitingConfirm = computed(() =>
  props.messages.some((m) => m.dispatchConfirm?.status === 'pending'),
)
const composerLocked = computed(() => props.streaming && !awaitingConfirm.value)

const showCollab = computed(() => {
  const plan = activeCollab.value.taskPlan
  return (
    activeCollab.value.steps.length > 0 ||
    (plan && plan.phase !== 'idle')
  )
})

const collabPeekLabel = computed(() => {
  const phase = activeCollab.value.taskPlan?.phase
  if (phase === 'planning') return '正在安排'
  if (phase === 'awaiting_confirm') return '待您确认'
  if (phase === 'executing') return '正在办理'
  if (phase === 'done') return '办理过程'
  return '办理过程'
})

/** 协作台接受语音时：声强 → 呼吸周期（大声更快） */
const voiceBreathStyle = computed(() => {
  const lvl = Math.min(1, Math.max(0, props.soundLevel || 0))
  const listening = Boolean(props.voiceAwaiting || props.voiceCapturing)
  const active = listening ? Math.max(lvl, 0.14) : lvl
  const period = listening
    ? Math.max(0.4, 1.85 - active * 1.4)
    : 2
  return {
    '--voice-lvl': String(active),
    '--voice-period': `${period.toFixed(2)}s`,
    '--voice-glow': `${12 + active * 36}px`,
  }
})

const voiceActive = computed(
  () => Boolean(props.voiceAwaiting || props.voiceCapturing),
)

const onSubmit = () => {
  const text = props.draft.trim()
  if (!text) return
  emit('submit', text)
}

const useShortcut = (text: string) => {
  emit('update:draft', text)
  emit('submit', text)
}

const scrollToBottom = async () => {
  await nextTick()
  const el = scroller.value
  if (!el) return
  el.scrollTop = el.scrollHeight
}

watch(
  () => [props.messages, props.streaming, props.open],
  () => {
    if (props.open) void scrollToBottom()
  },
  { deep: true },
)

watch(
  () => props.open,
  (open) => {
    if (!open) collabOpen.value = false
  },
)
</script>

<template>
  <Teleport to="body">
    <div class="layer xiaozhi-scope" :class="{ open, 'collab-up': chatOnly && collabOpen }" aria-hidden="true">
      <button type="button" class="backdrop" :aria-label="chatOnly ? '关闭对话' : '关闭协作台'" @click="emit('close')" />

      <aside
        class="workspace"
        :class="{ open, 'voice-listen': voiceActive, 'chat-only': chatOnly }"
        :style="voiceBreathStyle"
        role="dialog"
        aria-modal="true"
        :aria-label="chatOnly ? '与小智对话' : '小智协作台'"
        aria-live="polite"
      >
        <div class="hud-frame" aria-hidden="true">
          <span class="c tl" /><span class="c tr" /><span class="c bl" /><span class="c br" />
          <span class="scan" />
          <span v-if="voiceActive" class="voice-breath" />
        </div>

        <header class="workspace-head">
          <div class="head-left">
            <p class="eyebrow">
              <span class="live-dot" :class="{ voice: voiceActive }" />
              {{ voiceActive ? '正在聆听' : chatOnly ? '对话' : '协作进行中' }}
            </p>
            <div class="head-title">
              <h2>{{ chatOnly ? '小智' : '小智协作台' }}</h2>
              <p class="status">
                <template v-if="reportSpeaking">
                  小智正在向您语音汇报
                  <span v-if="ttsEngine === 'local'" class="voice-tag">神经语音</span>
                  <span v-else-if="ttsEngine === 'browser'" class="voice-tag dim">系统音色</span>
                </template>
                <template v-else-if="streaming && activeCollab.taskPlan?.phase === 'planning'">
                  {{ chatOnly ? '正在为您安排…' : '正在设计本轮专家团队…' }}
                </template>
                <template v-else-if="streaming && activeCollab.taskPlan?.phase === 'awaiting_confirm'">
                  通知已拟好，请您确认是否发出
                </template>
                <template v-else-if="streaming && activeCollab.taskPlan?.phase === 'executing'">
                  <span class="working-inline" aria-hidden="true" />
                  {{ chatOnly ? '正在为您办理' : '专家正按调度执行任务' }}
                </template>
                <template v-else-if="streaming">{{ chatOnly ? '正在办理…' : '多智能体协作进行中' }}</template>
                <template v-else-if="voiceAckPlaying">
                  <span class="listen-live">小智应答「我在，请讲」…</span>
                  <span class="voice-tag">已唤醒</span>
                </template>
                <template v-else-if="voiceAwaiting">
                  <span class="listen-live">{{ voiceCapturing ? '正在聆听，停顿后自动发送…' : '已唤醒，请说出指示' }}</span>
                  <span class="voice-tag">聆听中</span>
                </template>
                <template v-else-if="voiceRecognizing">正在识别语音…</template>
                <template v-else-if="voiceListening && voiceSupported">
                  待命中，说「你好，小智」唤醒
                  <span v-if="voiceMode === 'local-asr'" class="voice-tag">本地唤醒</span>
                </template>
                <template v-else>
                  {{ chatOnly ? '说出需求即可，办完会向您汇报' : '说出需求后，小智会调度专家并完成汇报' }}
                </template>
              </p>
            </div>
          </div>

          <div class="head-right">
            <button
              v-if="chatOnly && showCollab"
              type="button"
              class="collab-peek"
              :class="{ live: streaming }"
              @click="collabOpen = true"
            >
              <span class="peek-dot" aria-hidden="true" />
              {{ collabPeekLabel }}
            </button>
            <div v-if="!chatOnly && teams?.length" class="orch-bar" aria-label="编排设置">
              <label>
                专家团
                <select
                  :value="selectedTeam"
                  :disabled="streaming"
                  @change="emit('update:team', ($event.target as HTMLSelectElement).value)"
                >
                  <option value="">智能识别</option>
                  <option v-for="t in teams" :key="t.name" :value="t.name">
                    {{ t.displayName }}
                  </option>
                </select>
              </label>
              <label>
                工作流
                <select
                  :value="selectedWorkflow"
                  :disabled="streaming"
                  @change="emit('update:workflow', ($event.target as HTMLSelectElement).value)"
                >
                  <option value="">智能识别</option>
                  <option v-for="w in workflows" :key="w.name" :value="w.name">
                    {{ w.displayName }}
                  </option>
                </select>
              </label>
              <label>
                模式
                <select
                  :value="selectedMode || 'hybrid'"
                  :disabled="streaming"
                  @change="emit('update:mode', ($event.target as HTMLSelectElement).value)"
                >
                  <option value="hybrid">混合</option>
                  <option value="config">仅配置</option>
                  <option value="dynamic">仅动态</option>
                </select>
              </label>
            </div>
            <button type="button" class="icon-btn" aria-label="关闭" @click="emit('close')">×</button>
          </div>
        </header>

        <div class="workspace-body">
          <section v-if="!chatOnly" class="collab-pane">
            <AgentCollabTimeline
              v-if="showCollab"
              :steps="activeCollab.steps"
              :task-plan="activeCollab.taskPlan"
            />
            <div v-else class="empty-collab">
              <strong>等待您的指示</strong>
              <p>直接说「你好，小智」唤醒，再口述需求；也可在下方输入。普通问询由小智直接作答，办会任务再调度专家团。</p>
            </div>
          </section>

          <section class="chat-pane">
            <div ref="scroller" class="messages hud-scroll">
              <article
                v-for="msg in messages"
                :key="msg.id"
                class="bubble"
                :data-role="msg.role"
              >
                <header v-if="msg.role !== 'system'" class="bubble-meta">
                  <span>{{ msg.role === 'user' ? '领导' : '小智' }}</span>
                </header>

                <MarkdownView
                  v-if="msg.content && msg.role === 'assistant'"
                  tone="light"
                  :source="msg.content"
                />
                <p v-else-if="msg.content" class="plain">{{ msg.content }}</p>
                <XiaozhiWorkingHint
                  v-else-if="msg.role === 'assistant' && streaming && msg.taskPlan?.phase === 'executing'"
                  tone="light"
                  :steps="msg.steps ?? []"
                  caption="正在办理中…"
                />
                <p v-else-if="msg.role === 'assistant' && streaming" class="plain muted">
                  <template v-if="msg.taskPlan?.phase === 'planning'">
                    {{ chatOnly ? '正在为您安排办理…' : '小智正在生成多智能体任务规划…' }}
                  </template>
                  <template v-else-if="msg.taskPlan?.phase === 'awaiting_confirm'">通知已拟好，请您确认是否发出…</template>
                  <template v-else>{{ chatOnly ? '正在办理…' : '正在启动协同流程…' }}</template>
                </p>

                <div v-if="msg.oralReport" class="oral-card" :class="{ live: reportSpeaking }">
                  <div class="oral-head">
                    <strong>口述汇报</strong>
                    <em v-if="reportSpeaking">播报中</em>
                    <button
                      v-else-if="ttsSupported"
                      type="button"
                      class="replay"
                      @click="emit('replay-report', msg.oralReport!)"
                    >
                      再播一次
                    </button>
                  </div>
                  <p>{{ msg.oralReport }}</p>
                </div>

                <DispatchConfirmCard
                  v-if="msg.dispatchConfirm"
                  tone="light"
                  :confirm="msg.dispatchConfirm"
                  @approve="emit('confirm-dispatch', true)"
                  @reject="emit('confirm-dispatch', false)"
                />
              </article>
            </div>

            <p v-if="error" class="error">{{ error }}</p>

            <div class="dock">
              <div class="shortcuts">
                <button
                  v-for="item in shortcuts"
                  :key="item"
                  type="button"
                  :disabled="composerLocked"
                  @click="useShortcut(item)"
                >
                  {{ item }}
                </button>
              </div>

              <form class="composer" @submit.prevent="onSubmit">
                <textarea
                  :value="draft"
                  rows="2"
                  :disabled="composerLocked"
                  :placeholder="
                    awaitingConfirm
                      ? '等候确认时，请说「确认发出」或「先不发」…'
                      : '说「你好，小智」唤醒后口述，或在此输入…'
                  "
                  @keydown.enter.exact.prevent="onSubmit"
                  @input="emit('update:draft', ($event.target as HTMLTextAreaElement).value)"
                />
                <button type="submit" :disabled="composerLocked || !draft.trim()">
                  发送
                </button>
              </form>
            </div>
          </section>
        </div>
      </aside>

      <div
        v-if="chatOnly && collabOpen"
        class="collab-layer"
        role="dialog"
        aria-modal="true"
        aria-label="办理过程"
      >
        <button type="button" class="collab-scrim" aria-label="关闭办理过程" @click="collabOpen = false" />
        <div class="collab-dialog">
          <header class="collab-dialog-head">
            <div>
              <p class="eyebrow">办理过程</p>
              <h3>小智正在协调各方</h3>
            </div>
            <button type="button" class="icon-btn" aria-label="关闭" @click="collabOpen = false">×</button>
          </header>
          <div class="collab-dialog-body">
            <AgentCollabTimeline
              v-if="showCollab"
              :steps="activeCollab.steps"
              :task-plan="activeCollab.taskPlan"
            />
            <div v-else class="empty-collab">
              <strong>暂无办理过程</strong>
              <p>发出指示后，如需多方协同，可在此查看进展。</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.layer {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100dvh;
  z-index: 50;
  pointer-events: none;
}

.layer.open {
  pointer-events: auto;
}

.layer.collab-up {
  z-index: 80;
}

.backdrop {
  position: absolute;
  inset: 0;
  border: 0;
  background: rgba(20, 40, 58, 0.22);
  opacity: 0;
  transition: opacity var(--dur-mid) var(--ease-soft);
  cursor: pointer;
}

.layer.open .backdrop {
  opacity: 1;
}

.workspace {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: auto minmax(0, 1fr);
  gap: 0;
  border-radius: 0;
  background:
    radial-gradient(900px 420px at 10% -10%, rgba(46, 196, 214, 0.16), transparent 55%),
    radial-gradient(700px 360px at 100% 0%, rgba(201, 168, 108, 0.12), transparent 50%),
    linear-gradient(165deg, #f7fbfd 0%, #eef4f8 52%, #e7f0f6 100%);
  color: var(--color-ink);
  border: 1px solid rgba(46, 196, 214, 0.28);
  box-shadow:
    0 28px 80px rgba(20, 40, 58, 0.16),
    0 0 36px rgba(46, 196, 214, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.88);
  opacity: 0;
  transform: translate3d(28px, 0, 0) scale(0.985);
  transition:
    opacity var(--dur-slow) var(--ease-out),
    transform var(--dur-slow) var(--ease-out);
  overflow: hidden;
  will-change: transform, opacity;
}

.workspace.open {
  opacity: 1;
  transform: translate3d(0, 0, 0) scale(1);
}

.workspace.chat-only {
  inset: 16px 16px 16px auto;
  width: min(440px, calc(100vw - 24px));
  height: auto;
  border-radius: 22px;
  transform: translate3d(24px, 0, 0) scale(0.985);
}

.workspace.chat-only.open {
  transform: translate3d(0, 0, 0) scale(1);
}

.workspace.chat-only .workspace-body {
  grid-template-columns: minmax(0, 1fr);
}

.workspace.chat-only .workspace-head {
  padding: 14px 14px 10px 16px;
  align-items: flex-start;
}

.workspace.chat-only .head-title {
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
}

.workspace.chat-only .chat-pane {
  padding: 12px 16px 16px;
}

.collab-peek {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid rgba(201, 168, 108, 0.45);
  background: rgba(201, 168, 108, 0.12);
  color: #7a5a22;
  font-size: 0.78rem;
  letter-spacing: 0.02em;
  cursor: pointer;
  white-space: nowrap;
  transition:
    background var(--dur-fast) var(--ease-soft),
    border-color var(--dur-fast) var(--ease-soft),
    transform var(--dur-fast) var(--ease-out);
}

.collab-peek:hover {
  background: rgba(201, 168, 108, 0.22);
  border-color: rgba(201, 168, 108, 0.7);
  transform: translate3d(0, -1px, 0);
}

.collab-peek.live {
  box-shadow: 0 0 16px rgba(201, 168, 108, 0.22);
}

.peek-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #c9a86c;
  box-shadow: 0 0 8px rgba(201, 168, 108, 0.55);
}

.collab-peek.live .peek-dot {
  animation: status-blink 1.2s ease-in-out infinite;
}

.collab-layer {
  position: absolute;
  inset: 0;
  z-index: 12;
  display: grid;
  place-items: stretch;
  padding: 8px;
}

.collab-scrim {
  position: absolute;
  inset: 0;
  border: 0;
  background: rgba(20, 40, 58, 0.18);
  cursor: pointer;
}

.collab-dialog {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
  min-height: 0;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  border-radius: 12px;
  background:
    radial-gradient(700px 280px at 8% -10%, rgba(46, 196, 214, 0.14), transparent 55%),
    linear-gradient(165deg, #f7fbfd, #eef4f8);
  border: 1px solid rgba(46, 196, 214, 0.28);
  box-shadow: 0 24px 64px rgba(20, 40, 58, 0.14);
  color: var(--color-ink);
  overflow: hidden;
}

.collab-dialog-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px 12px 18px;
  border-bottom: 1px solid rgba(20, 40, 58, 0.08);
}

.collab-dialog-head h3 {
  margin: 4px 0 0;
  font-family: var(--font-display);
  font-size: 1.05rem;
  font-weight: 600;
}

.collab-dialog-body {
  min-height: 0;
  padding: 10px 12px 14px;
  display: flex;
  flex-direction: column;
}

.collab-dialog-body :deep(.rail) {
  flex: 1;
  min-height: 0;
  height: 100%;
}

.workspace.voice-listen {
  border-color: rgba(201, 168, 108, 0.55);
  box-shadow:
    0 28px 80px rgba(20, 40, 58, 0.16),
    0 0 var(--voice-glow, 24px) rgba(201, 168, 108, 0.28),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
  animation: workspace-voice-flash var(--voice-period, 1.4s) ease-in-out infinite;
}

.hud-frame .voice-breath {
  position: absolute;
  inset: 8%;
  border-radius: 28px;
  pointer-events: none;
  background: radial-gradient(
    circle at 50% 12%,
    rgba(201, 168, 108, calc(0.18 + var(--voice-lvl, 0.14) * 0.28)),
    transparent 55%
  );
  animation: voice-breath-wash var(--voice-period, 1.4s) ease-in-out infinite;
}

.hud-frame {
  pointer-events: none;
  position: absolute;
  inset: 0;
  z-index: 2;
  grid-area: 1 / 1 / -1 / -1;
}

.workspace-head {
  position: relative;
  z-index: 1;
  grid-column: 1 / -1;
  grid-row: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px 20px;
  min-height: 0;
  padding: 12px 18px 10px 22px;
  border-bottom: 1px solid rgba(20, 40, 58, 0.08);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.72), transparent);
}

.head-left {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.head-title {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px 14px;
}

.head-right {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  flex: 0 1 auto;
  min-width: 0;
}

.hud-frame .c {
  position: absolute;
  width: 18px;
  height: 18px;
  border: 2px solid rgba(46, 196, 214, 0.42);
}

.hud-frame .c.tl { top: 12px; left: 12px; border-right: 0; border-bottom: 0; }
.hud-frame .c.tr { top: 12px; right: 12px; border-left: 0; border-bottom: 0; }
.hud-frame .c.bl { bottom: 12px; left: 12px; border-right: 0; border-top: 0; }
.hud-frame .c.br { bottom: 12px; right: 12px; border-left: 0; border-top: 0; }

.hud-frame .scan {
  position: absolute;
  left: 0;
  right: 0;
  height: 18%;
  background: linear-gradient(
    180deg,
    transparent,
    rgba(46, 196, 214, 0.12),
    transparent
  );
  animation: panel-scan 5.5s ease-in-out infinite;
}

.eyebrow {
  margin: 0;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 0.7rem;
  letter-spacing: 0.04em;
  color: #8a6a2e;
}

.live-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--color-signal);
  box-shadow: 0 0 10px rgba(46, 196, 214, 0.8);
  animation: status-blink 2s ease-in-out infinite;
}

.live-dot.voice {
  width: 9px;
  height: 9px;
  background: #c9a86c;
  box-shadow: 0 0 calc(8px + var(--voice-lvl, 0.14) * 18px) rgba(201, 168, 108, 0.7);
  animation: voice-dot-flash var(--voice-period, 1.4s) ease-in-out infinite;
}

.listen-live {
  color: #7a5a22;
  font-weight: 600;
  animation: listen-text-flash var(--voice-period, 1.4s) ease-in-out infinite;
}

.workspace-head h2 {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.22rem;
  font-weight: 600;
  line-height: 1.2;
  color: var(--color-ink);
}

.orch-bar {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  align-items: center;
  gap: 8px 12px;
  min-width: 0;
}

.orch-bar label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  font-size: 0.68rem;
  letter-spacing: 0.04em;
  color: var(--color-ink-muted);
  white-space: nowrap;
}

.orch-bar select {
  min-width: 0;
  max-width: 148px;
  padding: 4px 8px;
  border-radius: 7px;
  border: 1px solid rgba(20, 40, 58, 0.12);
  background: #fff;
  color: var(--color-ink);
  font-size: 0.76rem;
}

.orch-bar select:disabled {
  opacity: 0.55;
}

.status {
  margin: 0;
  font-size: 0.78rem;
  color: var(--color-ink-muted);
  min-width: 0;
}

.working-inline {
  display: inline-block;
  width: 9px;
  height: 9px;
  margin-right: 6px;
  vertical-align: -1px;
  border-radius: 50%;
  border: 1.5px solid rgba(26, 122, 146, 0.18);
  border-top-color: var(--color-accent);
  animation: orbit 0.7s linear infinite;
}

@keyframes orbit {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .working-inline {
    animation: none;
  }
}

.voice-tag {
  margin-left: 8px;
  display: inline-block;
  padding: 1px 8px;
  border-radius: 999px;
  font-size: 0.72rem;
  letter-spacing: 0.04em;
  color: #0b2a36;
  background: linear-gradient(120deg, #9adce8, #e6d4a8);
}

.voice-tag.dim {
  color: var(--color-ink-muted);
  background: rgba(20, 40, 58, 0.06);
}

.icon-btn {
  border: 1px solid rgba(20, 40, 58, 0.12);
  background: rgba(255, 255, 255, 0.72);
  color: inherit;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1.2rem;
  line-height: 1;
  flex-shrink: 0;
  transition:
    background var(--dur-fast) var(--ease-soft),
    border-color var(--dur-fast) var(--ease-soft),
    transform var(--dur-fast) var(--ease-out);
}

.icon-btn:hover {
  background: rgba(46, 196, 214, 0.12);
  border-color: rgba(46, 196, 214, 0.45);
  transform: scale(1.04);
}

@keyframes panel-scan {
  0% { top: -20%; opacity: 0; }
  15% { opacity: 1; }
  85% { opacity: 1; }
  100% { top: 100%; opacity: 0; }
}

.workspace-body {
  position: relative;
  z-index: 1;
  min-height: 0;
  grid-column: 1 / -1;
  grid-row: 2;
  display: grid;
  grid-template-columns: minmax(420px, 1.15fr) minmax(360px, 0.95fr);
  gap: 0;
}

.collab-pane,
.chat-pane {
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.collab-pane {
  padding: 12px 14px 12px 18px;
  border-right: 1px solid rgba(20, 40, 58, 0.08);
  background:
    linear-gradient(180deg, rgba(46, 196, 214, 0.06), transparent 30%),
    rgba(255, 255, 255, 0.35);
}

.collab-pane :deep(.rail) {
  flex: 1;
  min-height: 0;
  height: 100%;
}

.chat-pane {
  padding: 12px 18px 12px 14px;
}

.empty-collab {
  margin: auto 0;
  padding: 28px 16px;
  text-align: center;
  color: var(--color-ink-muted);
  border: 1px dashed rgba(26, 122, 146, 0.28);
  border-radius: 16px;
  background: rgba(46, 196, 214, 0.05);
}

.empty-collab strong {
  display: block;
  margin-bottom: 8px;
  color: var(--color-ink);
  font-family: var(--font-display);
}

.empty-collab p {
  margin: 0;
  font-size: 0.88rem;
  line-height: 1.55;
}

.messages {
  flex: 1;
  min-height: 0;
  overflow: auto;
  display: grid;
  align-content: start;
  gap: 14px;
  padding-right: 8px;
  margin-bottom: 12px;
}

.bubble {
  padding: 14px 16px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.82);
  border: 1px solid rgba(20, 40, 58, 0.08);
  box-shadow: 0 8px 20px rgba(20, 40, 58, 0.04);
}

.bubble[data-role='user'] {
  background: linear-gradient(145deg, rgba(46, 196, 214, 0.16), rgba(26, 122, 146, 0.08));
  border-color: rgba(46, 196, 214, 0.32);
  justify-self: end;
  max-width: 88%;
}

.bubble[data-role='system'] {
  background: transparent;
  border-style: dashed;
}

.bubble-meta {
  margin-bottom: 8px;
  font-size: 0.78rem;
  letter-spacing: 0.02em;
  color: var(--color-ink-muted);
}

.plain {
  margin: 0;
  white-space: pre-wrap;
  line-height: 1.6;
  font-size: 0.95rem;
}

.plain.muted {
  color: var(--color-ink-muted);
}

.oral-card {
  margin-top: 14px;
  padding: 14px 16px;
  border-radius: 14px;
  background:
    linear-gradient(145deg, rgba(201, 168, 108, 0.16), rgba(46, 196, 214, 0.08));
  border: 1px solid rgba(201, 168, 108, 0.4);
}

.oral-card.live {
  box-shadow: 0 0 24px rgba(201, 168, 108, 0.18);
  border-color: rgba(201, 168, 108, 0.62);
}

.oral-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.oral-head strong {
  font-size: 0.82rem;
  letter-spacing: 0.08em;
  color: #7a5a22;
}

.oral-head em {
  font-style: normal;
  font-family: var(--font-mono);
  font-size: 0.7rem;
  letter-spacing: 0.1em;
  color: var(--color-accent);
  animation: blink 1s ease-in-out infinite;
}

.oral-head .replay {
  margin-left: auto;
  border: 1px solid rgba(26, 122, 146, 0.28);
  background: rgba(46, 196, 214, 0.1);
  color: var(--color-accent);
  border-radius: 8px;
  padding: 4px 10px;
  cursor: pointer;
  font-size: 0.74rem;
}

.oral-card p {
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.7;
  color: var(--color-ink);
}

@keyframes blink {
  50% { opacity: 0.45; }
}

@keyframes workspace-voice-flash {
  0%, 100% {
    box-shadow:
      0 28px 80px rgba(20, 40, 58, 0.16),
      0 0 calc(12px + var(--voice-lvl, 0.14) * 20px) rgba(201, 168, 108, 0.22),
      inset 0 1px 0 rgba(255, 255, 255, 0.9);
  }
  50% {
    box-shadow:
      0 28px 80px rgba(20, 40, 58, 0.16),
      0 0 calc(28px + var(--voice-lvl, 0.14) * 48px) rgba(201, 168, 108, 0.42),
      inset 0 1px 0 rgba(255, 255, 255, 0.95);
  }
}

@keyframes voice-breath-wash {
  0%, 100% { opacity: 0.55; transform: scale(0.98); }
  50% { opacity: 1; transform: scale(1.02); }
}

@keyframes voice-dot-flash {
  0%, 100% {
    transform: scale(1);
    opacity: 0.75;
    box-shadow: 0 0 8px rgba(201, 168, 108, 0.45);
  }
  50% {
    transform: scale(1.35);
    opacity: 1;
    box-shadow: 0 0 calc(14px + var(--voice-lvl, 0.14) * 22px) rgba(201, 168, 108, 0.9);
  }
}

@keyframes listen-text-flash {
  0%, 100% { opacity: 0.78; }
  50% { opacity: 1; }
}

.error {
  margin: 0 0 10px;
  color: var(--color-danger);
  font-size: 0.85rem;
}

.dock {
  display: grid;
  gap: 10px;
  padding-top: 8px;
  border-top: 1px solid rgba(20, 40, 58, 0.08);
}

.shortcuts {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.shortcuts button {
  border: 1px solid rgba(201, 168, 108, 0.38);
  background: rgba(201, 168, 108, 0.1);
  color: #7a5a22;
  border-radius: 10px;
  padding: 8px 12px;
  cursor: pointer;
  font-size: 0.8rem;
  letter-spacing: 0.02em;
  transition: background 260ms var(--ease-soft), border-color 260ms var(--ease-soft), transform 260ms var(--ease-out);
}

.shortcuts button:hover:not(:disabled) {
  background: rgba(201, 168, 108, 0.2);
  border-color: rgba(201, 168, 108, 0.55);
  transform: translate3d(0, -2px, 0);
}

.shortcuts button:disabled,
.composer button:disabled,
.composer textarea:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.composer {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
  align-items: end;
}

.composer textarea {
  resize: none;
  border: 1px solid rgba(20, 40, 58, 0.12);
  background: #fff;
  color: inherit;
  border-radius: 14px;
  padding: 12px 14px;
  outline: none;
  line-height: 1.45;
  min-height: 72px;
  transition:
    border-color var(--dur-mid) var(--ease-soft),
    box-shadow var(--dur-mid) var(--ease-soft);
}

.composer textarea:focus {
  border-color: rgba(46, 196, 214, 0.65);
  box-shadow: 0 0 0 3px rgba(46, 196, 214, 0.14);
}

.composer button {
  border: 0;
  border-radius: 14px;
  padding: 0 18px;
  min-height: 72px;
  background: linear-gradient(135deg, #3ec4e0, #157a9c 55%, #0e5f7a);
  color: white;
  font-weight: 600;
  letter-spacing: 0.06em;
  cursor: pointer;
  box-shadow: 0 8px 24px rgba(21, 122, 156, 0.35);
  transition:
    transform var(--dur-fast) var(--ease-out),
    filter var(--dur-fast) var(--ease-soft),
    box-shadow var(--dur-fast) var(--ease-soft);
}

.composer button:hover:not(:disabled) {
  transform: translate3d(0, -2px, 0);
  filter: brightness(1.06);
  box-shadow: 0 12px 28px rgba(21, 122, 156, 0.42);
}

@media (max-width: 1100px) {
  .workspace-body {
    grid-template-columns: minmax(360px, 1.05fr) minmax(300px, 0.95fr);
  }

  .head-right {
    flex-wrap: wrap;
  }

  .orch-bar select {
    max-width: 120px;
  }
}

@media (max-width: 960px) {
  .workspace {
    top: 6px;
    right: 6px;
    bottom: 6px;
    left: 6px;
    width: auto;
    border-radius: 18px;
  }

  .workspace.chat-only {
    inset: 8px;
    width: auto;
  }

  .collab-layer {
    padding: 4px;
  }

  .collab-dialog {
    border-radius: 10px;
  }

  .workspace-body {
    grid-template-columns: 1fr;
    grid-template-rows: minmax(280px, 48%) 1fr;
  }

  .workspace.chat-only .workspace-body {
    grid-template-rows: minmax(0, 1fr);
  }

  .collab-pane {
    border-right: 0;
    border-bottom: 1px solid rgba(20, 40, 58, 0.08);
  }

  .bubble[data-role='user'] {
    max-width: 100%;
    justify-self: stretch;
  }
}
</style>
