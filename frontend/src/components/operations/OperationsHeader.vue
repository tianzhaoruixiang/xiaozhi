<script setup lang="ts">
import { Aim, Clock, Connection, DocumentChecked, Monitor } from '@element-plus/icons-vue'
import type { OperationGroup } from '../../types/operations'

defineProps<{
  group?: OperationGroup
  overallProgress: number
  planVersion: string
  signoffRecordId: string
}>()

defineEmits<{
  dashboard: []
}>()

</script>

<template>
  <header class="operations-hero">
    <div class="operations-title">
      <span class="operations-mark"><el-icon><Aim /></el-icon></span>
      <div>
        <p>大型会议保障动员会</p>
        <div><h1>小组协同作战</h1><span><i />任务执行中</span></div>
      </div>
    </div>

    <div class="operations-actions">
      <div class="operations-context" aria-label="当前作战状态">
        <div><el-icon><Connection /></el-icon><span>当前作战群</span><strong>{{ group?.name }}</strong></div>
        <div><el-icon><DocumentChecked /></el-icon><span>任务依据</span><strong>方案版本 {{ planVersion }} · {{ signoffRecordId }}</strong></div>
        <div><el-icon><Clock /></el-icon><span>整体进度</span><strong>{{ overallProgress }}%</strong></div>
      </div>
      <button type="button" class="dashboard-entry" aria-label="进入指挥作战大屏" @click="$emit('dashboard')">
        <el-icon><Monitor /></el-icon>
        <span><small>全局态势</small><strong>进入指挥大屏</strong></span>
        <b aria-hidden="true">→</b>
      </button>
    </div>
  </header>
</template>
