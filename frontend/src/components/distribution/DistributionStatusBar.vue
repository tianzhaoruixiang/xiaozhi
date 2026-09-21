<script setup lang="ts">
import { ArrowLeft, CircleCheck, Promotion } from '@element-plus/icons-vue'

defineProps<{
  confirmedCount: number
  pendingCount: number
  totalCount: number
  pendingMemberCount: number
  canDispatch: boolean
  dispatched: boolean
}>()

defineEmits<{ back: []; finish: [] }>()
</script>

<template>
  <footer class="bottom-status distribution-status">
    <button type="button" class="back-button" @click="$emit('back')"><el-icon><ArrowLeft /></el-icon>返回联合会签</button>
    <div class="revision-status-summary" aria-live="polite">
      <span><el-icon><CircleCheck /></el-icon>已确认 {{ confirmedCount }}/{{ totalCount }} 项</span><i />
      <span :class="{ warning: pendingCount > 0 }">待确认 {{ pendingCount }} 项</span><i />
      <span :class="{ warning: pendingMemberCount > 0 }">待拉成员 {{ pendingMemberCount }} 组</span><i />
      <span class="save-state"><b />任务部署已自动保存</span>
    </div>
    <button type="button" class="next-button" :class="{ ready: canDispatch || dispatched }" @click="$emit('finish')">
      <el-icon><Promotion /></el-icon>{{ dispatched ? '进入小组协同作战' : '确认下发并结束安保动员会' }}
    </button>
  </footer>
</template>
