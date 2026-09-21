<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import type { CollabStep, TaskPlan } from '../types/assistant'
import AgentAvatar from './AgentAvatar.vue'
import AgentThoughtChain from './AgentThoughtChain.vue'
import TaskPlanGraph from './TaskPlanGraph.vue'

const props = defineProps<{
  steps: CollabStep[]
  taskPlan?: TaskPlan | null
}>()

const statusText: Record<CollabStep['status'], string> = {
  queued: '待命',
  running: '执行中',
  done: '已完成',
  error: '失败',
}

/** DeerFlow 风格：默认折叠，展开后看 Chain of Thought */
const expanded = ref<Record<string, boolean>>({})
const highlightId = ref<string | null>(null)
const cardRefs = ref<Record<string, HTMLElement | null>>({})
const flipIndex = ref<Record<string, number>>({})
let flipTimer: number | undefined
let planAutoCollapseTimer: number | undefined

/**
 * 协同任务规划：规划生成/揭示时展开；
 * 首次完整展示完成后自动收起；之后可手动展开。
 */
const planManualOpen = ref<boolean | null>(null)
const planEverFullyShown = ref(false)

const planFullyRevealed = computed(() => {
  const plan = props.taskPlan
  if (!plan?.items?.length) return false
  const allRevealed = plan.items.every((i) => i.revealed)
  if (!allRevealed) return false
  // 规划项齐了，且已进入执行或完成，视为「第一次展示完成」
  return (
    plan.phase === 'executing' ||
    plan.phase === 'done' ||
    (plan.phase === 'ready' && props.steps.length > 0)
  )
})

const planOpen = computed(() => {
  if (planManualOpen.value !== null) return planManualOpen.value
  // 自动：尚未完整展示时展开；完整展示后收起
  if (planEverFullyShown.value) return false
  return true
})

const planCollapsedHint = computed(() => {
  const plan = props.taskPlan
  if (!plan) return '协同任务规划'
  if (plan.goal) return plan.goal
  if (plan.statusText) return plan.statusText
  if (plan.items?.length) {
    return `${plan.items.length} 位专家 · ${plan.items.map((i) => i.agentName).join('、')}`
  }
  return '协同任务规划'
})

const togglePlan = () => {
  planManualOpen.value = !planOpen.value
}

watch(planFullyRevealed, (ready, wasReady) => {
  if (!ready || wasReady || planEverFullyShown.value) return
  // 留一点时间看完流程图入场动画，再自动收起
  if (planAutoCollapseTimer) window.clearTimeout(planAutoCollapseTimer)
  planAutoCollapseTimer = window.setTimeout(() => {
    planEverFullyShown.value = true
    planManualOpen.value = null
  }, 1400)
})

watch(
  () => props.taskPlan?.phase,
  (phase) => {
    // 新一轮规划开始：重置，再次展开展示
    if (phase === 'planning') {
      planEverFullyShown.value = false
      planManualOpen.value = null
      if (planAutoCollapseTimer) {
        window.clearTimeout(planAutoCollapseTimer)
        planAutoCollapseTimer = undefined
      }
    }
  },
)

const phaseLabel = computed(() => {
  const phase = props.taskPlan?.phase
  if (phase === 'planning') return '规划生成中'
  if (phase === 'ready') return '规划揭示中'
  if (phase === 'executing') return '智能体执行中'
  if (phase === 'done') return '协同完成'
  return '协作台'
})

const runningCount = computed(
  () => props.steps.filter((s) => s.status === 'running').length,
)

const isExpanded = (step: CollabStep) => expanded.value[step.id] === true

const hasDetail = (step: CollabStep) =>
  Boolean(
    step.objective ||
      step.summary ||
      step.tools?.length ||
      step.logs?.length,
  )

