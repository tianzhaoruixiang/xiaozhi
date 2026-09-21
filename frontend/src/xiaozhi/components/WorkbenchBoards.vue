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
  }>(),
  {
    clickableVariants: () => [],
    columns: 3,
  },
)

const emit = defineEmits<{
  select: [payload: { item: BoardListItem; panel: WorkbenchPanel }]
}>()
</script>

<template>
  <section
    class="boards"
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
          :variant="panel.variant"
          :clickable="clickableVariants.includes(panel.variant)"
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
  margin-bottom: 14px;
  padding-left: 10px;
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
</style>
