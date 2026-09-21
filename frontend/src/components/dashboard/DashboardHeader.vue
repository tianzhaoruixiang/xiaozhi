<template>
  <header class="header">
    <div class="header-side">
      <span class="live-dot" />
      <span>实时刷新 · {{ tick }}s</span>
      <span>{{ weather }} {{ temperature }}°C</span>
    </div>
    <h1 class="header-title">{{ title }}</h1>
    <div class="header-side right">
      <span v-if="location">{{ location }}</span>
      <span class="accent">{{ timeText }}</span>
      <span>{{ dateText }}</span>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  title: string
  now: Date
  tick: number
  weather: string
  temperature: number
  location: string
}>()

function pad(n: number) {
  return String(n).padStart(2, '0')
}

const timeText = computed(() => {
  const d = props.now
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
})

const dateText = computed(() => {
  const d = props.now
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
})
</script>
