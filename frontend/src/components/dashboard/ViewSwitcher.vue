<template>
  <div class="footer-bar">
    <button
      v-for="item in views"
      :key="item.key"
      class="view-btn"
      :class="{ active: modelValue === item.key }"
      @click="$emit('update:modelValue', item.key)"
    >
      {{ item.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
import type { ViewMode } from '../../types/dashboard'

defineProps<{ modelValue: ViewMode }>()
defineEmits<{ 'update:modelValue': [ViewMode] }>()

const views: { key: ViewMode; label: string }[] = [
  { key: 'overview', label: '综合态势' },
  { key: 'groups', label: '重点群体' },
  { key: 'opinion', label: '舆情监测' },
  { key: 'tasks', label: '任务执行' },
]
</script>
