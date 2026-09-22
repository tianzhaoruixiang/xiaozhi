<template>
  <nav class="footer-bar" aria-label="态势视图切换">
    <div class="view-context">
      <span class="context-signal"><i /></span>
      <span>
        <small>当前视图</small>
        <strong>{{ currentView.label }}</strong>
      </span>
      <p>{{ currentView.description }}</p>
    </div>

    <div class="view-tabs" role="tablist" aria-label="选择态势视图">
      <button
        v-for="item in views"
        :key="item.key"
        class="view-btn"
        :class="{ active: modelValue === item.key }"
        type="button"
        role="tab"
        :aria-selected="modelValue === item.key"
        @click="$emit('update:modelValue', item.key)"
      >
        <span>{{ item.label }}</span>
        <b :class="{ alert: item.alert }">{{ item.value }}</b>
      </button>
    </div>

  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ViewMode } from '../../types/dashboard'

const props = defineProps<{
  modelValue: ViewMode
  alertCount: number
  keyPersonCount: number
  sensitiveCount: number
  activeTaskCount: number
}>()
defineEmits<{ 'update:modelValue': [ViewMode] }>()

const views = computed(() => [
  { key: 'overview' as const, label: '综合态势', description: '全域风险、力量和任务总览', value: `${props.alertCount} 处异常`, alert: props.alertCount > 0 },
  { key: 'groups' as const, label: '重点群体', description: '分级对象与重点人员动态', value: `${props.keyPersonCount} 人`, alert: false },
  { key: 'opinion' as const, label: '舆情监测', description: '敏感信息和协同通报', value: `${props.sensitiveCount} 条敏感`, alert: props.sensitiveCount > 0 },
  { key: 'tasks' as const, label: '完成进度', description: '完成进度和协同反馈', value: `${props.activeTaskCount} 项进行中`, alert: props.activeTaskCount > 0 },
])

const currentView = computed(() => views.value.find((view) => view.key === props.modelValue) ?? views.value[0]!)
</script>
