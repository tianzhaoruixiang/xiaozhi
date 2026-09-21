<script setup lang="ts">
import { computed } from 'vue'
import type { CollabStep, CollabStatus, PlanTaskItem, TaskPlan } from '../types/assistant'
import { buildPlanWaves, countParallelSlots } from '../utils/planWaves'
import AgentAvatar from './AgentAvatar.vue'

const props = defineProps<{
  plan: TaskPlan
  steps?: CollabStep[]
}>()

const emit = defineEmits<{
  select: [agentId: string]
}>()

const statusLabel: Record<CollabStatus | 'pending', string> = {
  pending: '待揭示',
  queued: '待命',
  running: '执行中',
  awaiting: '待确认',
  done: '完成',
  error: '失败',
}

const resolveStatus = (item: PlanTaskItem): CollabStatus | 'pending' => {
  if (!item.revealed) return 'pending'
  const step = props.steps?.find((s) => s.id === item.agentId)
  return step?.status ?? 'queued'
}

type GraphNode = PlanTaskItem & {
  status: CollabStatus | 'pending'
  shortRole: string
}

const waves = computed(() =>
  buildPlanWaves(props.plan.items ?? []).map((wave, waveIndex) => ({
    waveIndex,
    parallel: wave.length > 1,
    nodes: wave.map(
      (item): GraphNode => ({
        ...item,
        status: resolveStatus(item),
        shortRole: item.agentRole || item.title,
      }),
    ),
  })),
)

const agentCount = computed(
  () => waves.value.reduce((n, w) => n + w.nodes.length, 0),
)

const parallelWaves = computed(() => countParallelSlots(waves.value.map((w) => w.nodes)))

const allDone = computed(
  () =>
    agentCount.value > 0 &&
    waves.value.every((w) => w.nodes.every((n) => n.status === 'done')) &&
    (props.plan.phase === 'done' || props.plan.phase === 'executing'),
)

const waveActive = (waveIndex: number) => {
  const wave = waves.value[waveIndex]
  if (!wave) return false
  return wave.nodes.some(
    (n) => n.revealed || n.status === 'running' || n.status === 'done',
  )
}

const waveFlowing = (waveIndex: number) => {
  const wave = waves.value[waveIndex]
  const next = waves.value[waveIndex + 1]
  if (!wave) return false
  if (wave.nodes.some((n) => n.status === 'running')) return true
  if (next?.nodes.some((n) => n.status === 'running')) return true
  return false
}

const waveDone = (waveIndex: number) => {
  const wave = waves.value[waveIndex]
  return Boolean(wave?.nodes.length && wave.nodes.every((n) => n.status === 'done'))
}
</script>

