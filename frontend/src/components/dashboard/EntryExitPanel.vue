<template>
  <PanelFrame title="重点群体出入境">
    <template #extra>
      <span class="panel-badge">广东 · 深圳</span>
    </template>

    <div class="border-layout">
      <div class="stat-row">
        <div class="stat gd">
          <em>{{ data.gdInToday }}</em>
          <span>入境广东</span>
        </div>
        <div class="stat sz">
          <em>{{ data.szInToday }}</em>
          <span>入境深圳</span>
        </div>
        <div class="stat out">
          <em>{{ data.outToday }}</em>
          <span>今日出境</span>
        </div>
        <div class="stat stay">
          <em>{{ data.inProvince }}</em>
          <span>在粤重点人</span>
        </div>
      </div>

      <div class="charts">
        <div class="chart-card">
          <div class="chart-head">
            <strong>入境广东</strong>
            <span>今日 {{ data.gdInToday }}</span>
          </div>
          <svg viewBox="0 0 240 64" preserveAspectRatio="none" class="chart">
            <path :d="gdArea" class="area gd" />
            <path :d="gdLine" class="line gd" />
          </svg>
        </div>
        <div class="chart-card">
          <div class="chart-head">
            <strong>入境深圳</strong>
            <span>今日 {{ data.szInToday }}</span>
          </div>
          <svg viewBox="0 0 240 64" preserveAspectRatio="none" class="chart">
            <path :d="szArea" class="area sz" />
            <path :d="szLine" class="line sz" />
          </svg>
        </div>
      </div>

      <div class="list-head">
        <span>实时通关记录</span>
        <span class="hint">口岸核验</span>
      </div>
      <ul class="record-list">
        <li v-for="r in data.records" :key="r.id">
          <div class="row">
            <strong>{{ r.name }}</strong>
            <span class="badge type" :data-type="r.type">{{ r.type }}类</span>
            <span class="badge dir" :data-dir="r.direction">{{ r.direction }}</span>
          </div>
          <div class="meta">
            <span>{{ r.time }}</span>
            <span>{{ r.port }}</span>
            <span>{{ r.from }}</span>
          </div>
        </li>
      </ul>
    </div>
  </PanelFrame>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { BorderFlowData } from '../../types/dashboard'
import PanelFrame from './PanelFrame.vue'

const props = defineProps<{ data: BorderFlowData }>()

