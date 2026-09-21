<script setup lang="ts">
import { computed } from 'vue'
import { renderMarkdown } from '../utils/markdown'

const props = withDefaults(
  defineProps<{
    source: string
    compact?: boolean
    /** dark：深色协作台；light：浅色任务对话 */
    tone?: 'dark' | 'light'
  }>(),
  {
    tone: 'dark',
  },
)

const html = computed(() => renderMarkdown(props.source))
</script>

<template>
  <div
    class="md"
    :class="{ compact, light: tone === 'light' }"
    v-html="html"
  />
</template>

<style scoped>
.md {
  font-size: 0.95rem;
  line-height: 1.7;
  color: inherit;
  word-break: break-word;
}

.md.compact {
  font-size: 0.86rem;
  line-height: 1.55;
}

.md :deep(> *:first-child) {
  margin-top: 0;
}

.md :deep(> *:last-child) {
  margin-bottom: 0;
}

.md :deep(h1),
.md :deep(h2),
.md :deep(h3),
.md :deep(h4) {
  font-family: var(--font-display);
  font-weight: 600;
  line-height: 1.35;
  margin: 1em 0 0.45em;
  color: #f4f8fb;
}

.md :deep(h1) { font-size: 1.35rem; }
.md :deep(h2) { font-size: 1.2rem; }
.md :deep(h3) { font-size: 1.08rem; }

.md :deep(p) {
  margin: 0.55em 0;
}

.md :deep(ul),
.md :deep(ol) {
  margin: 0.45em 0;
  padding-left: 1.35em;
}

.md :deep(li) {
  margin: 0.25em 0;
}

.md :deep(li::marker) {
  color: var(--color-gold);
}

.md :deep(strong) {
  color: #fff8e8;
  font-weight: 650;
}

.md :deep(em) {
  color: rgba(237, 244, 248, 0.88);
}

.md :deep(blockquote) {
  margin: 0.7em 0;
  padding: 0.35em 0 0.35em 0.9em;
  border-left: 3px solid rgba(196, 163, 90, 0.65);
  color: rgba(237, 244, 248, 0.78);
  background: rgba(255, 255, 255, 0.03);
}

.md :deep(code) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.86em;
  padding: 0.12em 0.4em;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.28);
  color: #e8d5a3;
}

.md :deep(pre) {
  margin: 0.75em 0;
  padding: 12px 14px;
  overflow: auto;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.md :deep(pre code) {
  padding: 0;
  background: transparent;
  color: #e8eef4;
}

.md :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 0.8em 0;
  font-size: 0.88rem;
  overflow: hidden;
  border-radius: 10px;
}

.md :deep(th),
.md :deep(td) {
  border: 1px solid rgba(255, 255, 255, 0.12);
  padding: 8px 10px;
  text-align: left;
}

.md :deep(th) {
  background: rgba(255, 255, 255, 0.08);
  color: var(--color-gold-soft);
}

.md :deep(hr) {
  border: 0;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
  margin: 1em 0;
}

.md :deep(a) {
  color: #7ec8dd;
  text-decoration: underline;
  text-underline-offset: 2px;
}

/* —— 浅色背景（猎头任务对话） —— */
.md.light {
  color: var(--color-ink);
}

.md.light :deep(h1),
.md.light :deep(h2),
.md.light :deep(h3),
.md.light :deep(h4) {
  color: #14304a;
}

.md.light :deep(li::marker) {
  color: var(--color-accent);
}

.md.light :deep(strong) {
  color: #0f2a3d;
}

.md.light :deep(em) {
  color: #3a5568;
}

.md.light :deep(blockquote) {
  border-left-color: rgba(26, 122, 146, 0.45);
  color: #3a5568;
  background: rgba(26, 122, 146, 0.06);
}

.md.light :deep(code) {
  background: rgba(20, 40, 58, 0.08);
  color: #1a5a6e;
}

.md.light :deep(pre) {
  background: rgba(20, 40, 58, 0.06);
  border-color: rgba(20, 40, 58, 0.1);
}

.md.light :deep(pre code) {
  color: #14304a;
}

.md.light :deep(th),
.md.light :deep(td) {
  border-color: rgba(20, 40, 58, 0.12);
}

.md.light :deep(th) {
  background: rgba(26, 122, 146, 0.08);
  color: var(--color-accent);
}

.md.light :deep(hr) {
  border-top-color: rgba(20, 40, 58, 0.12);
}

.md.light :deep(a) {
  color: var(--color-accent);
}
</style>
