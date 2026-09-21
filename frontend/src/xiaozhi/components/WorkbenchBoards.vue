<script setup lang="ts">
import BoardRow from './BoardRow.vue'
import type { BoardListItem } from './BoardRow.vue'

export type BoardVariant = 'todo' | 'focus' | 'key' | 'reminder'

export interface WorkbenchPanel {
  title: string
  subtitle: string
  variant: BoardVariant
  items: BoardListItem[]
  warn?: boolean
}

withDefaults(
  defineProps<{
    panels: WorkbenchPanel[]
    label?: string
    clickableVariants?: BoardVariant[]
    /** 每行面板数量，窄屏自动折叠为单列 */
    columns?: number
    /** 占满剩余视口，列表在卡片内滚动 */
    fill?: boolean
  }>(),
  {
    clickableVariants: () => [],
    columns: 3,
    fill: false,
  },
)

const emit = defineEmits<{
  select: [payload: { item: BoardListItem; panel: WorkbenchPanel }]
}>()
</script>

<template>
  <section
    class="boards"
    :class="{ fill }"
    :style="{ '--board-columns': String(columns) }"
    :aria-label="label || '工作台'"
  >
    <article
      v-for="panel in panels"
      :key="panel.title"
      class="panel"
      :class="`panel-${panel.variant}`"
    >
      <header class="panel-head">
        <div>
          <h2>{{ panel.title }}</h2>
          <p>{{ panel.subtitle }}</p>
        </div>
        <span class="badge" :class="{ warn: panel.warn }">{{ panel.items.length }}</span>
      </header>
      <ol v-if="panel.items.length" class="list">
        <BoardRow
          v-for="item in panel.items"
          :key="item.id"
          :item="item"
          :variant="item.kind || panel.variant"
          :clickable="clickableVariants.includes(item.kind || panel.variant)"
          @select="emit('select', { item: $event, panel })"
        />
      </ol>
      <p v-else class="empty">暂无任务</p>
    </article>
  </section>
</template>

<style scoped>
.boards {
  display: grid;
  grid-template-columns: repeat(var(--board-columns, 3), minmax(0, 1fr));
  gap: 16px;
  align-items: stretch;
  animation: page-rise var(--dur-enter) var(--ease-out) 160ms both;
}

.boards.fill {
  flex: 1;
  min-height: 0;
  align-items: start;
  animation: none;
}

.boards.fill .panel {
  width: 100%;
  min-height: 0;
  max-height: 100%;
  overflow: hidden;
}

.boards.fill .list {
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.panel {
  position: relative;
  min-width: 0;
  display: flex;
  flex-direction: column;
  padding: 20px 20px 18px;
  border-radius: calc(var(--radius-lg) + 2px);
  background:
    linear-gradient(160deg, rgba(255, 255, 255, 0.78), rgba(240, 248, 252, 0.52)),
    rgba(255, 255, 255, 0.34);
  backdrop-filter: blur(18px) saturate(1.2);
  border: 1px solid rgba(255, 255, 255, 0.72);
  box-shadow:
    var(--shadow-soft),
    inset 0 1px 0 rgba(255, 255, 255, 0.85);
  overflow: hidden;
}

.panel::before {
  content: '';
  position: absolute;
  left: 0;
  top: 18px;
  bottom: 18px;
  width: 3px;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(46, 196, 214, 0.75), rgba(46, 196, 214, 0.12));
}

.panel-focus::before {
  background: linear-gradient(180deg, rgba(201, 168, 108, 0.85), rgba(201, 168, 108, 0.15));
}

.panel-key::before {
  background: linear-gradient(180deg, rgba(58, 104, 156, 0.85), rgba(58, 104, 156, 0.15));
}

.panel-reminder::before {
  background: linear-gradient(180deg, rgba(168, 72, 72, 0.8), rgba(168, 72, 72, 0.14));
}

.panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
  padding-left: 10px;
  flex-shrink: 0;
}

.panel-head h2 {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.28rem;
  font-weight: 600;
  letter-spacing: 0.03em;
  color: var(--color-ink);
}

.panel-head p {
  margin: 6px 0 0;
  font-size: 0.82rem;
  color: var(--color-ink-muted);
}

.badge {
  flex-shrink: 0;
  min-width: 2rem;
  padding: 5px 9px;
  border-radius: 10px;
  text-align: center;
  font-family: var(--font-mono);
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--color-accent);
  background: rgba(6, 20, 31, 0.04);
  border: 1px solid rgba(46, 196, 214, 0.2);
}

.badge.warn {
  color: #a84848;
  border-color: rgba(168, 72, 72, 0.28);
  background: rgba(168, 72, 72, 0.06);
}

.list {
  list-style: none;
  margin: 0;
  padding: 4px 0 0 10px;
  flex: 1;
}

.empty {
  margin: 0;
  padding: 14px 0 6px 10px;
  font-size: 0.86rem;
  color: var(--color-ink-muted);
  flex: 1;
}

@media (max-width: 1100px) {
  .boards {
    grid-template-columns: 1fr;
  }
}

/* 会议页同款任务面板材质。 */
.panel {
  padding: 18px;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-lg);
  background: linear-gradient(160deg, oklch(0.22 0.074 248 / 0.92), oklch(0.17 0.058 251 / 0.94));
  backdrop-filter: none;
  box-shadow: inset 0 1px 0 oklch(0.84 0.145 207 / 0.06);
}

.panel::before {
  top: 0;
  bottom: auto;
  left: 18px;
  width: 56px;
  height: 2px;
  border-radius: 0;
  background: var(--color-cyan);
  box-shadow: 0 0 10px oklch(0.84 0.145 207 / 0.28);
}

.panel-focus::before { background: var(--color-warn); }
.panel-key::before { background: var(--color-blue); }
.panel-reminder::before { background: var(--color-danger); }

.panel-head {
  margin-bottom: 10px;
  padding-left: 0;
}

.panel-head h2 {
  font-family: var(--font-display);
  font-size: 1.05rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  color: var(--color-ink);
}

.panel-head p,
.empty {
  color: var(--color-ink-muted);
}

.badge {
  border-color: var(--color-line);
  border-radius: 6px;
  color: var(--color-cyan);
  background: oklch(0.16 0.05 250 / 0.72);
}

.badge.warn {
  color: var(--color-danger);
  border-color: oklch(0.67 0.21 25 / 0.38);
  background: oklch(0.3 0.08 25 / 0.22);
}

.list,
.empty {
  padding-left: 0;
}
</style>