function buildPath(values: number[], area: boolean) {
  if (!values.length) return ''
  const max = Math.max(...values, 1)
  const step = values.length > 1 ? 240 / (values.length - 1) : 240
  const points = values.map((v, i) => {
    const x = i * step
    const y = 58 - (v / max) * 48
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  const line = `M ${points.join(' L ')}`
  if (!area) return line
  return `${line} L 240,64 L 0,64 Z`
}

const gdLine = computed(() => buildPath(props.data.trend.map((p) => p.gdIn), false))
const gdArea = computed(() => buildPath(props.data.trend.map((p) => p.gdIn), true))
const szLine = computed(() => buildPath(props.data.trend.map((p) => p.szIn), false))
const szArea = computed(() => buildPath(props.data.trend.map((p) => p.szIn), true))
</script>

<style scoped>
.border-layout {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
}

.stat-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  flex-shrink: 0;
}

.stat {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 4px 8px;
  overflow: hidden;
  border: 1px solid transparent;
}

.stat.gd {
  border-color: oklch(0.84 0.145 207 / .38);
  background:
    linear-gradient(160deg, oklch(0.5 0.11 220 / .22), oklch(0.2 0.065 248 / .46)),
    oklch(0.22 0.075 245 / .42);
  box-shadow: inset 0 0 16px oklch(0.7 0.14 215 / .1);
}

.stat.sz {
  border-color: oklch(0.62 0.21 254 / .42);
  background:
    linear-gradient(160deg, oklch(0.52 0.15 254 / .22), oklch(0.2 0.07 250 / .48)),
    oklch(0.22 0.08 250 / .4);
  box-shadow: inset 0 0 16px oklch(0.62 0.21 254 / .1);
}

.stat.out {
  border-color: oklch(0.82 0.16 83 / .38);
  background:
    linear-gradient(160deg, oklch(0.62 0.1 83 / .18), oklch(0.2 0.045 72 / .44)),
    oklch(0.22 0.055 72 / .38);
  box-shadow: inset 0 0 16px oklch(0.82 0.16 83 / .08);
}

.stat.stay {
  border-color: oklch(0.79 0.17 162 / .38);
  background:
    linear-gradient(160deg, oklch(0.56 0.11 162 / .18), oklch(0.2 0.055 170 / .44)),
    oklch(0.22 0.065 170 / .38);
  box-shadow: inset 0 0 16px oklch(0.79 0.17 162 / .08);
}

.stat span {
  position: relative;
  font-size: 11px;
  color: var(--muted);
  letter-spacing: 0.04em;
}

.stat em {
  position: relative;
  font-style: normal;
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 700;
  line-height: 1;
  letter-spacing: 0.03em;
}

.stat.gd em { color: var(--cyan); text-shadow: 0 0 10px oklch(0.84 0.145 207 / .28); }
.stat.sz em { color: var(--blue); text-shadow: 0 0 10px oklch(0.62 0.21 254 / .3); }
.stat.out em { color: var(--amber); text-shadow: 0 0 10px oklch(0.82 0.16 83 / .28); }
.stat.stay em { color: var(--green); text-shadow: 0 0 10px oklch(0.79 0.17 162 / .28); }

.charts {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  flex-shrink: 0;
}

.chart-card {
  padding: 8px 8px 4px;
  border: 1px solid var(--line);
  background:
    linear-gradient(160deg, oklch(0.36 0.09 228 / .2), oklch(0.18 0.06 249 / .5)),
    oklch(0.19 0.065 248 / .48);
  box-shadow: inset 0 0 14px oklch(0.62 0.15 225 / .08);
}

.chart-card:last-child {
  border-color: oklch(0.62 0.21 254 / .3);
  background:
    linear-gradient(160deg, oklch(0.4 0.12 254 / .18), oklch(0.18 0.065 250 / .5)),
    oklch(0.2 0.07 250 / .44);
}

.chart-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
  font-size: 12px;
}

.chart-head strong {
  color: var(--text);
  font-weight: 600;
}

.chart-head span {
  color: var(--text-dim);
  font-size: 11px;
}

.chart {
  width: 100%;
  height: 52px;
  display: block;
}

.area.gd {
  fill: oklch(0.84 0.145 207 / .14);
  stroke: none;
}

.area.sz {
  fill: oklch(0.62 0.21 254 / .16);
  stroke: none;
}

.line.gd {
  fill: none;
  stroke: var(--cyan);
  stroke-width: 1.6;
}

.line.sz {
  fill: none;
  stroke: var(--blue);
  stroke-width: 1.6;
}

.list-head {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--text-dim);
  letter-spacing: 0.06em;
  flex-shrink: 0;
}

.hint {
  opacity: 0.7;
}

.record-list {
  flex: 1;
  min-height: 0;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.record-list li {
  padding: 7px 8px;
  border: 1px solid var(--line);
  background:
    linear-gradient(135deg, oklch(0.34 0.08 228 / .22), oklch(0.18 0.06 249 / .5)),
    oklch(0.19 0.065 248 / .46);
  box-shadow: inset 0 0 12px oklch(0.62 0.15 225 / .07);
}

.row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 3px;
}

.row strong {
  font-size: 13px;
  color: #fff;
}

.badge {
  padding: 0 5px;
  font-size: 10px;
  line-height: 16px;
  color: #fff;
}

.badge.type[data-type='A'] { background: oklch(0.57 0.13 162); }
.badge.type[data-type='B'] { background: oklch(0.62 0.13 83); }
.badge.type[data-type='C'] { background: #7a5fd0; }
.badge.type[data-type='D'] { background: oklch(0.52 0.17 254); }

.badge.dir[data-dir='入境广东'] { background: oklch(0.55 0.1 207); }
.badge.dir[data-dir='入境深圳'] { background: var(--blue); }
.badge.dir[data-dir='出境'] { background: var(--amber); color: var(--bg-deep); }

.meta {
  display: flex;
  gap: 10px;
  font-size: 11px;
  color: var(--text-dim);
}
</style>
