<script setup lang="ts">
import ProcessRibbon from './ProcessRibbon.vue'

withDefaults(defineProps<{
  elapsed: string
  currentStep?: number
  statusLabel?: string
  clockLabel?: string
  statusTone?: 'live' | 'revision' | 'wait'
  meetingTitle?: string
  meetingTime?: string
  location?: string
  participantCount?: number
}>(), {
  currentStep: 1,
  statusLabel: '会议进行中',
  clockLabel: '会议时长',
  statusTone: 'live',
  meetingTitle: '大型会议保障动员会',
  meetingTime: '2026年09月20日 10:00',
  location: '市局联合指挥中心',
  participantCount: 12,
})

const steps = [
  '会议讨论',
  '统稿确认',
  '联合会签',
  '任务部署',
]
</script>

<template>
  <section class="meeting-hero">
    <div class="meeting-title-block">
      <div class="title-row">
        <h1>{{ meetingTitle }}</h1>
        <span class="live-badge" :class="statusTone"><i />{{ statusLabel }}</span>
      </div>
      <p>{{ meetingTime }} · {{ location }} · {{ participantCount }}人参会</p>
    </div>

    <div class="meeting-clock">
      <span>{{ clockLabel }}</span>
      <strong>{{ elapsed }}</strong>
    </div>

    <ProcessRibbon :steps="steps" :current-step="currentStep" />
  </section>
</template>
