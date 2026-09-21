<script setup lang="ts">
import { computed, ref } from 'vue'
import { formatClock, useReviews } from '../data/reviews'
import MarkdownView from './MarkdownView.vue'

const { approved } = useReviews()

/** 展开查看成果正文的条目 */
const opened = ref<Record<string, boolean>>({})
const isOpen = (id: string) => opened.value[id] === true
const toggle = (id: string) => {
  opened.value = { ...opened.value, [id]: !isOpen(id) }
}

const items = computed(() => [...approved.value].reverse())
</script>

<template>
  <section class="panel" aria-label="已收成果">
    <header class="panel-head">
      <div>
        <h2>已收成果</h2>
        <p>王处审核通过后自动提交到本台</p>
      </div>
      <span class="badge">{{ approved.length }}</span>
    </header>

    <p v-if="!items.length" class="empty">暂无已审核成果</p>

    <ul v-else class="list">
      <li
        v-for="item in items"
        :key="item.id"
        class="row"
        :data-open="isOpen(item.id) ? '1' : '0'"
      >
        <div class="row-main">
          <span class="row-meta">
            <strong>{{ item.taskTitle }}</strong>
            <em>
              {{ item.submittedBy }} 提交 · {{ item.reviewedBy }} 审核通过 ·
              {{ formatClock(item.forwardedAt || item.reviewedAt || '') }} 转交{{ item.forwardedTo }}
            </em>
          </span>
          <button type="button" class="toggle" @click="toggle(item.id)">
            {{ isOpen(item.id) ? '收起' : '查看成果' }}
          </button>
        </div>

        <div v-if="isOpen(item.id)" class="doc">
          <MarkdownView tone="light" :source="item.markdown" />
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.panel {
  position: relative;
  flex-shrink: 0;
  margin-bottom: 16px;
  padding: 18px;
  border-radius: calc(var(--radius-lg) + 2px);
  border: 1px solid rgba(255, 255, 255, 0.72);
  background:
    linear-gradient(160deg, rgba(255, 255, 255, 0.78), rgba(240, 248, 252, 0.52)),
    rgba(255, 255, 255, 0.34);
  backdrop-filter: blur(18px) saturate(1.2);
  box-shadow:
    var(--shadow-soft),
    inset 0 1px 0 rgba(255, 255, 255, 0.85);
  animation: page-rise var(--dur-enter) var(--ease-out) 120ms both;
}

.panel::before {
  position: absolute;
  top: 18px;
  bottom: 18px;
  left: 0;
  width: 3px;
  border-radius: 999px;
  content: '';
  background: linear-gradient(180deg, rgba(47, 125, 90, 0.85), rgba(47, 125, 90, 0.15));
}

.panel-head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
}

.panel-head h2 {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--color-ink);
}

.panel-head p {
  margin: 5px 0 0;
  font-size: 0.78rem;
  color: var(--color-ink-muted);
}

.badge {
  min-width: 2rem;
  padding: 4px 9px;
  border: 1px solid rgba(47, 125, 90, 0.28);
  border-radius: 8px;
  background: rgba(47, 125, 90, 0.1);
  color: var(--color-success);
  font-family: var(--font-mono);
  font-size: 0.88rem;
  font-weight: 700;
  text-align: center;
}

.empty {
  margin: 0;
  font-size: 0.84rem;
  color: var(--color-ink-muted);
}

.list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 0;
  padding: 0;
}

.row {
  padding: 11px 13px;
  border: 1px solid rgba(20, 40, 58, 0.08);
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.72);
}

.row-main {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.row-meta {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.row-meta strong {
  font-size: 0.9rem;
  color: var(--color-ink);
}

.row-meta em {
  font-style: normal;
  font-size: 0.74rem;
  color: var(--color-ink-muted);
}

.toggle {
  flex-shrink: 0;
  padding: 5px 12px;
  border: 1px solid rgba(26, 122, 146, 0.34);
  border-radius: 8px;
  background: transparent;
  color: var(--color-accent);
  font-size: 0.76rem;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 160ms ease, color 160ms ease;
}

.toggle:hover {
  border-color: rgba(26, 122, 146, 0.62);
}

.doc {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(20, 40, 58, 0.08);
  max-height: 34vh;
  overflow-y: auto;
}
</style>
