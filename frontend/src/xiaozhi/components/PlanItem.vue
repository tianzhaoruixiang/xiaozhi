<script setup lang="ts">
import type { PlanItem } from '../data/mockPlans'

defineProps<{
  plan: PlanItem
  index?: number
}>()

const priorityLabel: Record<PlanItem['priority'], string> = {
  high: '高优',
  medium: '常规',
  low: '弹性',
}

const statusLabel: Record<PlanItem['status'], string> = {
  todo: '待办',
  doing: '进行中',
  done: '已完成',
}
</script>

<template>
  <li
    class="item"
    :data-status="plan.status"
    :data-priority="plan.priority"
    :style="{ animationDelay: `${(index ?? 1) * 70}ms` }"
  >
    <div class="node" aria-hidden="true">
      <span class="node-core" />
    </div>
    <div class="time">{{ plan.time }}</div>
    <div class="body">
      <div class="title-row">
        <h3>{{ plan.title }}</h3>
        <span class="mark priority">{{ priorityLabel[plan.priority] }}</span>
        <span class="mark status">{{ statusLabel[plan.status] }}</span>
      </div>
      <p>{{ plan.detail }}</p>
    </div>
  </li>
</template>

<style scoped>
.item {
  position: relative;
  display: grid;
  grid-template-columns: 18px 76px 1fr;
  gap: 12px 16px;
  padding: 16px 18px 16px 8px;
  border-radius: var(--radius-md);
  background: transparent;
  border: 1px solid transparent;
  border-bottom: 1px solid rgba(20, 40, 58, 0.06);
  transition:
    background var(--dur-mid) var(--ease-soft),
    border-color var(--dur-mid) var(--ease-soft),
    transform var(--dur-mid) var(--ease-out);
  animation: page-rise var(--dur-enter) var(--ease-out) both;
}

.item:hover {
  background: rgba(255, 255, 255, 0.45);
  border-color: rgba(46, 196, 214, 0.16);
  transform: translate3d(6px, 0, 0);
}

.item[data-status='doing'] {
  background:
    linear-gradient(120deg, rgba(46, 196, 214, 0.1), rgba(255, 255, 255, 0.35));
  border-color: rgba(46, 196, 214, 0.22);
}

.node {
  display: grid;
  place-items: start center;
  padding-top: 7px;
}

.node-core {
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, #fff, var(--color-signal) 55%, #1a7a92);
  box-shadow:
    0 0 0 4px rgba(46, 196, 214, 0.12),
    0 0 12px rgba(46, 196, 214, 0.4);
}

.time {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  font-size: 0.95rem;
  color: var(--color-accent);
  padding-top: 3px;
}

.title-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

h3 {
  margin: 0;
  font-size: 1.06rem;
  font-weight: 600;
  letter-spacing: 0.01em;
}

p {
  margin: 0;
  color: var(--color-ink-muted);
  line-height: 1.6;
  font-size: 0.94rem;
}

.mark {
  font-family: var(--font-mono);
  font-size: 0.66rem;
  letter-spacing: 0.04em;
  padding: 3px 8px;
  border-radius: 6px;
  border: 1px solid transparent;
}

.priority {
  color: var(--color-abyss);
  background: rgba(201, 168, 108, 0.16);
  border-color: rgba(201, 168, 108, 0.32);
}

.item[data-priority='high'] .priority {
  background: rgba(168, 72, 72, 0.1);
  border-color: rgba(168, 72, 72, 0.26);
  color: var(--color-danger);
}

.status {
  color: var(--color-ink-muted);
  background: rgba(20, 40, 58, 0.04);
  border-color: rgba(20, 40, 58, 0.08);
}

.item[data-status='doing'] .status {
  color: var(--color-accent);
  background: rgba(26, 122, 146, 0.1);
  border-color: rgba(46, 196, 214, 0.28);
}

.item[data-status='doing'] .node-core {
  animation: status-blink 1.6s ease-in-out infinite;
}

.item[data-status='done'] {
  opacity: 0.68;
}

.item[data-status='done'] .status {
  color: var(--color-success);
  background: rgba(47, 125, 90, 0.1);
  border-color: rgba(47, 125, 90, 0.2);
}

.item[data-status='done'] .node-core {
  background: radial-gradient(circle at 30% 30%, #fff, #5dcaa0 60%, #2f7d5a);
  box-shadow:
    0 0 0 4px rgba(47, 125, 90, 0.1),
    0 0 8px rgba(47, 125, 90, 0.28);
}

@media (max-width: 640px) {
  .item {
    grid-template-columns: 18px 1fr;
    gap: 4px 12px;
  }

  .time,
  .body {
    grid-column: 2;
  }
}
</style>
