<script setup lang="ts">
import { ArrowLeft, ArrowRight, CircleCheck } from '@element-plus/icons-vue'

defineProps<{
  signedCount: number
  pendingCount: number
  canComplete: boolean
}>()

defineEmits<{ back: []; next: [] }>()
</script>

<template>
  <footer class="bottom-status signoff-status">
    <button type="button" class="back-button" @click="$emit('back')"><el-icon><ArrowLeft /></el-icon>返回统稿确认</button>
    <div class="revision-status-summary" aria-live="polite">
      <span><el-icon><CircleCheck /></el-icon>已会签 {{ signedCount }} 个</span><i />
      <span :class="{ warning: pendingCount > 0 }">待会签 {{ pendingCount }} 个</span><i />
      <span class="save-state"><b />会签状态已同步</span>
    </div>
    <button type="button" class="next-button" :class="{ ready: canComplete }" @click="$emit('next')">
      完成联合会签，进入任务部署<el-icon><ArrowRight /></el-icon>
    </button>
  </footer>
</template>
