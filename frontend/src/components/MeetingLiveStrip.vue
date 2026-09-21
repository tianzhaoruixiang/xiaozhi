<script setup lang="ts">
import { Bell, MagicStick, Microphone, VideoCamera } from '@element-plus/icons-vue'
import type { Participant } from '../types/meeting'

defineProps<{
  speaker: Participant
  liveDraft: string
  assistantTask: string
  stageLabel: string
  pendingLabel: string
  pendingCount: number
  isRunning: boolean
}>()
</script>

<template>
  <section class="meeting-live-strip" aria-label="会议现场实时状态">
    <div class="live-stage">
      <span class="live-indicator"><i />会议现场</span>
      <strong>{{ stageLabel }}</strong>
    </div>

    <div class="live-speaker">
      <span class="live-speaker-avatar" :style="{ '--speaker-color': speaker.color }">{{ speaker.initial }}</span>
      <div>
        <small><el-icon><Microphone /></el-icon>正在发言</small>
        <strong>{{ speaker.name }} · {{ speaker.department }}</strong>
      </div>
    </div>

    <p class="live-transcript">
      “{{ liveDraft || '会议助手正在等待并识别新的发言内容……' }}<span v-if="isRunning" class="live-caret" />”
    </p>

    <div class="live-assistant-action">
      <el-icon><MagicStick /></el-icon>
      <div><small>会议助手正在工作</small><strong>{{ assistantTask }}</strong></div>
    </div>

    <div class="live-pending" :class="{ active: pendingCount > 0 }">
      <el-icon><Bell v-if="pendingCount" /><VideoCamera v-else /></el-icon>
      <span>{{ pendingLabel }}</span>
      <b>{{ pendingCount }}</b>
    </div>
  </section>
</template>