/** 折叠态轮播：最近工具 / 思考（对齐 DeerFlow FlipDisplay） */
const activityLines = (step: CollabStep): string[] => {
  const lines: string[] = []
  const runningTool = [...(step.tools ?? [])].reverse().find((t) => t.status === 'running')
  if (runningTool) {
    lines.push(`正在调用：${runningTool.toolLabel}`)
    if (runningTool.summary) lines.push(runningTool.summary)
  }
  const doneTools = [...(step.tools ?? [])].filter((t) => t.status !== 'running').slice(-2)
  for (const t of doneTools) {
    lines.push(`${t.status === 'error' ? '失败' : '完成'}：${t.toolLabel}`)
  }
  const recentLogs = [...(step.logs ?? [])]
    .filter((l) => !/^(开始调用|调用完成|调用失败)/.test(l))
    .slice(-3)
  lines.push(...recentLogs)
  if (step.status === 'done' && step.summary) lines.push('已产出结果，点击查看完整过程')
  if (step.status === 'queued') lines.push('已登场，等待执行')
  if (!lines.length && step.status === 'running') lines.push('正在思考与落实任务…')
  if (!lines.length && step.objective) lines.push(step.objective)
  return [...new Set(lines)].slice(0, 6)
}

const peekText = (step: CollabStep) => {
  const lines = activityLines(step)
  if (!lines.length) return '点击展开思考与执行链'
  const idx = flipIndex.value[step.id] ?? 0
  return lines[idx % lines.length] ?? lines[0]
}

const toggle = (id: string) => {
  const step = props.steps.find((s) => s.id === id)
  if (!step || !hasDetail(step)) return
  expanded.value[id] = !isExpanded(step)
}

const openDetail = async (id: string) => {
  const step = props.steps.find((s) => s.id === id)
  if (!step) return
  if (hasDetail(step)) expanded.value[id] = true
  highlightId.value = id
  await nextTick()
  cardRefs.value[id]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  window.setTimeout(() => {
    if (highlightId.value === id) highlightId.value = null
  }, 1400)
}

const setCardRef = (id: string, el: unknown) => {
  cardRefs.value[id] = (el as HTMLElement | null) ?? null
}

const tickFlip = () => {
  for (const step of props.steps) {
    if (isExpanded(step)) continue
    const lines = activityLines(step)
    if (lines.length <= 1) continue
    flipIndex.value[step.id] = ((flipIndex.value[step.id] ?? 0) + 1) % lines.length
  }
}

watch(
  () =>
    props.steps
      .map((s) => `${s.id}:${s.status}:${s.logs?.length ?? 0}:${s.tools?.length ?? 0}`)
      .join('|'),
  () => {
    for (const step of props.steps) {
      const lines = activityLines(step)
      if (lines.length) flipIndex.value[step.id] = Math.max(0, lines.length - 1)
    }
  },
)

flipTimer = window.setInterval(tickFlip, 2800)
onUnmounted(() => {
  if (flipTimer) window.clearInterval(flipTimer)
  if (planAutoCollapseTimer) window.clearTimeout(planAutoCollapseTimer)
})
</script>

