<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { ChatMessage, CollabStep } from '../types/assistant'
import AgentAvatar from './AgentAvatar.vue'
import AgentThoughtChain from './AgentThoughtChain.vue'

const props = defineProps<{
  message: ChatMessage
  /** 当前轮是否仍在流式输出 */
  live?: boolean
}>()

const statusText: Record<CollabStep['status'], string> = {
  queued: '待命',
  running: '执行中',
  done: '已完成',
  error: '失败',
}

const steps = computed(() => props.message.steps ?? [])
const plan = computed(() => props.message.taskPlan ?? null)

const hasProcess = computed(() => {
  const p = plan.value
  return steps.value.length > 0 || Boolean(p && p.phase !== 'idle')
})

const allDone = computed(() => {
  if (!steps.value.length) {
    return plan.value?.phase === 'done' && !props.live
  }
  return (
    steps.value.every((s) => s.status === 'done' || s.status === 'error') &&
    !props.live
  )
})

const runningCount = computed(
  () => steps.value.filter((s) => s.status === 'running').length,
)

const doneCount = computed(
  () => steps.value.filter((s) => s.status === 'done').length,
)

/** 用户手动展开/收起；null 表示跟随自动逻辑 */
const manualOpen = ref<boolean | null>(null)

const open = computed(() => {
  if (manualOpen.value !== null) return manualOpen.value
  // 执行中自动展开，完成后自动收起
  return !allDone.value
})

watch(allDone, (done, wasDone) => {
  if (done && !wasDone) {
    // 刚完成：强制回到自动收起
    manualOpen.value = null
  }
})

const toggle = () => {
  manualOpen.value = !open.value
}

const expertOpen = ref<Record<string, boolean>>({})

const isExpertOpen = (id: string) => expertOpen.value[id] === true

const toggleExpert = (id: string) => {
  expertOpen.value = {
    ...expertOpen.value,
    [id]: !expertOpen.value[id],
  }
}

const phaseLabel = computed(() => {
  if (allDone.value) return '协同完成'
  const phase = plan.value?.phase
  if (phase === 'planning') return '规划中'
  if (phase === 'ready') return '规划就绪'
  if (phase === 'executing' || runningCount.value) return '专家执行中'
  if (props.live) return '进行中'
  return '协同过程'
})

const summaryLine = computed(() => {
  if (plan.value?.goal) return plan.value.goal
  if (plan.value?.statusText) return plan.value.statusText
  if (steps.value.length) {
    return steps.value.map((s) => s.name).join('、')
  }
  return '多智能体协同'
})
</script>

<template>
  <div v-if="hasProcess" class="process" :data-open="open ? '1' : '0'" :data-done="allDone ? '1' : '0'">
    <button type="button" class="process-toggle" :aria-expanded="open" @click="toggle">
      <span class="toggle-left">
        <span class="pulse" :class="{ live: !allDone }" aria-hidden="true" />
        <strong>小智执行过程</strong>
        <em>{{ phaseLabel }}</em>
      </span>
      <span class="toggle-right">
        <span v-if="steps.length" class="count">{{ doneCount }}/{{ steps.length }}</span>
        <span class="chevron" aria-hidden="true">{{ open ? '收起' : '展开' }}</span>
      </span>
    </button>

    <p v-if="!open" class="collapsed-hint">{{ summaryLine }}</p>

    <div v-show="open" class="process-body">
      <p v-if="plan?.goal || plan?.statusText" class="goal">
        <template v-if="plan.goal">{{ plan.goal }}</template>
        <span v-if="plan.statusText" class="status">{{ plan.statusText }}</span>
      </p>

      <ol v-if="steps.length" class="experts">
        <li
          v-for="step in steps"
          :key="step.id"
          class="expert"
          :data-status="step.status"
          :data-open="isExpertOpen(step.id) ? '1' : '0'"
        >
          <button
            type="button"
            class="expert-top"
            :aria-expanded="isExpertOpen(step.id)"
            @click="toggleExpert(step.id)"
          >
            <AgentAvatar
              :agent-id="step.id"
              :name="step.name"
              :status="step.status"
              :size="32"
            />
            <span class="meta">
              <strong>{{ step.name }}</strong>
              <em>{{ step.title || step.role }}</em>
            </span>
            <span class="badge">{{ statusText[step.status] }}</span>
            <span class="exp-chevron" aria-hidden="true">
              {{ isExpertOpen(step.id) ? '▾' : '▸' }}
            </span>
          </button>

          <div v-if="isExpertOpen(step.id)" class="expert-detail">
            <p v-if="step.objective" class="objective">{{ step.objective }}</p>
            <AgentThoughtChain :step="step" tone="light" />
            <div v-if="step.summary && step.status === 'done'" class="result">
              <strong>产出</strong>
              <p>{{ step.summary }}</p>
            </div>
          </div>
        </li>
      </ol>

      <p v-else-if="plan?.phase === 'planning'" class="wait">正在生成专家团队…</p>
      <p v-else class="wait">等待专家登场…</p>
    </div>
  </div>
</template>

