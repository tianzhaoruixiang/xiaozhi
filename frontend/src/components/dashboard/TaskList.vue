<template>
  <PanelFrame title="任务执行清单">
    <template #extra>
      <span class="panel-badge">销号 {{ summary.done }}/{{ summary.total }}</span>
    </template>

    <div class="tasks-layout">
      <div class="summary-row">
        <div class="ring-box">
          <svg viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="3" />
            <circle
              cx="18"
              cy="18"
              r="15.5"
              fill="none"
              stroke="var(--cyan)"
              stroke-width="3"
              stroke-linecap="round"
              :stroke-dasharray="`${doneRate} ${100 - doneRate}`"
              stroke-dashoffset="25"
              transform="rotate(-90 18 18)"
            />
            <text x="18" y="19.5" text-anchor="middle" fill="#fff" font-size="8" font-weight="700">
              {{ doneRate }}%
            </text>
          </svg>
          <span>销号进度</span>
        </div>
        <div class="summary-nums">
          <div class="stat-card doing">
            <em>{{ summary.doing }}</em>
            <span>推进中</span>
          </div>
          <div class="stat-card done">
            <em>{{ summary.done }}</em>
            <span>已完成</span>
          </div>
          <div class="stat-card pending">
            <em>{{ summary.pending }}</em>
            <span>待完成</span>
          </div>
        </div>
      </div>

      <ul class="task-list">
        <li v-for="task in tasks" :key="task.id">
          <div class="row">
            <strong>{{ task.group }} · {{ task.title }}</strong>
            <span class="tag" :class="statusClass(task.status)">{{ task.status }}</span>
          </div>
          <div class="progress-row">
            <div class="progress"><i :style="{ width: `${task.progress}%` }" /></div>
            <span>{{ task.progress }}%</span>
          </div>
        </li>
      </ul>
    </div>
  </PanelFrame>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TaskItem, TaskStatus } from '../../types/dashboard'
import PanelFrame from './PanelFrame.vue'

const props = defineProps<{
  tasks: TaskItem[]
  summary: { total: number; done: number; doing: number; pending: number }
}>()

const doneRate = computed(() =>
  props.summary.total ? Math.round((props.summary.done / props.summary.total) * 100) : 0,
)

function statusClass(status: TaskStatus) {
  if (status === '已完成') return 'done'
  if (status === '待处置') return 'pending'
  return 'doing'
}
</script>

<style scoped>
.tasks-layout {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.summary-row {
  display: flex;
  gap: 12px;
  align-items: center;
}

.ring-box {
  width: 84px;
  text-align: center;
  font-size: 12px;
  color: var(--text-dim);
}

.ring-box svg {
  width: 72px;
  height: 72px;
  display: block;
  margin: 0 auto 2px;
  filter: drop-shadow(0 0 6px oklch(0.84 0.145 207 / .28));
}

.summary-nums {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.stat-card {
  position: relative;
  padding: 10px 6px 8px;
  text-align: center;
  overflow: hidden;
  border: 1px solid transparent;
}

.stat-card::before {
  content: "";
  position: absolute;
  inset: 0;
  opacity: 0.9;
  pointer-events: none;
}

.stat-card.doing {
  border-color: oklch(0.84 0.145 207 / .38);
  background:
    linear-gradient(160deg, oklch(0.5 0.11 220 / .22), oklch(0.2 0.065 248 / .46)),
    oklch(0.22 0.075 245 / .42);
  box-shadow: inset 0 0 16px oklch(0.7 0.14 215 / .1);
}

.stat-card.done {
  border-color: oklch(0.79 0.17 162 / .38);
  background:
    linear-gradient(160deg, oklch(0.56 0.11 162 / .18), oklch(0.2 0.055 170 / .44)),
    oklch(0.22 0.065 170 / .38);
  box-shadow: inset 0 0 16px oklch(0.79 0.17 162 / .08);
}

.stat-card.pending {
  border-color: oklch(0.82 0.16 83 / .38);
  background:
    linear-gradient(160deg, oklch(0.62 0.1 83 / .18), oklch(0.2 0.045 72 / .44)),
    oklch(0.22 0.055 72 / .38);
  box-shadow: inset 0 0 16px oklch(0.82 0.16 83 / .08);
}

.stat-card em {
  position: relative;
  display: block;
  font-style: normal;
  font-size: 24px;
  font-weight: 700;
  line-height: 1.1;
  font-family: var(--font-display);
  letter-spacing: 0.03em;
}

.stat-card.doing em { color: var(--cyan); text-shadow: 0 0 10px oklch(0.84 0.145 207 / .28); }
.stat-card.done em { color: var(--green); text-shadow: 0 0 10px oklch(0.79 0.17 162 / .28); }
.stat-card.pending em { color: var(--amber); text-shadow: 0 0 10px oklch(0.82 0.16 83 / .28); }

.stat-card span {
  position: relative;
  display: block;
  margin-top: 4px;
  font-size: 12px;
  letter-spacing: 0.06em;
  color: var(--muted);
}

.task-list {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.task-list li {
  padding: 8px 4px;
  border-bottom: 1px solid oklch(0.84 0.145 207 / .12);
}

.row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
  font-size: 13px;
}

.progress-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-dim);
}

.progress-row .progress {
  flex: 1;
}
</style>