<template>
  <div class="dag" :data-phase="plan.phase">
    <div class="dag-meta">
      <span class="meta-label">参与智能体</span>
      <strong>{{ agentCount }}</strong>
      <em>位 · {{ waves.length }} 波协作</em>
      <span v-if="parallelWaves" class="parallel-tag">{{ parallelWaves }} 处并行</span>
    </div>

    <div class="dag-scroll hud-scroll" role="img" :aria-label="`协作 DAG：${plan.goal || '多智能体任务'}`">
      <div class="dag-row">
        <div v-if="plan.goal" class="node goal" :class="{ active: agentCount > 0 }">
          <span class="tag">GOAL</span>
          <strong class="goal-text">{{ plan.goal }}</strong>
        </div>

        <div
          v-if="plan.goal && waves.length"
          class="edge"
          :class="{ active: waveActive(0) }"
          aria-hidden="true"
        >
          <span class="beam" />
          <span class="arrow" />
        </div>

        <template v-for="(wave, wi) in waves" :key="`wave-${wi}`">
          <div
            class="wave-col"
            :class="{ parallel: wave.parallel }"
            :data-wave="wi + 1"
          >
            <span v-if="wave.parallel" class="wave-label">并行</span>
            <span v-else class="wave-label soft">第 {{ wi + 1 }} 波</span>

            <div class="wave-stack">
              <button
                v-for="(node, ni) in wave.nodes"
                :key="node.agentId"
                type="button"
                class="node agent"
                :data-status="node.status"
                :data-agent="node.agentId"
                :class="{ revealed: node.revealed }"
                :style="{ animationDelay: `${(wi * 80) + (ni * 50)}ms` }"
                :title="
                  node.revealed
                    ? `查看 ${node.agentName} 的思考与执行过程`
                    : node.objective || node.title
                "
                :disabled="!node.revealed"
                @click="emit('select', node.agentId)"
              >
                <div class="node-top">
                  <AgentAvatar
                    :agent-id="node.agentId"
                    :name="node.agentName"
                    :status="node.status === 'pending' ? 'queued' : node.status"
                    :size="40"
                  />
                  <span class="badge">{{ statusLabel[node.status] }}</span>
                </div>
                <strong class="name">{{ node.agentName }}</strong>
                <em class="role">{{ node.shortRole }}</em>
                <p v-if="node.objective" class="desc">{{ node.objective }}</p>
                <span class="seq">
                  {{ node.index }}/{{ plan.total || agentCount }}
                  <template v-if="node.dependsOn?.length">
                    · 依赖 {{ node.dependsOn.length }}
                  </template>
                </span>
              </button>
            </div>
          </div>

          <div
            v-if="wi < waves.length - 1"
            class="edge"
            :class="{
              active: waveDone(wi) || waveActive(wi + 1),
              flowing: waveFlowing(wi),
              fork: wave.parallel || waves[wi + 1]?.parallel,
            }"
            aria-hidden="true"
          >
            <span class="beam" />
            <span class="arrow" />
          </div>
        </template>

        <template v-if="waves.length">
          <div
            class="edge"
            :class="{
              active: allDone || waveDone(waves.length - 1),
              flowing: plan.phase === 'executing' && !allDone,
            }"
            aria-hidden="true"
          >
            <span class="beam" />
            <span class="arrow" />
          </div>
          <div class="node sink" :class="{ active: allDone }">
            <span class="tag">OUT</span>
            <strong>{{ allDone ? '汇报就绪' : '等待汇聚' }}</strong>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dag {
  position: relative;
  z-index: 1;
  margin-top: 10px;
  display: grid;
  gap: 10px;
}

.dag-meta {
  display: flex;
  align-items: baseline;
  justify-content: center;
  flex-wrap: wrap;
  gap: 6px 8px;
  font-size: 0.72rem;
  color: var(--color-ink-muted);
}

.meta-label {
  font-family: var(--font-mono);
  letter-spacing: 0.1em;
  color: var(--color-accent);
}

.dag-meta strong {
  font-family: var(--font-mono);
  font-size: 0.92rem;
  color: var(--color-accent);
}

.dag-meta em {
  font-style: normal;
}

.parallel-tag {
  font-family: var(--font-mono);
  font-size: 0.68rem;
  letter-spacing: 0.04em;
  padding: 2px 7px;
  border-radius: 999px;
  color: #7a5a22;
  background: rgba(201, 168, 108, 0.14);
  border: 1px solid rgba(201, 168, 108, 0.4);
}

.dag-scroll {
  display: flex;
  justify-content: center;
  justify-content: safe center;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 10px 2px 14px;
  margin: 0 -2px;
  max-width: 100%;
  overscroll-behavior-x: contain;
}

.dag-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 0;
  width: max-content;
  min-width: max-content;
  margin-inline: auto;
  padding: 4px 0;
}

.wave-col {
  position: relative;
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 6px;
  min-width: 176px;
  padding: 18px 6px 4px;
  border-radius: 14px;
}

.wave-col.parallel {
  background: rgba(201, 168, 108, 0.08);
  border: 1px dashed rgba(201, 168, 108, 0.4);
  box-shadow: inset 0 0 20px rgba(201, 168, 108, 0.05);
}

