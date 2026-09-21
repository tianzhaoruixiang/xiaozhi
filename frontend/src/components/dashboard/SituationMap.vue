<template>
  <PanelFrame title="作战态势图">
    <div
      ref="mapRef"
      class="map-wrap"
      @wheel.prevent="onWheel"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointerleave="onPointerUp"
      @pointercancel="onPointerUp"
    >
      <div class="scene-3d" :style="sceneStyle">
        <div class="campus-tilt">
          <div class="campus-layer">
            <img
              class="campus-img"
              src="/venue/sz-iec-campus-3d.png"
              alt="深圳国际交流中心三维态势"
              draggable="false"
            />
            <div class="campus-shade" />
            <div class="scan-line" />
          </div>
        </div>

        <svg class="overlay-svg" viewBox="0 0 640 520" preserveAspectRatio="xMidYMid slice">
          <defs>
            <radialGradient id="mapGlow" cx="50%" cy="46%" r="55%">
              <stop offset="0%" stop-color="oklch(0.72 0.14 215 / .2)" />
              <stop offset="55%" stop-color="oklch(0.45 0.12 238 / .08)" />
              <stop offset="100%" stop-color="oklch(0.16 0.06 250 / 0)" />
            </radialGradient>
            <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2.2" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <!-- 雷达扫描 -->
          <g class="radar" opacity="0.32">
            <circle cx="340" cy="250" r="175" fill="none" stroke="oklch(0.84 0.145 207 / .18)" stroke-width="1" />
            <circle cx="340" cy="250" r="115" fill="none" stroke="oklch(0.84 0.145 207 / .12)" stroke-width="1" />
            <path class="radar-sweep" d="M340 250 L340 75 A175 175 0 0 1 490 175 Z" fill="url(#mapGlow)" />
          </g>

          <!-- 巡防点位 -->
          <g
            v-for="point in mappedPoints"
            :key="point.id"
            class="point-group"
            @pointerdown.stop
            @pointerenter="hoveredId = point.id"
            @pointerleave="hoveredId = null"
            @click="selectedId = point.id"
          >
            <ellipse
              :cx="point.px"
              :cy="point.py + 10"
              rx="10"
              ry="4"
              fill="rgba(0,0,0,0.35)"
            />
            <circle class="hit-area" :cx="point.px" :cy="point.py" r="18" fill="transparent" />
            <circle
              class="pulse-ring"
              :cx="point.px"
              :cy="point.py"
              r="16"
              fill="none"
              :stroke="statusColor(point.status)"
              stroke-width="1.2"
              :style="{ animationDelay: `${point.delay}s` }"
            />
            <circle
              :cx="point.px"
              :cy="point.py"
              r="9"
              :fill="statusColor(point.status)"
              fill-opacity="0.22"
              :stroke="statusColor(point.status)"
              stroke-width="1.4"
            />
            <circle :cx="point.px" :cy="point.py" r="4.5" :fill="statusColor(point.status)" filter="url(#softGlow)" />
          </g>
        </svg>

        <!-- HTML 标注：不走 CSS scale，放大后保持清晰 -->
        <div
          v-for="point in mappedPoints"
          :key="`label-${point.id}`"
          class="point-label-html"
          :style="getLabelStyle(point)"
        >
          {{ point.name }}
        </div>

        <div
          v-for="card in visibleCards"
          :key="`card-${card.id}`"
          class="point-card"
          :class="{ danger: card.status === '处置中', warn: card.status === '警戒' }"
          :style="getCardStyle(card)"
        >
          <div class="card-head">
            <strong>{{ card.name }}</strong>
            <span class="tag" :class="statusClass(card.status)">{{ card.status }}</span>
          </div>
          <div class="card-row">编组 · {{ card.group }}</div>
          <div class="card-row">在岗 · {{ card.force }} 人</div>
        </div>
      </div>

      <div class="map-hud">
        <div class="hud-item">
          <span class="hud-label">在岗警力</span>
          <strong>{{ totalForce }}</strong>
        </div>
        <div class="hud-item">
          <span class="hud-label">巡防点</span>
          <strong>{{ patrolPoints.length }}</strong>
        </div>
        <div v-if="alertCount" class="hud-item warn">
          <span class="hud-label">异常点</span>
          <strong>{{ alertCount }}</strong>
        </div>
      </div>

      <div class="map-legend">
        <span><i class="dot ok" />正常</span>
        <span><i class="dot warn" />警戒</span>
        <span><i class="dot danger" />处置中</span>
      </div>

      <div class="compass">N</div>
    </div>
  </PanelFrame>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import type { PatrolPoint } from '../../types/dashboard'
