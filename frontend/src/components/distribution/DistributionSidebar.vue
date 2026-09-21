<script setup lang="ts">
import { Connection } from '@element-plus/icons-vue'
import type { DistributionGroup, DistributionTask } from '../../types/distribution'
import { groupIconFor } from '../../utils/groupIcons'

const props = defineProps<{
  groups: DistributionGroup[]
  tasks: DistributionTask[]
  selectedGroupId: string
  progress: number
}>()

defineEmits<{ select: [groupId: string] }>()

const groupTasks = (groupId: string) => props.tasks.filter((task) => task.groupId === groupId)
const groupProgress = (groupId: string) => {
  const items = groupTasks(groupId)
  return items.length ? Math.round((items.filter((task) => task.status !== 'pending').length / items.length) * 100) : 0
}
</script>

<template>
  <aside class="panel-frame distribution-sidebar" aria-label="作战组列表">
    <header class="distribution-sidebar-head">
      <span class="panel-icon"><el-icon><Connection /></el-icon></span>
      <div><h2>作战编组</h2><p>{{ groups.length }} 个组 · 组长负责组建</p></div>
      <strong>{{ progress }}%</strong>
    </header>
    <div class="revision-progress"><span :style="{ width: `${progress}%` }" /></div>

    <nav class="group-list" aria-label="作战组">
      <button
        v-for="group in groups"
        :key="group.id"
        type="button"
        :class="{ active: selectedGroupId === group.id }"
        :style="{ '--group-color': group.color }"
        @click="$emit('select', group.id)"
      >
        <span class="group-code" aria-hidden="true"><el-icon><component :is="groupIconFor(group.id)" /></el-icon></span>
        <span class="group-copy"><strong>{{ group.name }}</strong><small>{{ group.responsibility }}</small></span>
        <span class="group-progress"><b>{{ groupProgress(group.id) }}%</b><i><em :style="{ width: `${groupProgress(group.id)}%` }" /></i></span>
      </button>
    </nav>

    <footer class="distribution-sidebar-foot">
      <span>任务来源</span>
      <strong>最终安保方案 · 已会签</strong>
      <small>每项任务均保留方案条文和责任链路</small>
    </footer>
  </aside>
</template>