.wave-label {
  position: absolute;
  top: 4px;
  left: 50%;
  transform: translateX(-50%);
  font-family: var(--font-mono);
  font-size: 0.58rem;
  letter-spacing: 0.1em;
  color: #8a6a2e;
  white-space: nowrap;
}

.wave-label.soft {
  color: var(--color-ink-muted);
}

.wave-stack {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: stretch;
}

.node {
  position: relative;
  z-index: 1;
  flex: 0 0 auto;
  isolation: isolate;
}

.node.goal,
.node.sink,
.node.agent.revealed {
  opacity: 1;
  transform: none;
  animation: node-in 640ms var(--ease-out);
}

.node.goal {
  width: 132px;
  min-height: 96px;
  padding: 10px 12px;
  border-radius: 12px;
  background:
    linear-gradient(135deg, rgba(201, 168, 108, 0.18), rgba(46, 196, 214, 0.08));
  border: 1px solid rgba(201, 168, 108, 0.4);
  box-shadow: 0 0 18px rgba(201, 168, 108, 0.1);
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.node.goal.active {
  border-color: rgba(201, 168, 108, 0.6);
}

.goal-text {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-size: 0.72rem;
  line-height: 1.4;
  font-weight: 600;
  color: var(--color-ink);
}

.node.agent {
  width: 176px;
  min-height: 148px;
  padding: 10px 12px 12px;
  border-radius: 12px;
  background: #fff;
  border: 1px solid rgba(20, 40, 58, 0.12);
  display: grid;
  gap: 5px;
  align-content: start;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  overflow: visible;
  box-shadow: 0 8px 20px rgba(20, 40, 58, 0.08);
  transition:
    border-color var(--dur-fast) var(--ease-soft),
    box-shadow var(--dur-fast) var(--ease-soft),
    background var(--dur-fast) var(--ease-soft);
}

.node.agent:hover:not(:disabled) {
  z-index: 2;
  background: #f7fbfd;
  border-color: rgba(46, 196, 214, 0.45);
}

.node.agent:focus-visible {
  outline: 2px solid rgba(201, 168, 108, 0.65);
  outline-offset: 2px;
  z-index: 2;
}

.node.agent:not(.revealed),
.node.agent:disabled:not(.revealed) {
  opacity: 0.55;
  filter: grayscale(0.25);
  transform: none;
  cursor: default;
  box-shadow: none;
}

.node-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.name {
  font-size: 0.8rem;
  font-weight: 650;
  line-height: 1.25;
  color: var(--color-ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.role {
  font-style: normal;
  font-size: 0.68rem;
  line-height: 1.35;
  color: var(--color-accent);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.desc {
  margin: 0;
  font-size: 0.68rem;
  line-height: 1.4;
  color: var(--color-ink-muted);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 2.8em;
}

.seq {
  font-family: var(--font-mono);
  font-size: 0.58rem;
  letter-spacing: 0.06em;
  color: var(--color-ink-muted);
}

.badge {
  font-family: var(--font-mono);
  font-size: 0.56rem;
  letter-spacing: 0.04em;
  padding: 2px 5px;
  border-radius: 4px;
  background: rgba(20, 40, 58, 0.06);
  color: var(--color-ink-muted);
  white-space: nowrap;
}

.tag {
  display: block;
  margin-bottom: 4px;
  font-family: var(--font-mono);
  font-size: 0.58rem;
  letter-spacing: 0.12em;
  color: #8a6a2e;
}

.node.sink {
  width: 92px;
  min-height: 96px;
  padding: 10px 11px;
  border-radius: 12px;
  background: rgba(47, 125, 90, 0.08);
  border: 1px dashed rgba(47, 125, 90, 0.32);
  text-align: center;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.node.sink .tag {
  color: var(--color-success);
}

.node.sink strong {
  display: block;
  font-size: 0.72rem;
  line-height: 1.35;
  font-weight: 600;
  color: var(--color-ink-muted);
}

.node.sink.active {
  border-style: solid;
  border-color: rgba(93, 202, 160, 0.5);
  box-shadow: 0 0 16px rgba(93, 202, 160, 0.14);
}

.node.sink.active strong {
  color: var(--color-success);
}

.agent[data-status='queued'] {
  border-style: dashed;
  border-color: rgba(26, 122, 146, 0.28);
}

.agent[data-status='running'] {
  z-index: 2;
  border-color: rgba(196, 163, 90, 0.55);
  box-shadow:
    inset 0 0 0 1px rgba(196, 163, 90, 0.1),
    0 0 18px rgba(196, 163, 90, 0.16);
}

.agent[data-status='running'] .badge {
  background: rgba(196, 163, 90, 0.2);
  color: #7a5a22;
  animation: blink 1.1s ease-in-out infinite;
}

.agent[data-status='done'] {
  border-color: rgba(93, 202, 160, 0.4);
}

.agent[data-status='done'] .badge {
  background: rgba(93, 202, 160, 0.16);
  color: var(--color-success);
}

.agent[data-status='error'] {
  border-color: rgba(168, 72, 72, 0.45);
}

.agent[data-status='error'] .badge {
  background: rgba(168, 72, 72, 0.18);
  color: var(--color-danger);
}

.edge {
  position: relative;
  z-index: 0;
  width: 44px;
  height: 14px;
  flex: 0 0 44px;
  align-self: center;
  display: flex;
  align-items: center;
  opacity: 0.3;
  transition: opacity var(--dur-mid) var(--ease-soft);
  pointer-events: none;
}

.edge.fork {
  width: 36px;
  flex-basis: 36px;
}

.edge.active {
  opacity: 1;
}

.beam {
  position: absolute;
  left: 0;
  right: 8px;
  height: 2px;
  border-radius: 999px;
  background: linear-gradient(
    90deg,
    rgba(94, 200, 232, 0.15),
    rgba(94, 200, 232, 0.55),
    rgba(94, 200, 232, 0.15)
  );
}

.edge.active .beam {
  background: linear-gradient(
    90deg,
    rgba(94, 200, 232, 0.25),
    rgba(126, 215, 239, 0.9),
    rgba(94, 200, 232, 0.25)
  );
  box-shadow: 0 0 8px rgba(94, 200, 232, 0.35);
}

.edge.flowing .beam::after {
  content: '';
  position: absolute;
  top: -2px;
  width: 8px;
  height: 6px;
  border-radius: 999px;
  background: #e8d5a3;
  box-shadow: 0 0 8px rgba(232, 213, 163, 0.8);
  animation: packet-x 1s linear infinite;
}

.arrow {
  position: absolute;
  right: 0;
  width: 0;
  height: 0;
  border-top: 5px solid transparent;
  border-bottom: 5px solid transparent;
  border-left: 6px solid rgba(94, 200, 232, 0.35);
}

.edge.active .arrow {
  border-left-color: rgba(126, 215, 239, 0.95);
}

@keyframes node-in {
  from {
    opacity: 0;
    transform: translate3d(0, 8px, 0);
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
}

@keyframes packet-x {
  from {
    left: 0;
    opacity: 0;
  }
  20% {
    opacity: 1;
  }
  80% {
    opacity: 1;
  }
  to {
    left: calc(100% - 8px);
    opacity: 0;
  }
}

@keyframes blink {
  50% {
    opacity: 0.5;
  }
}

@media (prefers-reduced-motion: reduce) {
  .node.goal,
  .node.sink,
  .node.agent.revealed,
  .edge.flowing .beam::after,
  .agent[data-status='running'] .badge {
    animation: none !important;
  }

  .node.goal,
  .node.sink,
  .node.agent.revealed,
  .node.agent:not(.revealed) {
    opacity: 1;
    transform: none;
  }
}
</style>
