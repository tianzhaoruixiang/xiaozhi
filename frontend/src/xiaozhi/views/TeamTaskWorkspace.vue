<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAssistantChat } from '../composables/useAssistantChat'
import { SATURATION_MAX, useGroupTasks } from '../data/groupTasks'
import MarkdownView from '../components/MarkdownView.vue'
import PersonalCollabProcess from '../components/PersonalCollabProcess.vue'
import XiaozhiWorkingHint from '../components/XiaozhiWorkingHint.vue'

const route = useRoute()
const router = useRouter()
/** 任务执行页直接进入执行，不需要领导台的语音开场白 */
const { messages, streaming, error, send } = useAssistantChat({ welcome: false })
const { currentGroup, assignTask } = useGroupTasks()

const TEAM_PATH = '/team'
/** 固定调度「任务分解组」，由任务分解专家产出任务项与负责人建议 */
const DECOMPOSE_TEAM = 'task-decomposition'
const DEFAULT_INSTRUCTION = '将推荐算法专家寻访工作拆分成任务项，分配给合适的成员'
/** 分解结果里第一个任务项分配给张磊 */
const TARGET_MEMBER = '张磊'

const started = ref(false)
const applied = ref(false)
const applyResult = ref<{
  taskTitle: string
  member: string
  saturation: number
} | null>(null)

/** ?task= 指向的任务：待分配走任务分解，其它状态直接问智枢 */
const taskId = computed(() =>
  typeof route.query.task === 'string' ? route.query.task : '',
)
const targetTask = computed(
  () => currentGroup.value?.tasks.find((t) => t.id === taskId.value) ?? null,
)
const isDecompose = computed(
  () => !targetTask.value || targetTask.value.status === 'unassigned',
)

const startAsk = (text: string) => {
  if (started.value || streaming.value) return
  started.value = true
  const orchestration = isDecompose.value
    ? { team: DECOMPOSE_TEAM, workflow: DECOMPOSE_TEAM, mode: 'config' }
    : { mode: 'hybrid' }
  void send(text, [], orchestration, { enableOralReport: false })
}

watch(
  () => (typeof route.query.q === 'string' ? route.query.q : ''),
  (text) => startAsk(text.trim() || DEFAULT_INSTRUCTION),
  { immediate: true },
)

const pendingTasks = computed(
  () => currentGroup.value?.tasks.filter((t) => t.status === 'unassigned') ?? [],
)

const lastAssistant = computed(() =>
  [...messages.value].reverse().find((m) => m.role === 'assistant'),
)

/** 正在流式输出中的那条助手消息（与 /personal/task 判定一致） */
const isLiveMessage = (msgId: string) => {
  if (!streaming.value) return false
  const last = [...messages.value].reverse().find((m) => m.role === 'assistant')
  return last?.id === msgId
}

/** 专家全部跑完即视为分解完成 */
const finished = computed(() => {
  const msg = lastAssistant.value
  if (!msg || streaming.value) return false
  if (msg.taskPlan?.phase === 'done') return true
  const steps = msg.steps ?? []
  return steps.length > 0 && steps.every((s) => s.status === 'done' || s.status === 'error')
})

/** 把分解结果落到台账：第一个待分配任务 → 张磊，饱和度 +1（幂等） */
const applyDecomposition = () => {
  if (applied.value) return
  const group = currentGroup.value
  if (!group) return
  const target =
    group.tasks.find((t) => t.status === 'unassigned') ?? group.tasks[0]
  if (!target) return
  const res = assignTask(group.id, target.id, TARGET_MEMBER, {
    role: '负责人',
    note: '由任务分解结果分配',
  })
  if (!res.ok) return
  applied.value = true
  applyResult.value = {
    taskTitle: target.title,
    member: TARGET_MEMBER,
    saturation: res.saturation,
  }
}

watch(finished, (done) => {
  if (done) applyDecomposition()
})

const backToTeam = () => {
  // 兜底：分解场景下即使完成判定还没到，点击返回也应用分配结果
  if (isDecompose.value) applyDecomposition()
  void router.push(TEAM_PATH)
}

/** 底部输入框：就当前任务继续追问智枢（与 /personal/task 的输入框一致） */
const draft = ref('')
const askFollowUp = () => {
  const text = draft.value.trim()
  if (!text || streaming.value) return
  draft.value = ''
  void send(text, [], { mode: 'hybrid' }, { enableOralReport: false })
}
</script>

