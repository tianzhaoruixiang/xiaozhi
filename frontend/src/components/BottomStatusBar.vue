<script setup lang="ts">
import { ArrowRight, CircleCheck, Document } from '@element-plus/icons-vue'

defineProps<{
  planVersion: string
  acceptedCount: number
  pendingCount: number
}>()

defineEmits<{ next: [] }>()
</script>

<template>
  <footer class="bottom-status">
    <div class="status-left">
      <span><el-icon><Document /></el-icon>安保方案 {{ planVersion }}</span>
      <i />
      <span><el-icon><CircleCheck /></el-icon>已采纳 {{ acceptedCount }} 条</span>
      <i />
      <span class="pending-text">待确认 {{ pendingCount }} 条</span>
    </div>
    <div class="save-state"><span />会议内容与方案已自动保存</div>
    <button class="next-button" @click="$emit('next')">完成意见征集，进入统稿确认<el-icon><ArrowRight /></el-icon></button>
  </footer>
</template>