<template>
  <div class="rail">
    <div class="rail-head">
      <div>
        <h3>智能体协作</h3>
        <p class="phase">{{ phaseLabel }}</p>
      </div>
      <div class="head-meta">
        <span v-if="runningCount" class="live-badge">{{ runningCount }} 个执行中</span>
        <span v-if="steps.length" class="count">
          {{ steps.filter((s) => s.status === 'done').length }}/{{ steps.length }}
        </span>
      </div>
    </div>

    <section
      class="plan-board"
      :data-phase="taskPlan?.phase || 'idle'"
      :data-open="planOpen ? '1' : '0'"
    >
      <button
        type="button"
        class="plan-top"
        :aria-expanded="planOpen"
        @click="togglePlan"
      >
        <span class="plan-title">
          <strong>协同任务规划</strong>
          <em v-if="taskPlan?.phase === 'planning'" class="pulse-dot">生成中</em>
          <em v-else-if="taskPlan?.items?.length" class="graph-tag">流程</em>
        </span>
        <span class="plan-toggle" aria-hidden="true">
          {{ planOpen ? '收起' : '展开' }}
        </span>
      </button>

      <p v-if="!planOpen" class="plan-collapsed">{{ planCollapsedHint }}</p>

      <div v-show="planOpen" class="plan-body">
        <p v-if="taskPlan?.statusText" class="plan-status">{{ taskPlan.statusText }}</p>

        <div v-if="taskPlan?.phase === 'planning'" class="planning-lines" aria-hidden="true">
          <span /><span /><span />
        </div>

        <TaskPlanGraph
          v-else-if="taskPlan && (taskPlan.goal || taskPlan.items?.length)"
          :plan="taskPlan"
          :steps="steps"
          @select="openDetail"
        />

        <p v-else class="plan-empty">
          领导指示后，小智将动态生成专家团队，并以横向流程图展示。
        </p>
      </div>
    </section>

    <div class="agents-head">
      <h4>角色智能体</h4>
      <span v-if="!steps.length && taskPlan?.phase === 'planning'">等待规划完成…</span>
      <span v-else-if="!steps.length && taskPlan?.items?.length">即将依次登场</span>
      <span v-else>折叠看动态 · 展开看思考链</span>
    </div>

    <ol class="timeline">
      <li
        v-for="(step, index) in steps"
        :key="step.id"
        :ref="(el) => setCardRef(step.id, el)"
        class="card"
        :data-status="step.status"
        :class="{
          spawn: step.justSpawned,
          open: isExpanded(step),
          flash: highlightId === step.id,
        }"
        :style="{ animationDelay: `${index * 40}ms` }"
      >
        <div v-if="step.status === 'running'" class="shine" aria-hidden="true" />

        <button
          type="button"
          class="card-top"
          :aria-expanded="isExpanded(step)"
          :disabled="!hasDetail(step)"
          @click="toggle(step.id)"
        >
          <AgentAvatar
            :agent-id="step.id"
            :name="step.name"
            :status="step.status"
            :size="40"
          />
          <span class="identity">
            <strong :class="{ shimmer: step.status === 'running' && !isExpanded(step) }">
              {{ step.name }}
            </strong>
            <em>{{ step.title || step.role }}</em>
          </span>
          <span class="badge">
            <span v-if="step.status === 'running'" class="spin" aria-hidden="true" />
            {{ statusText[step.status] }}
          </span>
          <span v-if="hasDetail(step)" class="chevron" aria-hidden="true">
            {{ isExpanded(step) ? '▾' : '▸' }}
          </span>
        </button>

        <div v-if="!isExpanded(step) && hasDetail(step)" class="peek-row">
          <span class="peek-tag">{{ step.status === 'running' ? '动态' : '摘要' }}</span>
          <p class="peek" :key="`${step.id}-${flipIndex[step.id] ?? 0}`">{{ peekText(step) }}</p>
        </div>
        <p v-else-if="!hasDetail(step) && step.status === 'queued'" class="peek alone">
          已登场，等待执行
        </p>

        <div v-if="isExpanded(step)" class="detail">
          <div class="cot-head">
            <span>思考与执行链</span>
            <em v-if="step.tools?.length">{{ step.tools.length }} 次工具</em>
          </div>
          <AgentThoughtChain :step="step" />
          <p
            v-if="
              step.status === 'running' &&
              !step.logs?.length &&
              !step.tools?.length &&
              !step.summary &&
              !step.objective
            "
            class="hint"
          >
            正在思考与落实任务…
          </p>
        </div>
      </li>
    </ol>
  </div>
</template>

<style scoped>
.rail {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
  gap: 14px;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding-right: 4px;
  scrollbar-gutter: stable;
}

.rail-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
  position: sticky;
  top: 0;
  z-index: 3;
  background: linear-gradient(180deg, rgba(8, 20, 32, 0.96), rgba(8, 20, 32, 0.88));
  backdrop-filter: blur(8px);
}

.rail-head h3 {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.2rem;
  font-weight: 600;
}

.phase {
  margin: 4px 0 0;
  font-family: var(--font-mono);
  font-size: 0.76rem;
  letter-spacing: 0.1em;
  color: rgba(232, 213, 163, 0.85);
}

.head-meta {
  display: flex;
  align-items: center;
  gap: 10px;
}

.count {
  font-family: var(--font-mono);
  font-size: 0.88rem;
  color: rgba(237, 244, 248, 0.55);
  font-variant-numeric: tabular-nums;
}

.live-badge {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  letter-spacing: 0.04em;
  padding: 4px 8px;
  border-radius: 999px;
  color: var(--color-gold-soft);
  background: rgba(196, 163, 90, 0.16);
  border: 1px solid rgba(196, 163, 90, 0.35);
  animation: blink 1.2s ease-in-out infinite;
}

.plan-board {
  position: relative;
  border-radius: 16px;
  padding: 12px 14px 14px;
  background:
    linear-gradient(145deg, rgba(42, 180, 210, 0.12), rgba(196, 163, 90, 0.06)),
    rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(94, 200, 232, 0.22);
  overflow-x: auto;
  overflow-y: visible;
  flex-shrink: 0;
}