<template>
  <div class="task-workspace xiaozhi-scope">
    <div class="atmosphere" aria-hidden="true">
      <div class="mesh" />
      <div class="orb orb-a" />
      <div class="orb orb-b" />
    </div>

    <div class="shell">
      <header class="topbar">
        <button type="button" class="back" @click="backToTeam">
          <span class="back-mark">智枢</span>
          <span class="back-hint">返回王处工作台</span>
        </button>
        <div class="top-meta">
          <span class="kind">{{ isDecompose ? '任务执行' : '任务问询' }}</span>
          <h1>{{ currentGroup?.name }} · {{ targetTask?.title || '推荐算法专家寻访' }}</h1>
        </div>
      </header>

      <section class="dialog" :aria-label="isDecompose ? '任务执行' : '任务问询'">
        <header class="dialog-head">
          <div>
            <p class="eyebrow">{{ isDecompose ? '任务分解' : '任务问询' }}</p>
            <h2>{{ isDecompose ? '把智枢交办的工作拆成任务项' : '由智枢结合本组台账回答' }}</h2>
            <p v-if="isDecompose" class="hint">
              智枢已调度<strong>任务分解专家</strong>，把「{{ targetTask?.title || '推荐算法专家寻访' }}」拆成任务项并给出负责人建议；
              完成后点击下方按钮回到王处工作台。
            </p>
            <p v-else class="hint">
              智枢正在结合本组台账与成员进度回答「{{ targetTask?.title }}」的问题；
              完成后点击下方按钮回到王处工作台。
            </p>
          </div>
          <dl class="ctx">
            <div><dt>本组</dt><dd>{{ currentGroup?.name }}</dd></div>
            <div><dt>组长</dt><dd>{{ currentGroup?.lead }}</dd></div>
            <div v-if="targetTask">
              <dt>任务</dt><dd>{{ targetTask.progress }}%</dd>
            </div>
            <div v-if="isDecompose" :data-warn="pendingTasks.length > 0">
              <dt>待分配</dt><dd>{{ pendingTasks.length }}</dd>
            </div>
          </dl>
        </header>

        <div class="messages">
          <article
            v-for="msg in messages"
            :key="msg.id"
            class="bubble"
            :data-role="msg.role"
          >
            <header v-if="msg.role !== 'system'" class="bubble-meta">
              <span>{{ msg.role === 'user' ? '王处' : '智枢' }}</span>
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
            <!-- 执行过程中的「正在工作」，与 /personal/task 保持一致 -->
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
              {{ isDecompose ? '正在调度任务分解专家…' : '正在结合台账梳理…' }}
            </p>
          </article>
        </div>

        <p v-if="error" class="error">{{ error }}</p>

        <footer class="dock">
          <div v-if="applyResult" class="result">
            <span class="result-tag">已分配</span>
            <span>
              {{ applyResult.taskTitle }} → <strong>{{ applyResult.member }}</strong>
              · 饱和度 {{ applyResult.saturation }} / {{ SATURATION_MAX }}
            </span>
          </div>
          <div v-else-if="isDecompose" class="result muted">
            <span class="result-tag" data-state="waiting">等待分解</span>
            <span>任务分解专家完成后，第一个任务项将分配给 {{ TARGET_MEMBER }}，并同步到王处工作台。</span>
          </div>
          <div v-else class="result muted">
            <span class="result-tag" :data-state="finished ? 'done' : 'waiting'">
              {{ finished ? '已答复' : '问询中' }}
            </span>
            <span>{{ targetTask?.title }} · 负责人 {{ targetTask?.owner || '待分配' }}</span>
          </div>

          <form class="composer" @submit.prevent="askFollowUp">
            <textarea
              :value="draft"
              rows="2"
              :disabled="streaming"
              placeholder="继续追问，例如：这几个任务项先做哪个？需要谁配合？"
              @keydown.enter.exact.prevent="askFollowUp"
              @input="draft = ($event.target as HTMLTextAreaElement).value"
            />
            <button type="submit" :disabled="streaming || !draft.trim()">发送</button>
          </form>
        </footer>
      </section>
    </div>
  </div>
</template>

<style scoped>
.task-workspace {
  position: relative;
  height: 100vh;
  max-height: 100vh;
  overflow: hidden;
  background:
    radial-gradient(1000px 520px at 8% -8%, rgba(46, 196, 214, 0.2), transparent 58%),
    radial-gradient(820px 470px at 96% 4%, rgba(201, 168, 108, 0.14), transparent 52%),
    linear-gradient(168deg, #c5d8e6 0%, #e7f0f6 46%, #eef4f8 100%);
}

.atmosphere {
  pointer-events: none;
  position: absolute;
  inset: 0;
  z-index: 0;
}

.mesh {
  position: absolute;
  inset: -12%;
  background:
    conic-gradient(from 210deg at 28% 18%, rgba(46, 196, 214, 0.1), transparent 42%),
    conic-gradient(from 40deg at 76% 20%, rgba(201, 168, 108, 0.08), transparent 36%);
  filter: blur(10px);
}

.orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(48px);
}

