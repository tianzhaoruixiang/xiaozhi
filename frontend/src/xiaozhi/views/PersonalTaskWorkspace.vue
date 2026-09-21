<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { usePersonalTasks, type PersonalTask } from '../data/personalTasks'
import type { PlanItem } from '../data/mockPlans'
import { useAssistantChat } from '../composables/useAssistantChat'
import { useAgentCatalog } from '../composables/useAgentCatalog'
import MarkdownView from '../components/MarkdownView.vue'
import PersonalCollabProcess from '../components/PersonalCollabProcess.vue'
import SourcingShortlistCard from '../components/SourcingShortlistCard.vue'
import DispatchConfirmCard from '../components/DispatchConfirmCard.vue'
import XiaozhiWorkingHint from '../components/XiaozhiWorkingHint.vue'

const props = defineProps<{
  taskId: string
  query?: string
}>()

const emit = defineEmits<{
  'select-task': [id: string]
  'query-consumed': []
  back: []
}>()

const {
  specialTasks,
  keyTasks,
  dailyTasks,
  newSpecialNotice,
  completeSourcingAfterHrbpReport,
  scheduleFollowupSpecialTasks,
  clearNewSpecialNotice,
  completeCommunicationAfterHrbpReport,
} = usePersonalTasks()

type TaskKind = 'special' | 'key' | 'daily'

const allTasks = computed(() => [
  ...specialTasks.value,
  ...keyTasks.value,
  ...dailyTasks.value,
])

const selected = computed(
  () => allTasks.value.find((t) => t.id === props.taskId) ?? null,
)

const selectedKind = computed<TaskKind | null>(() => {
  const task = selected.value
  if (!task) return null
  if (specialTasks.value.some((t) => t.id === task.id)) return 'special'
  if (keyTasks.value.some((t) => t.id === task.id)) return 'key'
  return 'daily'
})

const kindLabel: Record<TaskKind, string> = {
  special: '专项任务',
  key: '重点任务',
  daily: '待办任务',
}

const taskPrompt = (task: PersonalTask) => `推进「${task.title}」：${task.detail}`

const toPlanItem = (task: PersonalTask, category: PlanItem['category']): PlanItem => ({
  ...task,
  category,
})

const contextPlans = computed<PlanItem[]>(() => {
  const plans: PlanItem[] = [
    ...specialTasks.value.map((t) => toPlanItem(t, 'focus')),
    ...keyTasks.value.map((t) => toPlanItem(t, 'focus')),
    ...dailyTasks.value.map((t) => toPlanItem(t, 'todo')),
  ]
  const task = selected.value
  if (!task) return plans
  const rest = plans.filter((p) => p.id !== task.id)
  return [toPlanItem(task, selectedKind.value === 'daily' ? 'todo' : 'focus'), ...rest]
})

const draft = ref('')
const scroller = ref<HTMLElement | null>(null)

const { state, messages, streaming, error, pendingConfirm, send, confirmDispatch } =
  useAssistantChat()

const { catalog, selectedTeam, selectedWorkflow, selectedMode, onTeamChange } =
  useAgentCatalog()

const isLiveMessage = (msgId: string) => {
  if (!streaming.value) return false
  const last = [...messages.value].reverse().find((m) => m.role === 'assistant')
  return last?.id === msgId
}

const resetWelcome = (task: PersonalTask | null) => {
  const kind = task && selectedKind.value ? kindLabel[selectedKind.value] : '任务'
  messages.value = [
    {
      id: `welcome-${task?.id ?? 'none'}`,
      role: 'system',
      content: task
        ? `已进入${kind}「${task.title}」。确认指令后点击发送，智枢即刻开始执行。`
        : '选择下方任务，或直接输入指令后点击发送，智枢即刻开始执行。',
    },
  ]
  state.value = 'idle'
}

const onHrbpReported = (kind: 'shortlist' | 'online-plan' | 'offline-plan') => {
  const taskId = selected.value?.id || props.taskId || 's1'
  if (kind === 'online-plan' || kind === 'offline-plan') {
    completeCommunicationAfterHrbpReport(taskId, kind)
    return
  }
  completeSourcingAfterHrbpReport(taskId)
  // 上报 5s 后：线上沟通、线下沟通两个新任务到达
  scheduleFollowupSpecialTasks()
}

