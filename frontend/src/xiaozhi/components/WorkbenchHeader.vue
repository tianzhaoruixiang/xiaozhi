<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

withDefaults(
  defineProps<{
    brand?: string
    tagline?: string
    lead?: string
    sysLabel?: string
    sysMeta?: string
    /** 紧凑模式：品牌置于左上角，不显示状态条 */
    compact?: boolean
  }>(),
  {
    brand: '小智',
    tagline: '领导助手 · 政务协同工作台',
    lead: '今日安排已就绪。唤醒小智，即可调度专家团为您办事。',
    sysLabel: '链路就绪',
    sysMeta: '政务协同通道',
    compact: false,
  },
)

const today = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  weekday: 'long',
}).format(new Date())

const clock = ref(
  new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date()),
)

let timer: number | undefined
onMounted(() => {
  timer = window.setInterval(() => {
    clock.value = new Intl.DateTimeFormat('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(new Date())
  }, 1000)
})
onUnmounted(() => {
  if (timer) window.clearInterval(timer)
})
</script>

<template>
  <header v-if="compact" class="header compact">
    <div class="compact-row">
      <div class="brand-block">
        <h1 class="brand compact">{{ brand }}</h1>
        <p class="tagline compact">{{ tagline }}</p>
      </div>
      <div class="compact-controls">
        <slot name="actions" />
        <div class="compact-meta">
          <p class="greeting compact">{{ today }}</p>
          <span class="clock-value">{{ clock }}</span>
        </div>
      </div>
    </div>
  </header>

  <header v-else class="header">
    <div class="hud-bar">
      <div class="sys">
        <span class="led" aria-hidden="true" />
        <span class="sys-label">{{ sysLabel }}</span>
        <span class="divider" aria-hidden="true" />
        <span class="sys-meta">{{ sysMeta }}</span>
      </div>
      <div class="hud-right">
        <slot name="actions" />
        <div class="clock" aria-label="本地时间">
          <span class="clock-label">此刻</span>
          <span class="clock-value">{{ clock }}</span>
        </div>
      </div>
    </div>

    <div class="hero">
      <div class="brand-block">
        <h1 class="brand">{{ brand }}</h1>
        <p class="tagline">{{ tagline }}</p>
      </div>

      <div class="seal" aria-hidden="true">
        <span class="seal-ring" />
        <span class="seal-ring delay" />
        <span class="seal-core" />
      </div>
    </div>

    <p class="greeting">{{ today }}</p>
    <p class="lead">{{ lead }}</p>
  </header>
</template>

<style scoped>
.header {
  margin-bottom: clamp(32px, 5vw, 52px);
  animation: page-rise var(--dur-enter) var(--ease-out) both;
}

/* 紧凑模式：小智在左上角 */
.header.compact {
  margin-bottom: clamp(18px, 2.6vw, 26px);
}

.compact-row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 10px 20px;
}

.brand.compact {
  font-size: clamp(1.9rem, 3.6vw, 2.5rem);
  line-height: 1;
  letter-spacing: 0.08em;
  filter: drop-shadow(0 6px 16px rgba(26, 122, 146, 0.18));
}

.tagline.compact {
  margin: 8px 0 0;
  font-size: 0.88rem;
  letter-spacing: 0.1em;
}

.compact-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 6px 14px;
  text-align: right;
}

.compact-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 14px 22px;
}

.greeting.compact {
  margin: 0;
  font-size: 0.92rem;
  font-weight: 600;
  animation: none;
}

/* 紧凑模式下时间用黑色，保证在浅色底上清晰可读 */
.compact-meta .clock-value {
  color: #000;
  font-weight: 700;
}

.hud-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px 16px;
  margin-bottom: 28px;
  padding: 11px 16px;
  border-radius: 14px;
  background:
    linear-gradient(105deg, rgba(6, 20, 31, 0.92), rgba(15, 42, 61, 0.84));
  border: 1px solid rgba(46, 196, 214, 0.22);
  box-shadow:
    0 12px 32px rgba(6, 20, 31, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
  color: rgba(231, 240, 246, 0.88);
}