.orb-a {
  width: 300px;
  height: 300px;
  top: 4%;
  left: 4%;
  background: radial-gradient(circle, rgba(46, 196, 214, 0.32), transparent 70%);
}

.orb-b {
  width: 260px;
  height: 260px;
  right: 6%;
  bottom: 8%;
  background: radial-gradient(circle, rgba(201, 168, 108, 0.26), transparent 70%);
}

.shell {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  max-width: 1120px;
  margin: 0 auto;
  padding: 18px clamp(16px, 3vw, 30px);
  box-sizing: border-box;
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
  padding: 7px 16px;
  border: 1px solid rgba(20, 40, 58, 0.12);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.62);
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
  color: #14304a;
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
  margin-bottom: 4px;
  font-family: var(--font-mono);
  font-size: 0.72rem;
  color: var(--color-accent);
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
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: calc(var(--radius-lg) + 2px);
  background:
    linear-gradient(160deg, rgba(255, 255, 255, 0.8), rgba(240, 248, 252, 0.54)),
    rgba(255, 255, 255, 0.36);
  backdrop-filter: blur(18px) saturate(1.2);
  box-shadow:
    var(--shadow-soft),
    inset 0 1px 0 rgba(255, 255, 255, 0.86);
  overflow: hidden;
}

.dialog-head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px 20px;
  padding: 16px 18px 14px;
  border-bottom: 1px solid rgba(20, 40, 58, 0.08);
  flex-shrink: 0;
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
  line-height: 1.6;
  color: var(--color-ink-muted);
}

.hint strong {
  color: var(--color-accent);
  font-weight: 600;
}

.ctx {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0;
}

.ctx div {
  display: flex;
  align-items: baseline;
  gap: 6px;
  padding: 6px 10px;
  border: 1px solid rgba(20, 40, 58, 0.1);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.72);
}

.ctx dt {
  font-size: 0.7rem;
  color: var(--color-ink-muted);
}

.ctx dd {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 0.86rem;
  font-weight: 700;
  color: var(--color-accent);
}

.ctx div[data-warn='true'] {
  border-color: rgba(184, 122, 53, 0.3);
  background: rgba(184, 122, 53, 0.08);
}

.ctx div[data-warn='true'] dd { color: var(--color-warn); }

.messages {
  flex: 1;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 18px;
}

.bubble {
  max-width: 92%;
  padding: 12px 14px;
  border: 1px solid rgba(20, 40, 58, 0.08);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.9);
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
  border-color: rgba(46, 196, 214, 0.24);
  background: rgba(46, 196, 214, 0.14);
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
}

.plain.muted { color: var(--color-ink-muted); }

.error {
  margin: 0;
  padding: 0 18px 10px;
  font-size: 0.84rem;
  color: var(--color-danger);
  flex-shrink: 0;
}

.dock {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 10px;
  padding: 12px 18px 14px;
  border-top: 1px solid rgba(20, 40, 58, 0.08);
  background: rgba(255, 255, 255, 0.4);
  flex-shrink: 0;
}

/* 底部输入框：与 /personal/task 一致 */
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

.composer textarea:disabled {
  opacity: 0.6;
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

.result {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.84rem;
  color: var(--color-ink);
}

.result.muted { color: var(--color-ink-muted); }

.result strong { color: var(--color-accent); }

.result-tag {
  padding: 2px 9px;
  border: 1px solid rgba(47, 125, 90, 0.3);
  border-radius: 999px;
  background: rgba(47, 125, 90, 0.1);
  color: var(--color-success);
  font-family: var(--font-mono);
  font-size: 0.68rem;
}

.result-tag[data-state='waiting'] {
  border-color: rgba(20, 40, 58, 0.14);
  background: rgba(20, 40, 58, 0.04);
  color: var(--color-ink-muted);
}

.result-tag[data-state='done'] {
  border-color: rgba(47, 125, 90, 0.3);
  background: rgba(47, 125, 90, 0.1);
  color: var(--color-success);
}

@media (max-width: 720px) {
  .composer {
    grid-template-columns: 1fr;
  }
}
</style>
