<script setup lang="ts">
import secretaryGif from '../assets/avatars/meeting_secretary_avatar_stable_square_256.gif'

withDefaults(defineProps<{
  label?: string
}>(), {
  label: '会议助手书记员头像',
})
</script>

<template>
  <span class="ai-avatar" role="img" :aria-label="label">
    <img class="ai-avatar-image" :src="secretaryGif" :alt="label" draggable="false" />
  </span>
</template>
