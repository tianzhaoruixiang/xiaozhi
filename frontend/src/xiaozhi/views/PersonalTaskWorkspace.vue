<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { usePersonalTasks, type PersonalTask } from '../data/personalTasks'
import type { PlanItem } from '../data/mockPlans'
import { useAssistantChat } from '../composables/useAssistantChat'
import { useAgentCatalog } from '../composables/useAgentCatalog'
import { useReviews } from '../data/reviews'
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
  completeSourcingAfterHrbpReport,
  scheduleFollowupSpecialTasks,
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

const { submitForReview } = useReviews()

const isLiveMessage = (msgId: string) => {
  if (!streaming.value) return false
  const last = [...messages.value].reverse().find((m) => m.role === 'assistant')
  return last?.id === msgId
}

/** 进入/切换任务：对话区清空，直接等指令（不再插入系统提示气泡） */
const resetConversation = () => {
  messages.value = []
  state.value = 'idle'
}

const onHrbpReported = (payload: {
  kind: 'shortlist' | 'online-plan' | 'offline-plan'
  taskTitle: string
  fileName: string
  markdown: string
}) => {
  const taskId = selected.value?.id || props.taskId || 's1'
  const taskTitle = selected.value?.title || payload.taskTitle

  // 张磊完成任务：成果提交王处审核（/team 的「待审核」角标 +1）
  submitForReview({
    taskId,
    taskTitle,
    kind: payload.kind,
    fileName: payload.fileName,
    markdown: payload.markdown,
    submittedBy: '张磊',
  })

  if (payload.kind === 'online-plan' || payload.kind === 'offline-plan') {
    completeCommunicationAfterHrbpReport(taskId, payload.kind)
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
    resetConversation()
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
</script>

<template>
  <div class="task-workspace">
    <header class="topbar">
      <button type="button" class="back" title="返回工作台" @click="emit('back')">
        <span class="back-mark">小智</span>
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
          <h2>{{ selected ? selected.title : '与小智对话' }}</h2>
          <p class="hint">
            {{
              selected
                ? '任务内容已填入下方输入框，确认后点击发送即可开始执行。'
                : '输入指令后点击发送，小智即刻开始执行。'
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
                <span>{{ msg.role === 'user' ? '我' : '小智' }}</span>
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