let lastTaskId: string | null | undefined
watch(
  () => selected.value?.id ?? null,
  (id) => {
    if (lastTaskId === id) return
    lastTaskId = id
    resetWelcome(selected.value)
    // 选中的任务内容进入输入框，确认后点击发送开始执行
    draft.value = selected.value ? taskPrompt(selected.value) : ''
  },
  { immediate: true },
)

const scrollToBottom = async () => {
  await nextTick()
  const el = scroller.value
  if (!el) return
  el.scrollTop = el.scrollHeight
}

watch(
  () => [messages.value, streaming.value],
  () => {
    void scrollToBottom()
  },
  { deep: true },
)

const orchestration = () => ({
  team: selectedTeam.value || undefined,
  workflow: selectedWorkflow.value || undefined,
  mode: selectedMode.value,
})

function onSubmit(text?: string) {
  const content = (text ?? draft.value).trim()
  if (!content) return
  if (pendingConfirm.value) {
    draft.value = ''
    void send(content, contextPlans.value, orchestration(), {
      enableOralReport: false,
    })
    return
  }
  if (streaming.value) return
  draft.value = ''
  void send(content, contextPlans.value, orchestration(), {
    enableOralReport: false,
  })
}

const onModeChange = (mode: string) => {
  if (mode === 'hybrid' || mode === 'config' || mode === 'dynamic') {
    selectedMode.value = mode
  }
}

/* 首页输入框直达：进入交互框后立即执行一次 */
let lastQuery = ''
watch(
  () => props.query ?? '',
  (text) => {
    if (!text) {
      lastQuery = ''
      return
    }
    if (text === lastQuery) return
    lastQuery = text
    onSubmit(text)
    emit('query-consumed')
  },
  { immediate: true },
)

/* 输入框内的任务选择器 */
const pickerGroups = computed(() => [
  { kind: 'special' as TaskKind, label: '专项任务', items: specialTasks.value },
  { kind: 'key' as TaskKind, label: '重点任务', items: keyTasks.value },
  { kind: 'daily' as TaskKind, label: '待办任务', items: dailyTasks.value },
])

const picker = ref<TaskKind | null>(null)

const togglePicker = (kind: TaskKind) => {
  picker.value = picker.value === kind ? null : kind
  if (kind === 'special' && picker.value === 'special') clearNewSpecialNotice()
}

const pickTask = (task: PersonalTask) => {
  picker.value = null
  // 任务名称进入输入框
  draft.value = taskPrompt(task)
  emit('select-task', task.id)
}

const onDocClick = () => {
  picker.value = null
}

onMounted(() => {
  document.addEventListener('click', onDocClick)
})

onUnmounted(() => {
  document.removeEventListener('click', onDocClick)
})
</script>

