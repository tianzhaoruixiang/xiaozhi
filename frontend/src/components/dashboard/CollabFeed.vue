<template>
  <PanelFrame title="协同情况通报">
    <template #extra>
      <span class="panel-badge">实时推送</span>
    </template>

    <div class="scroll-list">
      <div class="scroll-list-inner">
        <div
          v-for="item in doubled"
          :key="item._key"
          class="collab-item"
          :class="item.level"
        >
          <div class="top">
            <span class="time">{{ item.time }}</span>
            <span class="from">{{ item.from }}</span>
            <span class="tag" :class="item.level">{{ levelText(item.level) }}</span>
          </div>
          <p>{{ item.content }}</p>
        </div>
      </div>
    </div>
  </PanelFrame>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { CollabItem } from '../../types/dashboard'
import PanelFrame from './PanelFrame.vue'

const props = defineProps<{ collabs: CollabItem[] }>()

const doubled = computed(() => [
  ...props.collabs.map((c, i) => ({ ...c, _key: `a-${c.id}-${i}` })),
  ...props.collabs.map((c, i) => ({ ...c, _key: `b-${c.id}-${i}` })),
])

function levelText(level: CollabItem['level']) {
  if (level === 'urgent') return '紧急'
  if (level === 'warn') return '提醒'
  return '通报'
}
</script>

<style scoped>
.collab-item {
  padding: 8px 6px 8px 10px;
  border-bottom: 1px dashed oklch(0.84 0.145 207 / .14);
  border-left: 2px solid var(--blue);
}

.collab-item.warn { border-left-color: var(--amber); }
.collab-item.urgent { border-left-color: var(--danger); background: oklch(0.67 0.21 25 / .06); }

.top {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
  font-size: 12px;
  color: var(--muted);
}

.from {
  color: var(--cyan);
  font-weight: 600;
}

p {
  font-size: 13px;
  line-height: 1.45;
}
</style>
