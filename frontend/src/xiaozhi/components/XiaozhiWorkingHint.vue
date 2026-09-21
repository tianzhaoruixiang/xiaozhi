<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import type { CollabStep } from '../types/assistant'
import { liveCollabActivities } from '../utils/liveCollabActivity'
import AgentAvatar from './AgentAvatar.vue'

const props = withDefaults(
  defineProps<{
    tone?: 'dark' | 'light'
    caption?: string
    steps?: CollabStep[]
  }>(),
  {
    tone: 'dark',
    steps: () => [],
  },
)

const activities = computed(() => liveCollabActivities(props.steps ?? []))
const flipIndex = ref(0)
let flipTimer: number | undefined

const current = computed(() => {
  const list = activities.value
  if (!list.length) return null
  return list[flipIndex.value % list.length] ?? list[0]
})

const activitySignature = computed(() => activities.value.map((a) => a.key).join('|'))

const stopFlip = () => {
  if (flipTimer) {
    window.clearInterval(flipTimer)
    flipTimer = undefined
  }
}

const startFlip = () => {
  stopFlip()
  if (activities.value.length <= 1) return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  flipTimer = window.setInterval(() => {
    const n = activities.value.length
    if (n <= 1) return
    flipIndex.value = (flipIndex.value + 1) % n
  }, 2200)
}

watch(
  activitySignature,
  (sig, prev) => {
    const list = activities.value
    if (!list.length) {
      flipIndex.value = 0
      stopFlip()
      return
    }
    if (sig !== prev) {
      flipIndex.value = list.length - 1
    }
    startFlip()
  },
  { immediate: true },
)

onUnmounted(stopFlip)
</script>

<template>
  <div class="working" :data-tone="tone" role="status" aria-live="polite">
    <span class="rig">
      <span class="orbit" aria-hidden="true" />
      <AgentAvatar agent-id="xiaozhi" name="小智" status="running" :size="46" />
    </span>
    <span class="copy">
      <strong>
        <span class="spinner" aria-hidden="true" />
        正在工作
      </strong>
      <span v-if="current" class="ticker" :key="current.key">
        <em class="kind" :data-kind="current.kind">
          {{ current.kind === 'tool' ? '工具' : '思考' }}
        </em>
        <span class="line">
          <b>{{ current.agentName }}</b>
          <span>{{
            current.kind === 'tool' ? `${current.title} · ${current.text}` : current.text
          }}</span>
        </span>
      </span>
      <em v-else-if="caption" class="fallback">{{ caption }}</em>
    </span>
  </div>
</template>

<style scoped>
.working {
  display: flex;
  align-items: center;
  gap: 14px;
  margin: 2px 0 4px;
}

.rig {
  position: relative;
  width: 58px;
  height: 58px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.orbit {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 2px solid rgba(94, 200, 232, 0.18);
  border-top-color: #9adce8;
  border-right-color: rgba(232, 213, 163, 0.7);
  animation: orbit 0.85s linear infinite;
}

.copy {
  display: grid;
  gap: 6px;
  min-width: 0;
}

.copy strong {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 0.98rem;
  font-weight: 650;
  letter-spacing: 0.06em;
  color: #e8f7fb;
}

.ticker {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 8px;
  align-items: start;
  min-width: 0;
  animation: flip-in 280ms var(--ease-out, ease-out) both;
}

.kind {
  font-style: normal;
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 0.64rem;
  letter-spacing: 0.08em;
  padding: 3px 6px;
  border-radius: 4px;
  margin-top: 1px;
  white-space: nowrap;
}

.kind[data-kind='tool'] {
  color: #9adce8;
  background: rgba(94, 200, 232, 0.12);
  border: 1px solid rgba(94, 200, 232, 0.28);
}

.kind[data-kind='think'] {
  color: #e8d5a3;
  background: rgba(196, 163, 90, 0.14);
  border: 1px solid rgba(196, 163, 90, 0.32);
}

.line {
  display: grid;
  gap: 1px;
  min-width: 0;
}

.line b {
  font-weight: 600;
  font-size: 0.78rem;
  color: rgba(237, 244, 248, 0.78);
}

.line span {
  font-size: 0.78rem;
  line-height: 1.4;
  color: rgba(237, 244, 248, 0.55);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.fallback {
  font-style: normal;
  font-size: 0.78rem;
  line-height: 1.4;
  color: rgba(237, 244, 248, 0.52);
}

.spinner {
  width: 11px;
  height: 11px;
  border-radius: 50%;
  border: 2px solid rgba(154, 220, 232, 0.28);
  border-top-color: #9adce8;
  animation: orbit 0.7s linear infinite;
}

.working[data-tone='light'] .orbit {
  border-color: rgba(31, 142, 168, 0.16);
  border-top-color: #1f8ea8;
  border-right-color: rgba(196, 163, 90, 0.65);
}

.working[data-tone='light'] .copy strong {
  color: #123848;
}

.working[data-tone='light'] .line b {
  color: #123848;
}

.working[data-tone='light'] .line span,
.working[data-tone='light'] .fallback {
  color: rgba(18, 56, 72, 0.55);
}

.working[data-tone='light'] .kind[data-kind='tool'] {
  color: #1f6f86;
  background: rgba(31, 142, 168, 0.08);
  border-color: rgba(31, 142, 168, 0.22);
}

.working[data-tone='light'] .kind[data-kind='think'] {
  color: #7a5a22;
  background: rgba(196, 163, 90, 0.14);
  border-color: rgba(168, 132, 52, 0.28);
}

.working[data-tone='light'] .spinner {
  border-color: rgba(31, 142, 168, 0.22);
  border-top-color: #1f8ea8;
}

@media (prefers-reduced-motion: reduce) {
  .orbit,
  .spinner,
  .ticker {
    animation: none;
  }
}

@keyframes orbit {
  to {
    transform: rotate(360deg);
  }
}

@keyframes flip-in {
  from {
    opacity: 0;
    transform: translate3d(0, 6px, 0);
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
}
</style>