<template>
  <div class="task-workspace">
    <header class="topbar">
      <button type="button" class="back" title="返回工作台" @click="emit('back')">
        <span class="back-mark">智枢</span>
        <span class="back-hint">返回工作台</span>
      </button>
      <div v-if="selected" class="top-meta">
        <span class="kind">{{ selectedKind ? kindLabel[selectedKind] : '' }}</span>
        <h1>{{ selected.title }}</h1>
      </div>
    </header>

    <section class="dialog" aria-label="任务交互">
      <header class="dialog-head">
        <div class="dialog-title">
          <p class="eyebrow">任务协作</p>
          <h2>{{ selected ? selected.title : '与智枢对话' }}</h2>
          <p class="hint">
            {{
              selected
                ? '任务内容已填入下方输入框，确认后点击发送即可开始执行。'
                : '输入指令后点击发送，智枢即刻开始执行。'
            }}
          </p>
        </div>
        <div v-if="catalog?.teams?.length" class="orch">
          <label>
            专家团
            <select
              :value="selectedTeam"
              :disabled="streaming"
              @change="onTeamChange(($event.target as HTMLSelectElement).value)"
            >
              <option value="">智能识别</option>
              <option v-for="t in catalog.teams" :key="t.name" :value="t.name">
                {{ t.displayName }}
              </option>
            </select>
          </label>
          <label>
            工作流
            <select
              :value="selectedWorkflow"
              :disabled="streaming"
              @change="selectedWorkflow = ($event.target as HTMLSelectElement).value"
            >
              <option value="">智能识别</option>
              <option v-for="w in catalog.workflows" :key="w.name" :value="w.name">
                {{ w.displayName }}
              </option>
            </select>
          </label>
          <label>
            模式
            <select
              :value="selectedMode || 'hybrid'"
              :disabled="streaming"
              @change="onModeChange(($event.target as HTMLSelectElement).value)"
            >
              <option value="hybrid">混合</option>
              <option value="config">仅配置</option>
              <option value="dynamic">仅动态</option>
            </select>
          </label>
        </div>
      </header>

      <div class="dialog-body">
        <section class="chat-pane" aria-label="对话交互">
          <div ref="scroller" class="messages">
            <article
              v-for="msg in messages"
              :key="msg.id"
              class="bubble"
              :data-role="msg.role"
            >
              <header v-if="msg.role !== 'system'" class="bubble-meta">
                <span>{{ msg.role === 'user' ? '我' : '智枢' }}</span>
              </header>

              <PersonalCollabProcess
                v-if="msg.role === 'assistant'"
                :message="msg"
                :live="isLiveMessage(msg.id)"
              />

              <MarkdownView
                v-if="msg.content && msg.role === 'assistant'"
                tone="light"
                :source="msg.content"
              />
              <p v-else-if="msg.content" class="plain">{{ msg.content }}</p>
              <XiaozhiWorkingHint
                v-else-if="
                  msg.role === 'assistant' &&
                  isLiveMessage(msg.id) &&
                  msg.taskPlan?.phase === 'executing'
                "
                tone="light"
                :steps="msg.steps ?? []"
                caption="正在办理中…"
              />
              <p
                v-else-if="msg.role === 'assistant' && isLiveMessage(msg.id)"
                class="plain muted"
              >
                正在处理您的指令…
              </p>

              <SourcingShortlistCard
                v-if="msg.role === 'assistant' && !isLiveMessage(msg.id)"
                :message="msg"
                :task-id="selected?.id"
                :task-title="selected?.title"
                @reported="onHrbpReported"
              />

              <DispatchConfirmCard
                v-if="msg.dispatchConfirm"
                tone="light"
                :confirm="msg.dispatchConfirm"
                @approve="confirmDispatch(true)"
                @reject="confirmDispatch(false)"
              />
            </article>
          </div>
        </section>
      </div>

      <p v-if="error" class="error">{{ error }}</p>

      <div class="dock">
        <div class="dock-tools">
          <div
            v-for="group in pickerGroups"
            :key="group.kind"
            class="picker"
            :class="`picker-${group.kind}`"
          >
            <button
              type="button"
              class="picker-btn"
              :class="{ open: picker === group.kind }"
              :aria-expanded="picker === group.kind"
              :disabled="streaming"
              @click.stop="togglePicker(group.kind)"
            >
              {{ group.label }}
              <span
                v-if="group.kind === 'special' && newSpecialNotice > 0"
                class="picker-badge"
                >+{{ newSpecialNotice }}</span
              >
              <span class="caret" aria-hidden="true">▾</span>
            </button>

            <div v-if="picker === group.kind" class="picker-pop" @click.stop>
              <p class="picker-head">
                {{ group.label }}
                <span>{{ group.items.length }}</span>
              </p>
              <ul>
                <li v-for="task in group.items" :key="task.id">
                  <button
                    type="button"
                    :class="{ active: selected?.id === task.id }"
                    :disabled="streaming"
                    @click="pickTask(task)"
                  >
                    <strong>{{ task.title }}</strong>
                    <em>{{ task.time }}</em>
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <form class="composer" @submit.prevent="onSubmit()">
          <textarea
            :value="draft"
            rows="2"
            placeholder="输入指令，例如：梳理候选人短名单…"
            :disabled="streaming && !pendingConfirm"
            @keydown.enter.exact.prevent="onSubmit()"
            @input="draft = ($event.target as HTMLTextAreaElement).value"
          />
          <button type="submit" :disabled="(streaming && !pendingConfirm) || !draft.trim()">发送</button>
        </form>
      </div>
    </section>
  </div>
</template>

<style scoped>
.task-workspace {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
  min-height: 0;
  height: 100%;
  max-height: 100%;
  overflow: hidden;
  animation: page-rise var(--dur-enter) var(--ease-out) 120ms both;
}