import PanelFrame from './PanelFrame.vue'

const props = defineProps<{
  patrolPoints: PatrolPoint[]
}>()

const MIN_ZOOM = 0.95
const MAX_ZOOM = 2.6
const BASE_SCALE = 1.12
const ORBIT_DURATION = 36_000

const mapRef = ref<HTMLElement | null>(null)
const zoom = ref(1)
const offsetX = ref(0)
const offsetY = ref(0)
const dragging = ref(false)
const dragStart = ref({ x: 0, y: 0, ox: 0, oy: 0 })
const orbitAngle = ref(0)
let orbitFrame: number | undefined
let lastOrbitAt = 0

const hoveredId = ref<string | null>(null)
const selectedId = ref<string | null>(null)

type MappedPoint = PatrolPoint & { px: number; py: number; delay: number }

const mappedPoints = computed<MappedPoint[]>(() =>
  props.patrolPoints.map((p, i) => ({
    ...p,
    px: (p.x / 100) * 640,
    py: (p.y / 100) * 520,
    delay: (i % 5) * 0.35,
  })),
)

/** 用宽高缩放代替 transform:scale，避免文字被栅格化发糊 */
const sceneStyle = computed(() => {
  const z = BASE_SCALE * zoom.value
  const radians = (orbitAngle.value * Math.PI) / 180
  const horizontal = Math.sin(radians)
  const depth = Math.cos(radians)
  const cameraOffset = horizontal * 28
  const cameraYaw = horizontal * -9
  const depthScale = 1 + depth * 0.025
  return {
    width: `${z * 100}%`,
    height: `${z * 100}%`,
    left: `calc(50% + ${offsetX.value}px)`,
    top: `calc(52% + ${offsetY.value}px)`,
    transform: `translate(-50%, -50%) translate3d(${cameraOffset}px, 0, ${depth * 24}px) rotateY(${cameraYaw}deg) scale(${depthScale})`,
    cursor: dragging.value ? 'grabbing' : zoom.value > 1 ? 'grab' : 'default',
  }
})

const visibleCards = computed(() => {
  const points = mappedPoints.value
  if (hoveredId.value) {
    const hovered = points.find((p) => p.id === hoveredId.value)
    return hovered ? [hovered] : []
  }
  if (selectedId.value) {
    const selected = points.find((p) => p.id === selectedId.value)
    if (selected) return [selected]
  }
  return points.filter((p) => p.status !== '正常').slice(0, 2)
})

function getCardStyle(card: MappedPoint) {
  const left = Math.min(84, Math.max(12, (card.px / 640) * 100))
  const top = Math.min(72, Math.max(10, (card.py / 520) * 100 - 8))
  return {
    left: `${left}%`,
    top: `${top}%`,
  }
}

function getLabelStyle(point: MappedPoint) {
  return {
    left: `${(point.px / 640) * 100}%`,
    top: `${(point.py / 520) * 100}%`,
    color: statusColor(point.status),
  }
}

function orbitScene(timestamp: number) {
  if (!lastOrbitAt) lastOrbitAt = timestamp
  const elapsed = timestamp - lastOrbitAt
  lastOrbitAt = timestamp
  if (!dragging.value) {
    orbitAngle.value = (orbitAngle.value + (elapsed / ORBIT_DURATION) * 360) % 360
  }
  orbitFrame = window.requestAnimationFrame(orbitScene)
}

onMounted(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  orbitFrame = window.requestAnimationFrame(orbitScene)
})

