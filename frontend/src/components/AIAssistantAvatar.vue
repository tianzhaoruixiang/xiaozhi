<script setup lang="ts">
import assistantAvatar from '../assets/ai-security-assistant.png'

withDefaults(defineProps<{
  label?: string
}>(), {
  label: '会议助手机器人头像',
})
</script>

<template>
  <span class="ai-avatar" role="img" :aria-label="label">
    <img :src="assistantAvatar" alt="" />
    <i class="ai-avatar-status" aria-hidden="true" />
  </span>
</template>