<style scoped>
.process {
  margin: 0 0 10px;
  border-radius: 12px;
  border: 1px solid rgba(26, 122, 146, 0.22);
  background:
    linear-gradient(160deg, rgba(46, 196, 214, 0.08), rgba(255, 255, 255, 0.55));
  overflow: hidden;
}

.process[data-done='1'] {
  border-color: rgba(20, 40, 58, 0.1);
  background: rgba(6, 20, 31, 0.03);
}

.process-toggle {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
  border: 0;
  background: transparent;
  cursor: pointer;
  color: inherit;
  text-align: left;
}

.toggle-left,
.toggle-right {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.pulse {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(20, 40, 58, 0.25);
  flex-shrink: 0;
}

.pulse.live {
  background: var(--color-accent);
  box-shadow: 0 0 0 0 rgba(46, 196, 214, 0.45);
  animation: live-pulse 1.4s ease-out infinite;
}

@keyframes live-pulse {
  70% {
    box-shadow: 0 0 0 8px rgba(46, 196, 214, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(46, 196, 214, 0);
  }
}

.toggle-left strong {
  font-size: 0.88rem;
  color: #14304a;
}

.toggle-left em {
  font-style: normal;
  font-family: var(--font-mono);
  font-size: 0.68rem;
  letter-spacing: 0.04em;
  padding: 2px 7px;
  border-radius: 999px;
  color: var(--color-accent);
  background: rgba(46, 196, 214, 0.12);
  border: 1px solid rgba(46, 196, 214, 0.25);
}

.process[data-done='1'] .toggle-left em {
  color: var(--color-ink-muted);
  background: rgba(20, 40, 58, 0.05);
  border-color: rgba(20, 40, 58, 0.1);
}

.count {
  font-family: var(--font-mono);
  font-size: 0.78rem;
  color: var(--color-ink-muted);
}

.chevron {
  font-size: 0.78rem;
  color: var(--color-accent);
}

.collapsed-hint {
  margin: 0;
  padding: 0 12px 10px;
  font-size: 0.82rem;
  line-height: 1.45;
  color: var(--color-ink-muted);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.process-body {
  padding: 0 12px 12px;
  border-top: 1px solid rgba(20, 40, 58, 0.06);
}

.goal {
  margin: 10px 0 0;
  font-size: 0.86rem;
  line-height: 1.5;
  color: #14304a;
}

.goal .status {
  display: block;
  margin-top: 4px;
  font-size: 0.78rem;
  color: var(--color-ink-muted);
}

.experts {
  list-style: none;
  margin: 10px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.expert {
  border-radius: 10px;
  border: 1px solid rgba(20, 40, 58, 0.08);
  background: rgba(255, 255, 255, 0.72);
  overflow: hidden;
}

.expert[data-status='running'] {
  border-color: rgba(46, 196, 214, 0.35);
}

.expert[data-status='done'] {
  border-color: rgba(26, 122, 146, 0.2);
}

.expert[data-status='error'] {
  border-color: rgba(168, 72, 72, 0.35);
}

.expert-top {
  width: 100%;
  display: grid;
  grid-template-columns: auto 1fr auto auto;
  gap: 8px;
  align-items: center;
  padding: 8px 10px;
  border: 0;
  background: transparent;
  cursor: pointer;
  text-align: left;
  color: inherit;
}

.meta {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.meta strong {
  font-size: 0.86rem;
  color: #14304a;
}

.meta em {
  font-style: normal;
  font-size: 0.72rem;
  color: var(--color-ink-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.badge {
  font-family: var(--font-mono);
  font-size: 0.64rem;
  letter-spacing: 0.04em;
  padding: 2px 7px;
  border-radius: 6px;
  color: var(--color-ink-muted);
  background: rgba(20, 40, 58, 0.04);
  border: 1px solid rgba(20, 40, 58, 0.08);
}

.expert[data-status='running'] .badge {
  color: var(--color-accent);
  background: rgba(26, 122, 146, 0.1);
  border-color: rgba(46, 196, 214, 0.28);
}

.expert[data-status='done'] .badge {
  color: #1a7a5c;
  background: rgba(26, 122, 92, 0.08);
  border-color: rgba(26, 122, 92, 0.22);
}

.exp-chevron {
  font-size: 0.78rem;
  color: var(--color-ink-muted);
}

.expert-detail {
  padding: 0 10px 10px;
  border-top: 1px dashed rgba(20, 40, 58, 0.08);
}

.objective {
  margin: 8px 0;
  font-size: 0.8rem;
  line-height: 1.45;
  color: var(--color-ink-muted);
}

.result {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(20, 40, 58, 0.06);
}

.result strong {
  display: block;
  font-size: 0.72rem;
  color: var(--color-accent);
  margin-bottom: 4px;
}

.result p {
  margin: 0;
  font-size: 0.82rem;
  line-height: 1.5;
  color: #14304a;
  white-space: pre-wrap;
  display: -webkit-box;
  -webkit-line-clamp: 8;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.wait {
  margin: 10px 0 0;
  font-size: 0.84rem;
  color: var(--color-ink-muted);
}

/* 浅色气泡里思考链可读性 */
.expert-detail :deep(.md) {
  color: #14304a;
}
</style>
