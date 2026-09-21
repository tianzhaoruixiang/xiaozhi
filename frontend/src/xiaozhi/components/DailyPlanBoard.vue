<script setup lang="ts">
import type { PlanItem } from '../data/mockPlans'
import PlanItemCard from './PlanItem.vue'

defineProps<{
  plans: PlanItem[]
}>()
</script>

<template>
  <section class="board" aria-label="今日计划">
    <div class="board-glow" aria-hidden="true" />

    <div class="board-head">
      <div class="title-wrap">
        <h2>今日计划</h2>
        <p class="sub">按时间顺序推进</p>
      </div>
      <div class="count">
        <strong>{{ plans.length }}</strong>
        <span>项</span>
      </div>
    </div>

    <div class="spine" aria-hidden="true" />

    <ol class="timeline">
      <PlanItemCard
        v-for="(plan, index) in plans"
        :key="plan.id"
        :plan="plan"
        :index="index + 1"
      />
    </ol>
  </section>
</template>

<style scoped>
.board {
  position: relative;
  background:
    linear-gradient(150deg, rgba(255, 255, 255, 0.72), rgba(240, 248, 252, 0.55)),
    rgba(255, 255, 255, 0.35);
  backdrop-filter: blur(20px) saturate(1.25);
  border: 1px solid rgba(255, 255, 255, 0.7);
  border-radius: calc(var(--radius-lg) + 2px);
  box-shadow:
    var(--shadow-soft),
    inset 0 1px 0 rgba(255, 255, 255, 0.8),
    0 0 0 1px rgba(46, 196, 214, 0.06);
  padding: clamp(22px, 3.2vw, 32px);
  overflow: hidden;
  animation: page-rise var(--dur-enter) var(--ease-out) 160ms both;
}

.board-glow {
  position: absolute;
  inset: -20% auto auto -10%;
  width: 55%;
  height: 50%;
  background: radial-gradient(circle, rgba(46, 196, 214, 0.12), transparent 70%);
  pointer-events: none;
}

.board-head {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 22px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(26, 122, 146, 0.12);
}

.title-wrap h2 {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(1.45rem, 3vw, 1.75rem);
  font-weight: 600;
  letter-spacing: 0.03em;
}

.sub {
  margin: 6px 0 0;
  font-size: 0.86rem;
  color: var(--color-ink-muted);
}

.count {
  display: flex;
  align-items: baseline;
  gap: 4px;
  padding: 8px 14px;
  border-radius: 12px;
  background: rgba(6, 20, 31, 0.04);
  border: 1px solid rgba(46, 196, 214, 0.18);
}

.count strong {
  font-family: var(--font-mono);
  font-size: 1.35rem;
  color: var(--color-accent);
  font-variant-numeric: tabular-nums;
}

.count span {
  font-size: 0.8rem;
  color: var(--color-ink-muted);
}

.spine {
  position: absolute;
  z-index: 0;
  left: calc(clamp(22px, 3.2vw, 32px) + 22px);
  top: 108px;
  bottom: 32px;
  width: 2px;
  background: linear-gradient(
    180deg,
    rgba(46, 196, 214, 0.5),
    rgba(46, 196, 214, 0.12),
    transparent
  );
  border-radius: 999px;
  pointer-events: none;
}

.timeline {
  position: relative;
  z-index: 1;
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 14px;
}

@media (max-width: 640px) {
  .spine {
    display: none;
  }
}
</style>