.topbar {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 12px 20px;
  flex-shrink: 0;
}

.back {
  display: inline-flex;
  align-items: baseline;
  gap: 8px;
  border: 1px solid rgba(20, 40, 58, 0.12);
  background: rgba(255, 255, 255, 0.62);
  border-radius: 999px;
  padding: 7px 16px;
  cursor: pointer;
  transition: background 160ms ease, border-color 160ms ease;
}

.back:hover {
  background: rgba(255, 255, 255, 0.9);
  border-color: rgba(46, 196, 214, 0.35);
}

.back-mark {
  font-family: var(--font-display);
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  background: linear-gradient(
    125deg,
    var(--color-abyss) 8%,
    #1a7a92 46%,
    var(--color-signal) 72%,
    var(--color-brass) 100%
  );
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.back-hint {
  font-size: 0.74rem;
  color: var(--color-ink-muted);
}

.top-meta {
  min-width: 0;
}

.top-meta .kind {
  display: inline-block;
  font-family: var(--font-mono);
  font-size: 0.72rem;
  color: var(--color-accent);
  margin-bottom: 4px;
}

.top-meta h1 {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(1.05rem, 1.8vw, 1.3rem);
  font-weight: 600;
  color: var(--color-ink);
  letter-spacing: 0.02em;
}

.dialog {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  min-width: 0;
  border-radius: calc(var(--radius-lg) + 2px);
  background:
    linear-gradient(160deg, rgba(255, 255, 255, 0.78), rgba(240, 248, 252, 0.52)),
    rgba(255, 255, 255, 0.34);
  backdrop-filter: blur(18px) saturate(1.2);
  border: 1px solid rgba(255, 255, 255, 0.72);
  box-shadow:
    var(--shadow-soft),
    inset 0 1px 0 rgba(255, 255, 255, 0.85);
  overflow: hidden;
}

.dialog-head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px 18px;
  padding: 14px 18px 12px;
  border-bottom: 1px solid rgba(20, 40, 58, 0.08);
  flex-shrink: 0;
}

.dialog-title {
  min-width: 0;
}

.eyebrow {
  margin: 0 0 4px;
  font-family: var(--font-mono);
  font-size: 0.72rem;
  color: var(--color-accent);
}

.dialog-head h2 {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--color-ink);
}

.hint {
  margin: 6px 0 0;
  font-size: 0.84rem;
  color: var(--color-ink-muted);
}

.orch {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: flex-end;
}

.orch label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.72rem;
  color: var(--color-ink-muted);
}

.orch select {
  min-width: 110px;
  border-radius: 8px;
  border: 1px solid rgba(20, 40, 58, 0.12);
  background: rgba(255, 255, 255, 0.7);
  padding: 6px 8px;
  font-size: 0.82rem;
  color: var(--color-ink);
}