.plan-board::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(94, 200, 232, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(94, 200, 232, 0.04) 1px, transparent 1px);
  background-size: 16px 16px;
  pointer-events: none;
  opacity: 0.5;
}

.plan-board[data-phase='planning'] {
  border-color: rgba(232, 213, 163, 0.4);
  box-shadow: 0 0 24px rgba(196, 163, 90, 0.12);
}

.plan-top,
.plan-status,
.planning-lines,
.plan-empty,
.plan-collapsed,
.plan-body {
  position: relative;
  z-index: 1;
}

.plan-top {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  text-align: left;
}

.plan-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.plan-top strong {
  font-size: 0.86rem;
  letter-spacing: 0.06em;
}

.plan-toggle {
  flex-shrink: 0;
  font-family: var(--font-mono);
  font-size: 0.7rem;
  letter-spacing: 0.06em;
  padding: 3px 8px;
  border-radius: 999px;
  color: rgba(158, 216, 234, 0.9);
  border: 1px solid rgba(94, 200, 232, 0.28);
  background: rgba(8, 22, 36, 0.45);
}

.plan-top:hover .plan-toggle {
  border-color: rgba(94, 200, 232, 0.5);
  color: #9adce8;
}

.plan-board[data-open='0'] {
  padding-bottom: 12px;
}

.plan-collapsed {
  margin: 8px 0 0;
  font-size: 0.78rem;
  line-height: 1.45;
  color: rgba(237, 244, 248, 0.62);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.plan-body {
  margin-top: 2px;
}

.pulse-dot,
.graph-tag {
  font-style: normal;
  font-size: 0.72rem;
  color: var(--color-gold-soft);
}

.pulse-dot {
  animation: blink 1s ease-in-out infinite;
}

.graph-tag {
  font-family: var(--font-mono);
  letter-spacing: 0.12em;
  color: rgba(158, 216, 234, 0.85);
}

.plan-status {
  margin: 8px 0 0;
  font-size: 0.78rem;
  color: rgba(237, 244, 248, 0.62);
  line-height: 1.45;
}

.planning-lines {
  margin-top: 12px;
  display: grid;
  gap: 8px;
}

.planning-lines span {
  height: 8px;
  border-radius: 999px;
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.04),
    rgba(94, 200, 232, 0.28),
    rgba(255, 255, 255, 0.04)
  );
  background-size: 200% 100%;
  animation: shimmer-bar 1.4s linear infinite;
}

.planning-lines span:nth-child(2) {
  width: 82%;
  animation-delay: 0.15s;
}

.planning-lines span:nth-child(3) {
  width: 64%;
  animation-delay: 0.3s;
}

.plan-empty {
  margin: 10px 0 0;
  font-size: 0.78rem;
  color: rgba(237, 244, 248, 0.45);
}

.agents-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  flex-shrink: 0;
}

.agents-head h4 {
  margin: 0;
  font-size: 0.92rem;
  letter-spacing: 0.08em;
  color: rgba(237, 244, 248, 0.88);
}

.agents-head span {
  font-size: 0.78rem;
  color: rgba(237, 244, 248, 0.45);
}

.timeline {
  list-style: none;
  margin: 0;
  padding: 0 2px 28px 0;
  overflow: visible;
  display: grid;
  gap: 14px;
  flex: 0 0 auto;
  isolation: isolate;
}

.card {
  position: relative;
  z-index: 0;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.12);
  overflow: hidden;
  transform-origin: 50% 0%;
  transition:
    border-color var(--dur-mid) var(--ease-soft),
    box-shadow var(--dur-mid) var(--ease-soft),
    background var(--dur-mid) var(--ease-soft);
}

.card.spawn {
  animation: soft-enter 720ms var(--ease-out) both;
}

.card.open,
.card.flash,
.card[data-status='running'] {
  z-index: 1;
}

.card.open {
  border-color: rgba(94, 200, 232, 0.28);
  background: rgba(255, 255, 255, 0.06);
}

.card.flash {
  box-shadow: 0 0 0 1px rgba(232, 213, 163, 0.55), 0 0 28px rgba(196, 163, 90, 0.2);
}

.card[data-status='running'] {
  border-color: rgba(196, 163, 90, 0.48);
  box-shadow:
    inset 0 0 0 1px rgba(196, 163, 90, 0.1),
    0 0 22px rgba(196, 163, 90, 0.12);
}

