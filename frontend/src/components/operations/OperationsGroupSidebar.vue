<script setup lang="ts">
import { ChatDotRound, User } from '@element-plus/icons-vue'
import type { OperationGroup } from '../../types/operations'

defineProps<{
  groups: OperationGroup[]
  activeGroupId: string
}>()

defineEmits<{ select: [groupId: string] }>()
</script>

<template>
  <aside class="panel-frame operations-groups" aria-label="作战群列表">
    <header class="operations-groups-head">
      <span class="panel-icon"><el-icon><ChatDotRound /></el-icon></span>
      <div><h2>作战群组</h2><p>6个小组协同在线</p></div>
      <b>91人</b>
    </header>

    <nav class="operations-group-list">
      <button
        v-for="group in groups"
        :key="group.id"
        type="button"
        :class="{ active: activeGroupId === group.id }"
        :style="{ '--group-color': group.color }"
        @click="$emit('select', group.id)"
      >
        <span class="operations-group-code">{{ group.name.slice(0, 1) }}</span>
        <span class="operations-group-copy">
          <span><strong>{{ group.name }}</strong><em v-if="group.unread">{{ group.unread }}</em></span>
          <small>{{ group.responsibility }}</small>
        </span>
        <span class="operations-group-meta">
          <small><el-icon><User /></el-icon>{{ group.onlineCount }}/{{ group.memberCount }}人在线</small>
          <span>{{ group.statusText }}</span>
        </span>
        <b class="operations-group-percent">{{ group.progress }}%</b>
        <span class="operations-group-progress"><i :style="{ width: `${group.progress}%` }" /></span>
        <span v-if="group.alertCount" class="operations-alert-count">{{ group.alertCount }}项关注</span>
      </button>
    </nav>

    <footer class="operations-groups-foot">
      <span><i />作战助手在线</span>
      <p>持续归集六组反馈，跨组事项自动关联至任务台账。</p>
    </footer>
  </aside>
</template>
