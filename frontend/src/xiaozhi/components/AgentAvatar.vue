<script setup lang="ts">
import { computed } from 'vue'
import {
  getAvatarPreset,
  pickAgentAvatarId,
  type AgentAvatarPreset,
} from '../data/agentAvatars'

const props = withDefaults(
  defineProps<{
    agentId?: string
    avatarId?: string
    name?: string
    size?: number | string
    status?: 'queued' | 'running' | 'awaiting' | 'done' | 'error' | 'pending'
  }>(),
  {
    size: 40,
  },
)

const preset = computed((): AgentAvatarPreset => {
  const id = props.avatarId || pickAgentAvatarId(props.agentId || props.name || 'agent')
  return getAvatarPreset(id)
})

const px = computed(() => {
  if (typeof props.size === 'number') return `${props.size}px`
  return props.size
})

const ring = computed(
  () =>
    `radial-gradient(circle at 30% 25%, ${preset.value.bg[0]}, ${preset.value.bg[1]})`,
)
</script>

<template>
  <span
    class="agent-avatar"
    :data-status="status"
    :data-preset="preset.id"
    :title="name ? `${name} · ${preset.label}` : preset.label"
    :style="{
      width: px,
      height: px,
      backgroundImage: ring,
    }"
  >
    <img
      class="face"
      :src="preset.src"
      :alt="name || preset.label"
      draggable="false"
    />
  </span>
</template>

<style scoped>
.agent-avatar {
  position: relative;
  display: inline-grid;
  place-items: center;
  flex-shrink: 0;
  border-radius: 50%;
  overflow: hidden;
  isolation: isolate;
  box-shadow:
    0 0 0 1.5px rgba(255, 255, 255, 0.72),
    0 6px 14px rgba(20, 40, 60, 0.22);
}

.face {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
  border-radius: 50%;
  transform: scale(1.02);
  user-select: none;
  pointer-events: none;
}

.agent-avatar[data-status='running'] {
  box-shadow:
    0 0 0 2px rgba(232, 213, 163, 0.75),
    0 0 18px rgba(196, 163, 90, 0.4);
  animation: avatar-pulse 1.4s ease-in-out infinite;
}

.agent-avatar[data-status='awaiting'] {
  box-shadow:
    0 0 0 2px rgba(196, 72, 54, 0.8),
    0 0 16px rgba(154, 42, 32, 0.35);
}

.agent-avatar[data-status='done'] {
  box-shadow:
    0 0 0 2px rgba(93, 202, 160, 0.55),
    0 4px 12px rgba(0, 0, 0, 0.18);
}

.agent-avatar[data-status='error'] {
  box-shadow:
    0 0 0 2px rgba(168, 72, 72, 0.55),
    0 4px 12px rgba(0, 0, 0, 0.18);
}

@keyframes avatar-pulse {
  0%,
  100% {
    filter: brightness(1);
  }
  50% {
    filter: brightness(1.06);
  }
}

@media (prefers-reduced-motion: reduce) {
  .agent-avatar[data-status='running'] {
    animation: none;
  }
}
</style>