.card[data-status='done'] {
  border-color: rgba(93, 202, 160, 0.28);
}

.card[data-status='queued'] {
  border-style: dashed;
}

.shine {
  pointer-events: none;
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(
    110deg,
    transparent 30%,
    rgba(232, 213, 163, 0.12) 48%,
    transparent 66%
  );
  background-size: 220% 100%;
  animation: shine-sweep 2.4s ease-in-out infinite;
}

.card-top {
  position: relative;
  z-index: 1;
  width: 100%;
  display: grid;
  grid-template-columns: auto 1fr auto auto;
  gap: 12px;
  align-items: center;
  padding: 14px 16px;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition: background var(--dur-fast) var(--ease-soft);
}

.card-top:hover:not(:disabled) {
  background: rgba(94, 200, 232, 0.06);
}

.card-top:disabled {
  cursor: default;
}

.identity {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.identity strong {
  font-size: 1.02rem;
}

.identity em {
  font-style: normal;
  font-size: 0.8rem;
  color: rgba(237, 244, 248, 0.55);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.76rem;
  letter-spacing: 0.04em;
  padding: 5px 9px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(237, 244, 248, 0.7);
  white-space: nowrap;
}

.card[data-status='running'] .badge {
  background: rgba(196, 163, 90, 0.18);
  color: var(--color-gold-soft);
}

.card[data-status='done'] .badge {
  background: rgba(93, 202, 160, 0.16);
  color: #9be4c4;
}

.spin {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  border: 1.5px solid rgba(232, 213, 163, 0.35);
  border-top-color: #e8d5a3;
  animation: spin 0.8s linear infinite;
}

.chevron {
  font-size: 0.85rem;
  color: rgba(158, 216, 234, 0.75);
  width: 1.2em;
  text-align: center;
}

.peek-row {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 8px;
  align-items: start;
  padding: 0 16px 14px;
}

.peek-tag {
  font-family: var(--font-mono);
  font-size: 0.64rem;
  letter-spacing: 0.08em;
  padding: 3px 6px;
  border-radius: 4px;
  color: rgba(158, 216, 234, 0.85);
  background: rgba(94, 200, 232, 0.1);
  border: 1px solid rgba(94, 200, 232, 0.22);
  margin-top: 1px;
}

.peek {
  margin: 0;
  font-size: 0.84rem;
  line-height: 1.45;
  color: rgba(237, 244, 248, 0.62);
  animation: soft-fade 280ms var(--ease-out) both;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.peek.alone {
  padding: 0 16px 14px;
  color: rgba(237, 244, 248, 0.48);
}

.detail {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 10px;
  padding: 0 16px 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  animation: soft-fade 320ms var(--ease-out) both;
}

.cot-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  padding-top: 12px;
}

.cot-head span {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  letter-spacing: 0.1em;
  color: rgba(158, 216, 234, 0.85);
}

.cot-head em {
  font-style: normal;
  font-size: 0.72rem;
  color: rgba(237, 244, 248, 0.45);
}

.hint {
  margin: 0;
  font-size: 0.86rem;
  color: rgba(237, 244, 248, 0.5);
}

.shimmer {
  background: linear-gradient(
    90deg,
    rgba(232, 213, 163, 0.5),
    rgba(255, 248, 220, 1),
    rgba(232, 213, 163, 0.5)
  );
  background-size: 200% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  animation: shimmer-text 1.6s linear infinite;
}

@keyframes soft-enter {
  0% {
    opacity: 0;
    transform: translate3d(0, 10px, 0);
  }
  100% {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
}

@keyframes soft-fade {
  from {
    opacity: 0;
    transform: translate3d(0, 4px, 0);
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
}

@keyframes shimmer-bar {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

@keyframes shimmer-text {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

@keyframes shine-sweep {
  0% { background-position: 120% 0; }
  100% { background-position: -120% 0; }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes blink {
  50% { opacity: 0.45; }
}

@media (prefers-reduced-motion: reduce) {
  .shine,
  .shimmer,
  .spin,
  .live-badge,
  .pulse-dot,
  .planning-lines span {
    animation: none !important;
  }

  .shimmer {
    color: var(--color-gold-soft);
    background: none;
    -webkit-background-clip: unset;
    background-clip: unset;
  }
}
</style>
