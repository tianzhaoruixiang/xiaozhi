<script setup lang="ts">
export type BoardItemStatus = 'todo' | 'doing' | 'done'

export interface BoardListItem {
  id: string
  time: string
  title: string
  detail: string
  status: BoardItemStatus
  /** 同一待办列表内区分重点工作 / 提醒 */
  kind?: 'todo' | 'focus' | 'key' | 'reminder'
}

const props = defineProps<{
  item: BoardListItem
  variant?: 'todo' | 'focus' | 'key' | 'reminder'
  clickable?: boolean
  active?: boolean
  brief?: boolean
}>()

const emit = defineEmits<{
  select: [item: BoardListItem]
}>()

const statusLabel: Record<BoardItemStatus, string> = {
  todo: '待办',
  doing: '推进中',
  done: '已完成',
}

const onActivate = () => {
  if (!props.clickable) return
  emit('select', props.item)
}
</script>

<template>
  <li
    class="row"
    :class="{ clickable, active, brief }"
    :data-variant="item.kind || variant || 'todo'"
    :data-status="item.status"
    :role="clickable ? 'button' : undefined"
    :tabindex="clickable ? 0 : undefined"
    :aria-current="active ? 'true' : undefined"
    @click="onActivate"
    @keydown.enter.prevent="onActivate"
    @keydown.space.prevent="onActivate"
  >
    <div class="when">{{ item.time }}</div>
    <div class="main">
      <div class="title-row">
        <h3>{{ item.title }}</h3>
        <span v-if="!brief && item.kind === 'focus'" class="mark">重点</span>
        <span
          v-if="brief ? item.status === 'doing' : (item.kind || variant) !== 'reminder'"
          class="status"
        >{{ statusLabel[item.status] }}</span>
      </div>
      <p v-if="!brief">{{ item.detail }}</p>
    </div>
  </li>
</template>

<style scoped>
.row {
  display: grid;
  grid-template-columns: 72px 1fr;
  gap: 6px 14px;
  padding: 8px 0;
  border-bottom: 1px solid rgba(20, 40, 58, 0.07);
}

.row:last-child {
  border-bottom: 0;
  padding-bottom: 0;
}

.row:first-child {
  padding-top: 0;
}

.when {
  font-family: var(--font-mono);
  font-size: 0.82rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--color-accent);
  padding-top: 2px;
}

.main h3 {
  margin: 0;
  font-size: 0.98rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  color: var(--color-ink);
}

.title-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.main p {
  margin: 0;
  font-size: 0.86rem;
  line-height: 1.55;
  color: var(--color-ink-muted);
}

.status {
  font-family: var(--font-mono);
  font-size: 0.64rem;
  letter-spacing: 0.04em;
  padding: 2px 7px;
  border-radius: 6px;
  color: var(--color-ink-muted);
  background: rgba(20, 40, 58, 0.04);
  border: 1px solid rgba(20, 40, 58, 0.08);
}

.row[data-status='doing'] .status {
  color: var(--color-accent);
  background: rgba(26, 122, 146, 0.1);
  border-color: rgba(46, 196, 214, 0.28);
}

.row[data-status='done'] {
  opacity: 0.62;
}

.row[data-variant='reminder'] .when {
  color: #a84848;
}

.mark {
  font-size: 0.64rem;
  letter-spacing: 0.04em;
  padding: 2px 7px;
  border-radius: 6px;
  color: #8a6a2e;
  background: rgba(201, 168, 108, 0.16);
  border: 1px solid rgba(201, 168, 108, 0.32);
}

.row[data-variant='focus'] .when {
  color: #8a6a2e;
}

.row[data-variant='key'] .when {
  color: #3a689c;
}

.row.clickable {
  cursor: pointer;
  margin: 0 -8px;
  padding-left: 8px;
  padding-right: 8px;
  border-radius: 10px;
  border-bottom-color: transparent;
  transition: background 160ms ease, box-shadow 160ms ease;
}

.row.clickable + .row.clickable {
  margin-top: 2px;
}

.row.clickable:hover,
.row.clickable:focus-visible {
  outline: none;
  background: rgba(255, 255, 255, 0.55);
  box-shadow: inset 0 0 0 1px rgba(46, 196, 214, 0.22);
}

.row.clickable.active {
  background: rgba(46, 196, 214, 0.12);
  box-shadow: inset 0 0 0 1px rgba(46, 196, 214, 0.35);
}

.row.brief {
  grid-template-columns: 88px 1fr;
  gap: 8px 22px;
  padding: 18px 0;
  border-bottom-color: rgba(20, 40, 58, 0.06);
}

.row.brief .when {
  font-size: 1.05rem;
  padding-top: 6px;
}

.row.brief .main h3 {
  font-size: clamp(1.18rem, 2vw, 1.38rem);
  font-weight: 650;
  line-height: 1.35;
}

.row.brief .title-row {
  margin-bottom: 0;
  gap: 12px;
}

.row.brief .status {
  font-size: 0.78rem;
  padding: 3px 9px;
}

@media (max-width: 720px) {
  .row {
    grid-template-columns: 1fr;
    gap: 4px;
  }
}
</style>
