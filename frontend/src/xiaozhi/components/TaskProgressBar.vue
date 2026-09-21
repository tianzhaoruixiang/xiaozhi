<script setup lang="ts">
import { computed } from 'vue'
import { STATUS_META, type TaskStatus } from '../data/groupTasks'

const props = withDefaults(
  defineProps<{
    progress: number
    status: TaskStatus
    compact?: boolean
    /** 是否在进度条右侧显示百分比 */
    showValue?: boolean
  }>(),
  {
    compact: false,
    showValue: true,
  },
)

const value = computed(() => Math.max(0, Math.min(100, Math.round(props.progress))))
const label = computed(() => STATUS_META[props.status].label)
</script>

<template>
  <div class="track-wrap" :class="{ compact }">
    <div class="track" :data-status="status" :aria-label="`${label} ${value}%`">
      <span class="fill" :style="{ width: `${value}%` }" />
    </div>
    <span v-if="showValue" class="value" :data-status="status">{{ value }}%</span>
  </div>
</template>

<style scoped>
.track-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.track {
  position: relative;
  flex: 1;
  min-width: 60px;
  height: 6px;
  border-radius: 999px;
  background: rgba(20, 40, 58, 0.09);
  border: 1px solid rgba(20, 40, 58, 0.1);
  overflow: hidden;
}

.track-wrap.compact .track {
  height: 5px;
}

.fill {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #2ec4d6, #1a7a92);
  transition: width var(--dur-mid) var(--ease-out);
}

.track[data-status='done'] .fill {
  background: linear-gradient(90deg, #4fae86, #2f7d5a);
}

.track[data-status='risk'] .fill {
  background: linear-gradient(90deg, #c96f6f, #a84848);
}

.track[data-status='todo'] .fill {
  background: linear-gradient(90deg, #d8b878, #b87a35);
}

.value {
  flex-shrink: 0;
  min-width: 2.6rem;
  text-align: right;
  font-family: var(--font-mono);
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--color-accent);
}

.value[data-status='done'] { color: var(--color-success); }
.value[data-status='risk'] { color: var(--color-danger); }
.value[data-status='todo'] { color: var(--color-warn); }

.track-wrap.compact .value {
  font-size: 0.72rem;
  min-width: 2.3rem;
}
</style>