.sys {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  min-width: 0;
}

.led {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-signal);
  box-shadow: 0 0 10px rgba(46, 196, 214, 0.7);
  animation: status-blink 2.4s ease-in-out infinite;
}

.sys-label {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  color: #9adce8;
}

.divider {
  width: 1px;
  height: 12px;
  background: rgba(255, 255, 255, 0.16);
}

.sys-meta {
  font-size: 0.78rem;
  color: rgba(230, 212, 168, 0.78);
}

.hud-right {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 16px;
}

:slotted(.desk-link) {
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid rgba(46, 196, 214, 0.32);
  color: #c9edf3;
  text-decoration: none;
  font-size: 0.78rem;
  letter-spacing: 0.06em;
  background: rgba(6, 20, 31, 0.28);
}

:slotted(.desk-link:hover) {
  border-color: rgba(46, 196, 214, 0.55);
  color: #fff;
}

.header.compact :slotted(.desk-link) {
  color: var(--color-ink);
  border-color: rgba(20, 40, 58, 0.14);
  background: rgba(255, 255, 255, 0.72);
}

.header.compact :slotted(.desk-link:hover) {
  color: var(--color-accent);
  border-color: rgba(26, 122, 146, 0.35);
}

.clock {
  display: flex;
  align-items: baseline;
  gap: 10px;
  font-variant-numeric: tabular-nums;
}

.clock-label {
  font-size: 0.72rem;
  color: rgba(231, 240, 246, 0.42);
}

.clock-value {
  font-family: var(--font-mono);
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--color-gold-soft);
  letter-spacing: 0.04em;
}

.hero {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
}

.brand-block {
  min-width: 0;
}

.brand {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(3.6rem, 9vw, 6rem);
  font-weight: 700;
  line-height: 0.95;
  letter-spacing: 0.06em;
  background: linear-gradient(
    125deg,
    var(--color-abyss) 8%,
    #1a7a92 42%,
    var(--color-signal) 68%,
    var(--color-brass) 100%
  );
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  filter: drop-shadow(0 10px 28px rgba(26, 122, 146, 0.2));
  animation: brand-in 1100ms var(--ease-out) both;
}

.tagline {
  margin: 14px 0 0;
  font-size: 1.05rem;
  font-weight: 500;
  letter-spacing: 0.12em;
  color: var(--color-ink-muted);
}

.seal {
  position: relative;
  width: 84px;
  height: 84px;
  flex-shrink: 0;
  margin-bottom: 6px;
}

.seal-ring {
  position: absolute;
  inset: 10px;
  border-radius: 50%;
  border: 1px solid rgba(46, 196, 214, 0.35);
  animation: pulse-glow 3s ease-in-out infinite;
}

.seal-ring.delay {
  inset: 0;
  border-color: rgba(201, 168, 108, 0.38);
  animation-delay: 0.8s;
}

.seal-core {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 14px;
  height: 14px;
  margin: -7px 0 0 -7px;
  border-radius: 50%;
  background:
    radial-gradient(circle at 30% 28%, #fff, var(--color-signal) 50%, #1a7a92);
  box-shadow: 0 0 20px rgba(46, 196, 214, 0.7);
}

.greeting {
  margin: 22px 0 8px;
  font-family: var(--font-display);
  font-size: 1.15rem;
  font-weight: 600;
  color: var(--color-ink);
  letter-spacing: 0.02em;
  animation: page-rise var(--dur-enter) var(--ease-out) 140ms both;
}

.lead {
  margin: 0;
  max-width: 34rem;
  color: var(--color-ink-muted);
  line-height: 1.7;
  font-size: 0.98rem;
  animation: page-rise var(--dur-enter) var(--ease-out) 240ms both;
}

@media (max-width: 640px) {
  .seal {
    display: none;
  }

  .sys-meta {
    display: none;
  }
}
</style>