onUnmounted(() => {
  if (orbitFrame) window.cancelAnimationFrame(orbitFrame)
})

const totalForce = computed(() => props.patrolPoints.reduce((sum, p) => sum + p.force, 0))
const alertCount = computed(() => props.patrolPoints.filter((p) => p.status !== '正常').length)

function clampZoom(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value))
}

function setZoomAt(nextZoom: number, originX: number, originY: number) {
  const prev = zoom.value
  const next = clampZoom(nextZoom)
  if (next === prev) return

  const el = mapRef.value
  if (!el) {
    zoom.value = next
    return
  }

  const rect = el.getBoundingClientRect()
  const cx = originX - rect.left - rect.width / 2
  const cy = originY - rect.top - rect.height / 2
  const ratio = next / prev

  offsetX.value = cx - (cx - offsetX.value) * ratio
  offsetY.value = cy - (cy - offsetY.value) * ratio
  zoom.value = next

  if (next <= 1.01) {
    offsetX.value *= 0.85
    offsetY.value *= 0.85
  }
}

function onWheel(e: WheelEvent) {
  const factor = e.deltaY > 0 ? 0.9 : 1.1
  setZoomAt(zoom.value * factor, e.clientX, e.clientY)
}

function onPointerDown(e: PointerEvent) {
  if (e.button !== 0) return
  dragging.value = true
  dragStart.value = {
    x: e.clientX,
    y: e.clientY,
    ox: offsetX.value,
    oy: offsetY.value,
  }
  mapRef.value?.setPointerCapture(e.pointerId)
}

function onPointerMove(e: PointerEvent) {
  if (!dragging.value) return
  offsetX.value = dragStart.value.ox + (e.clientX - dragStart.value.x)
  offsetY.value = dragStart.value.oy + (e.clientY - dragStart.value.y)
}

function onPointerUp(e: PointerEvent) {
  if (!dragging.value) return
  dragging.value = false
  try {
    mapRef.value?.releasePointerCapture(e.pointerId)
  } catch {
    /* ignore */
  }
}

function statusColor(status: PatrolPoint['status']) {
  if (status === '警戒') return 'oklch(0.82 0.16 83)'
  if (status === '处置中') return 'oklch(0.67 0.21 25)'
  return 'oklch(0.84 0.145 207)'
}

function statusClass(status: PatrolPoint['status']) {
  if (status === '警戒') return 'warn'
  if (status === '处置中') return 'urgent'
  return 'doing'
}
</script>

<style scoped>
.map-wrap {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 240px;
  overflow: hidden;
  background: oklch(0.12 0.05 252);
  border: 1px solid var(--line);
  perspective: 1200px;
}

.scene-3d {
  position: absolute;
  transform-origin: center center;
  transform-style: preserve-3d;
  will-change: transform;
}

.campus-tilt {
  position: absolute;
  inset: -2% -1% -4%;
  transform: rotateX(12deg);
  transform-origin: 50% 70%;
  transform-style: preserve-3d;
  pointer-events: none;
  z-index: 1;
}

.campus-layer {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.campus-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: 52% 48%;
  display: block;
  filter: saturate(1.08) contrast(1.05) brightness(0.92);
  user-select: none;
  pointer-events: none;
}

.campus-shade {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(ellipse at 55% 45%, transparent 28%, oklch(0.13 0.045 252 / .34) 72%, oklch(0.1 0.04 252 / .72) 100%),
    linear-gradient(180deg, oklch(0.22 0.07 242 / .18), transparent 30%, oklch(0.12 0.045 252 / .25) 100%);
}

.scan-line {
  position: absolute;
  left: 0;
  right: 0;
  height: 18%;
  background: linear-gradient(180deg, transparent, oklch(0.84 0.145 207 / .08), transparent);
  animation: scan 5.5s linear infinite;
  pointer-events: none;
}

@keyframes scan {
  0% { top: -20%; opacity: 0; }
  15% { opacity: 1; }
  85% { opacity: 1; }
  100% { top: 100%; opacity: 0; }
}

.overlay-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 2;
  text-rendering: geometricPrecision;
  shape-rendering: geometricPrecision;
}

