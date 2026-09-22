<template>
  <PanelFrame title="舆情监测">
    <template #extra>
      <span class="panel-badge">敏感 {{ sensitiveCount }}</span>
    </template>

    <div class="push-list">
      <TransitionGroup name="push" tag="div" class="push-list-inner">
        <div
          v-for="item in opinions"
          :key="item.id"
          class="opinion-item"
          :class="{ sensitive: item.sensitive }"
        >
          <div class="top">
            <span class="time">{{ item.time }}</span>
            <span class="source">{{ item.source }}</span>
            <span v-if="item.sensitive" class="tag urgent">敏感预警</span>
          </div>
          <p :class="{ sensitive: item.sensitive }">{{ item.content }}</p>
        </div>
      </TransitionGroup>
    </div>
  </PanelFrame>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { OpinionItem } from '../../types/dashboard'
import PanelFrame from './PanelFrame.vue'

const props = defineProps<{ opinions: OpinionItem[] }>()

const sensitiveCount = computed(() => props.opinions.filter((o) => o.sensitive).length)
</script>

<style scoped>
.push-list {
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
}

.opinion-item {
  padding: 8px 6px;
  border-bottom: 1px dashed oklch(0.84 0.145 207 / .14);
}

.opinion-item.sensitive {
  background: oklch(0.67 0.21 25 / .08);
  border-left: 2px solid var(--danger);
  padding-left: 8px;
}

.top {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
  font-size: 12px;
  color: var(--muted);
}

.source {
  color: var(--cyan);
}

p {
  font-size: 13px;
  line-height: 1.45;
  color: var(--text);
}

.push-enter-active {
  transition: opacity 0.5s ease, transform 0.5s ease;
}

.push-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.push-leave-active {
  position: absolute;
  opacity: 0;
}

.push-move {
  transition: transform 0.5s ease;
}
</style>
