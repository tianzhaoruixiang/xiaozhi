<script setup lang="ts">
import { ArrowLeft, ArrowRight, CircleCheck, Warning } from '@element-plus/icons-vue'

defineProps<{
  version: string
  acceptedCount: number
  pendingCount: number
  conflictCount: number
  canSubmit: boolean
}>()

defineEmits<{ back: []; next: [] }>()
</script>

<template>
  <footer class="bottom-status revision-status">
    <button type="button" class="back-button" @click="$emit('back')"><el-icon><ArrowLeft /></el-icon>返回会议讨论</button>

    <div class="revision-status-summary" aria-live="polite">
      <span><el-icon><CircleCheck /></el-icon>已写入 {{ acceptedCount }} 项</span>
      <i />
      <span :class="{ warning: pendingCount > 0 }">待审阅 {{ pendingCount }} 项</span>
      <i />
      <span :class="{ danger: conflictCount > 0 }"><el-icon><Warning /></el-icon>冲突 {{ conflictCount }} 项</span>
      <i />
      <span class="save-state"><b />统稿结果已自动保存</span>
    </div>

    <button type="button" class="next-button" :class="{ ready: canSubmit }" @click="$emit('next')">
      确认会议定稿，进入联合会签<el-icon><ArrowRight /></el-icon>
    </button>
  </footer>
</template>