.radar-sweep {
  transform-origin: 340px 250px;
  animation: sweep 6s linear infinite;
}

@keyframes sweep {
  to { transform: rotate(360deg); }
}

.point-group {
  cursor: pointer;
}

.hit-area {
  pointer-events: all;
}

.pulse-ring {
  pointer-events: none;
  transform-box: fill-box;
  transform-origin: center;
  animation: ring 2.2s ease-out infinite;
}

@keyframes ring {
  0% { opacity: 0.85; transform: scale(0.45); }
  100% { opacity: 0; transform: scale(1.55); }
}

.point-label-html {
  position: absolute;
  z-index: 3;
  transform: translate(-50%, calc(-100% - 14px));
  padding: 1px 4px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  white-space: nowrap;
  pointer-events: none;
  text-shadow:
    0 0 4px rgba(2, 12, 34, 0.95),
    0 1px 2px rgba(2, 12, 34, 0.9),
    1px 0 0 rgba(2, 12, 34, 0.7),
    -1px 0 0 rgba(2, 12, 34, 0.7);
  -webkit-font-smoothing: antialiased;
}

.point-card {
  position: absolute;
  z-index: 6;
  transform: translate(-50%, -118%);
  min-width: 148px;
  padding: 8px 10px;
  background: linear-gradient(180deg, oklch(0.24 0.08 244 / .96), oklch(0.16 0.055 250 / .94));
  border: 1px solid oklch(0.84 0.145 207 / .48);
  box-shadow: 0 0 12px oklch(0.7 0.14 215 / .18), inset 0 0 12px oklch(0.62 0.15 225 / .12);
  pointer-events: none;
  animation: card-in 0.25s ease;
}

.point-card.warn {
  border-color: oklch(0.82 0.16 83 / .65);
  box-shadow: 0 0 12px oklch(0.82 0.16 83 / .18);
}

.point-card.danger {
  border-color: oklch(0.67 0.21 25 / .7);
  box-shadow: 0 0 12px oklch(0.67 0.21 25 / .2);
}

@keyframes card-in {
  from { opacity: 0; transform: translate(-50%, -108%); }
  to { opacity: 1; transform: translate(-50%, -118%); }
}

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}

.card-head strong {
  color: #fff;
  font-size: 13px;
}

.card-row {
  font-size: 12px;
  line-height: 1.45;
  color: var(--text);
}

.map-hud {
  position: absolute;
  left: 10px;
  bottom: 36px;
  z-index: 5;
  display: flex;
  gap: 8px;
}

.hud-item {
  min-width: 72px;
  padding: 6px 10px;
  background: oklch(0.17 0.06 250 / .86);
  border: 1px solid var(--line);
  backdrop-filter: blur(4px);
}

.hud-item.warn {
  border-color: oklch(0.82 0.16 83 / .5);
}

.hud-label {
  display: block;
  font-size: 11px;
  color: var(--muted);
  margin-bottom: 2px;
}

.hud-item strong {
  font-size: 18px;
  color: #fff;
  font-family: var(--font-display);
  letter-spacing: 0.04em;
}

.hud-item.warn strong {
  color: var(--amber);
}

.map-legend {
  position: absolute;
  left: 10px;
  bottom: 8px;
  z-index: 5;
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: var(--muted);
  background: oklch(0.16 0.055 250 / .74);
  padding: 4px 8px;
  border: 1px solid oklch(0.84 0.145 207 / .14);
  backdrop-filter: blur(4px);
}

.dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 4px;
}

.dot.ok { background: var(--cyan); }
.dot.warn { background: var(--amber); }
.dot.danger { background: var(--danger); }

.compass {
  position: absolute;
  right: 12px;
  top: 10px;
  z-index: 5;
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border: 1px solid oklch(0.84 0.145 207 / .4);
  border-radius: 50%;
  color: var(--cyan);
  font-size: 12px;
  font-weight: 700;
  background: oklch(0.17 0.06 250 / .76);
  box-shadow: inset 0 0 8px oklch(0.84 0.145 207 / .16);
}
</style>