.dialog-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.chat-pane {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.messages {
  flex: 1;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.bubble {
  max-width: 92%;
  padding: 12px 14px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid rgba(20, 40, 58, 0.08);
  color: var(--color-ink);
}

.bubble[data-role='assistant'] {
  align-self: stretch;
  max-width: 100%;
  color: #14304a;
  background: rgba(255, 255, 255, 0.94);
}

.bubble[data-role='user'] {
  align-self: flex-end;
  background: rgba(46, 196, 214, 0.14);
  border-color: rgba(46, 196, 214, 0.22);
  color: var(--color-ink);
}

.bubble[data-role='system'] {
  align-self: stretch;
  max-width: 100%;
  background: rgba(6, 20, 31, 0.03);
  color: var(--color-ink-muted);
  font-size: 0.9rem;
}

.bubble-meta {
  margin-bottom: 6px;
  font-family: var(--font-mono);
  font-size: 0.68rem;
  color: var(--color-ink-muted);
}

.plain {
  margin: 0;
  white-space: pre-wrap;
  line-height: 1.55;
  font-size: 0.92rem;
  color: var(--color-ink);
}

.plain.muted {
  color: var(--color-ink-muted);
}

.error {
  margin: 0;
  padding: 0 20px 8px;
  color: #a84848;
  font-size: 0.86rem;
  flex-shrink: 0;
}

.dock {
  position: relative;
  padding: 12px 16px 16px;
  border-top: 1px solid rgba(20, 40, 58, 0.08);
  background: rgba(255, 255, 255, 0.35);
  flex-shrink: 0;
}

.dock-tools {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
}

.picker {
  position: relative;
}

.picker-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid rgba(20, 40, 58, 0.12);
  background: rgba(255, 255, 255, 0.78);
  border-radius: 999px;
  padding: 6px 14px;
  font-size: 0.84rem;
  color: var(--color-ink);
  cursor: pointer;
  transition: border-color 160ms ease, color 160ms ease, background 160ms ease;
}

.picker-btn:hover,
.picker-btn.open {
  color: var(--color-accent);
  border-color: rgba(46, 196, 214, 0.4);
  background: rgba(255, 255, 255, 0.95);
}

.picker-daily .picker-btn:hover,
.picker-daily .picker-btn.open {
  color: #8a6a2e;
  border-color: rgba(201, 168, 108, 0.45);
}

.picker-key .picker-btn:hover,
.picker-key .picker-btn.open {
  color: #3a689c;
  border-color: rgba(58, 104, 156, 0.45);
}

.caret {
  font-size: 0.62rem;
  opacity: 0.65;
}

/* 新任务到达：红色 +N */
.picker-badge {
  min-width: 1.4rem;
  padding: 1px 6px;
  border-radius: 999px;
  background: linear-gradient(160deg, #d9534f, #a84848);
  color: #fff;
  font-family: var(--font-mono);
  font-size: 0.7rem;
  font-weight: 700;
  line-height: 1.5;
  text-align: center;
  box-shadow:
    0 0 0 2px rgba(255, 255, 255, 0.9),
    0 4px 12px rgba(168, 72, 72, 0.38);
  animation: badge-pop 460ms var(--ease-out) both;
}

@keyframes badge-pop {
  0% {
    transform: scale(0.5);
    opacity: 0;
  }
  60% {
    transform: scale(1.14);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.picker-btn:disabled,
.picker-pop li button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.picker-pop {
  position: absolute;
  left: 0;
  bottom: calc(100% + 10px);
  z-index: 20;
  width: min(340px, 78vw);
  max-height: 320px;
  overflow-y: auto;
  padding: 12px;
  border-radius: 14px;
  background: rgba(252, 254, 255, 0.97);
  border: 1px solid rgba(46, 196, 214, 0.25);
  box-shadow: 0 18px 42px rgba(6, 20, 31, 0.18);
  animation: soft-fade var(--dur-fast) var(--ease-out) both;
}

.picker-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0 0 8px;
  padding: 0 4px;
  font-family: var(--font-mono);
  font-size: 0.74rem;
  letter-spacing: 0.06em;
  color: var(--color-accent);
}

.picker-head span {
  color: var(--color-ink-muted);
}

.picker-pop ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.picker-pop li button {
  width: 100%;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  text-align: left;
  border: 1px solid transparent;
  background: transparent;
  border-radius: 10px;
  padding: 9px 10px;
  cursor: pointer;
  transition: background 140ms ease, border-color 140ms ease;
}

.picker-pop li button:hover {
  background: rgba(46, 196, 214, 0.1);
  border-color: rgba(46, 196, 214, 0.28);
}

.picker-pop li button.active {
  background: rgba(46, 196, 214, 0.14);
  border-color: rgba(46, 196, 214, 0.38);
}

.picker-pop strong {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--color-ink);
  line-height: 1.35;
}

.picker-pop em {
  flex-shrink: 0;
  font-style: normal;
  font-family: var(--font-mono);
  font-size: 0.66rem;
  color: var(--color-ink-muted);
}

.composer {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
  align-items: end;
}

.composer textarea {
  resize: none;
  border-radius: 12px;
  border: 1px solid rgba(20, 40, 58, 0.12);
  background: rgba(255, 255, 255, 0.84);
  padding: 10px 12px;
  font: inherit;
  font-size: 0.92rem;
  color: var(--color-ink);
  line-height: 1.5;
}

.composer button[type='submit'] {
  border: 0;
  border-radius: 12px;
  padding: 12px 20px;
  background: linear-gradient(160deg, #1f8ea8, #176f84);
  color: #fff;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 160ms ease;
}

.composer button[type='submit']:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.composer textarea:disabled {
  opacity: 0.6;
}

@media (max-width: 720px) {
  .composer {
    grid-template-columns: 1fr;
  }
}
</style>
