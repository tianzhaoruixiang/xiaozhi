<template>
  <PanelFrame title="综合指挥舱">
    <template #extra>
      <span class="panel-badge">{{ onlineCount }}/{{ commandGroups.length }} 在线</span>
    </template>

    <div class="cabin">
      <div class="video-frame">
        <div class="scan" />
        <div class="hud">
          <span>CAM-01 · 主会场</span>
          <span class="live">LIVE</span>
        </div>
        <div class="venue-sketch">
          <div class="arc" />
          <div class="stage" />
          <div class="seats" />
        </div>
        <div class="report-bar">
          <span class="report-label">态势</span>
          <p class="report">{{ overallReport }}</p>
        </div>
      </div>

      <div class="summary">
        <span><em>{{ totalMembers }}</em>人在岗</span>
        <span class="sep" />
        <span>联通率 <em class="ok">{{ readyRate }}%</em></span>
      </div>

      <div class="channel-grid">
        <button
          v-for="g in commandGroups"
          :key="g.id"
          class="channel"
          :class="{ offline: !g.online }"
          :title="g.online ? `呼叫${g.name}（${g.members}人）` : `${g.name}离线`"
          :disabled="!g.online"
          @click="toast = `已呼叫${g.name}（${g.members}人在线）`"
        >
          <i class="dot" />
          <strong>{{ g.name }}</strong>
          <span>{{ g.online ? g.members : '--' }}</span>
        </button>
      </div>

      <div class="tools">
        <button class="tool" @click="toast = '视频调度已接通各组画面'">视频调度</button>
        <button class="tool" @click="toast = '指令已下发至各组终端'">指令下发</button>
        <button class="tool primary" @click="toast = overallReport">态势汇报</button>
      </div>

      <div v-if="toast" class="toast">{{ toast }}</div>
    </div>
  </PanelFrame>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { CommandGroup } from '../../types/dashboard'
import PanelFrame from './PanelFrame.vue'

const props = defineProps<{
  commandGroups: CommandGroup[]
  overallReport: string
}>()

const toast = ref('')
let toastTimer: number | undefined

const onlineCount = computed(() => props.commandGroups.filter((g) => g.online).length)
const totalMembers = computed(() =>
  props.commandGroups.reduce((sum, g) => sum + (g.online ? g.members : 0), 0),
)
const readyRate = computed(() =>
  props.commandGroups.length
    ? Math.round((onlineCount.value / props.commandGroups.length) * 100)
    : 0,
)

watch(toast, (val) => {
  if (!val) return
  window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => {
    toast.value = ''
  }, 2200)
})
</script>

<style scoped>
.cabin {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
  position: relative;
  min-height: 0;
}

.video-frame {
  position: relative;
  flex: 1;
  min-height: 130px;
  background:
    radial-gradient(circle at 50% 38%, oklch(0.62 0.15 225 / .2), transparent 58%),
    linear-gradient(180deg, oklch(0.22 0.075 246 / .72), oklch(0.13 0.05 252 / .92));
  border: 1px solid var(--line);
  overflow: hidden;
}

.scan {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, transparent 40%, oklch(0.84 0.145 207 / .1) 50%, transparent 60%);
  animation: scan 2.8s linear infinite;
  pointer-events: none;
}

@keyframes scan {
  from { transform: translateY(-100%); }
  to { transform: translateY(100%); }
}

.hud {
  position: absolute;
  top: 8px;
  left: 10px;
  right: 10px;
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--cyan);
  z-index: 1;
}

.live {
  color: var(--danger);
  animation: pulse 1s infinite;
}

.venue-sketch {
  position: absolute;
  inset: 18% 18% 32%;
  opacity: 0.7;
}

.arc {
  height: 58%;
  border: 2px solid oklch(0.84 0.145 207 / .38);
  border-radius: 50% 50% 8% 8%;
}

.stage {
  width: 36%;
  height: 12%;
  margin: -6% auto 0;
  background: oklch(0.84 0.145 207 / .3);
}

.seats {
  margin-top: 8%;
  height: 28%;
  background:
    repeating-linear-gradient(
      90deg,
      oklch(0.84 0.145 207 / .22) 0 6px,
      transparent 6px 12px
    );
}

.report-bar {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  background: linear-gradient(180deg, transparent, oklch(0.14 0.055 250 / .94) 38%);
  z-index: 1;
}

.report-label {
  flex-shrink: 0;
  padding: 1px 6px;
  font-size: 10px;
  letter-spacing: 0.08em;
  color: var(--cyan);
  border: 1px solid oklch(0.84 0.145 207 / .36);
}

.report {
  flex: 1;
  min-width: 0;
  font-size: 12px;
  color: var(--text);
  line-height: 1.35;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.summary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  flex-shrink: 0;
  font-size: 12px;
  color: var(--text-dim);
  letter-spacing: 0.04em;
}

.summary em {
  font-style: normal;
  font-family: var(--font-display);
  font-size: 14px;
  color: #fff;
  margin-right: 2px;
}

.summary em.ok {
  color: var(--success);
}

.sep {
  width: 1px;
  height: 11px;
  background: oklch(0.84 0.145 207 / .24);
}

.channel-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 5px;
  flex-shrink: 0;
}

.channel {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 4px;
  height: 32px;
  padding: 0 6px;
  border: 1px solid var(--line);
  background: oklch(0.22 0.075 246 / .36);
  transition: border-color 0.15s ease, background 0.15s ease;
}

.channel:hover:not(:disabled) {
  border-color: var(--cyan);
  background: oklch(0.3 0.09 226 / .46);
}

.channel.offline {
  opacity: 0.42;
  cursor: not-allowed;
}

.dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--success);
  box-shadow: 0 0 5px var(--success);
}

.channel.offline .dot {
  background: var(--text-dim);
  box-shadow: none;
}

.channel strong {
  font-size: 12px;
  font-weight: 600;
  color: var(--text);
  text-align: left;
}

.channel span {
  font-size: 11px;
  font-family: var(--font-display);
  color: var(--cyan);
}

.channel.offline span {
  color: var(--text-dim);
}

.tools {
  display: grid;
  grid-template-columns: 1fr 1fr 1.12fr;
  gap: 5px;
  flex-shrink: 0;
}

.tool {
  height: 30px;
  border: 1px solid var(--line);
  background: oklch(0.24 0.08 242 / .48);
  letter-spacing: 0.05em;
  font-size: 12px;
}

.tool:hover {
  border-color: var(--cyan);
}

.tool.primary {
  border-color: var(--cyan);
  color: var(--text);
  background: linear-gradient(180deg, oklch(0.42 0.11 222 / .58), oklch(0.25 0.085 242 / .78));
  box-shadow: var(--glow);
}

.toast {
  position: absolute;
  left: 50%;
  bottom: 36px;
  transform: translateX(-50%);
  max-width: 92%;
  padding: 6px 12px;
  background: oklch(0.2 0.07 248 / .94);
  border: 1px solid var(--cyan);
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  z-index: 2;
}
</style>
