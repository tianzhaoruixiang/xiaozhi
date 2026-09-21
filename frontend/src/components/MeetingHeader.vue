<script setup lang="ts">
withDefaults(defineProps<{
  elapsed: string
  statusLabel?: string
  clockLabel?: string
  statusTone?: 'live' | 'revision' | 'wait'
  meetingTitle?: string
  meetingTime?: string
  location?: string
  participantCount?: number
}>(), {
  statusLabel: '会议进行中',
  clockLabel: '会议时长',
  statusTone: 'live',
  meetingTitle: '大型会议保障动员会',
  meetingTime: '2026年09月20日 10:00',
  location: '市局联合指挥中心',
  participantCount: 12,
})

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
  </section>
</template>

<style scoped>
.meeting-hero { min-height: 5.25rem; grid-template-rows: auto; padding-bottom: .75rem; }
</style>
