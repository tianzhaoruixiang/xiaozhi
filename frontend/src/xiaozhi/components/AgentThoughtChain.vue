<script setup lang="ts">
import { computed } from 'vue'
import type { CollabStep, ToolCallRecord } from '../types/assistant'
import MarkdownView from './MarkdownView.vue'

export type ChainKind = 'prompt' | 'think' | 'tool' | 'result' | 'error'

export interface ChainItem {
  id: string
  kind: ChainKind
  label: string
  text?: string
  tool?: ToolCallRecord
  live?: boolean
}

const props = withDefaults(
  defineProps<{
    step: CollabStep
    tone?: 'dark' | 'light'
  }>(),
  { tone: 'dark' },
)

const isToolLog = (line: string) =>
  /^(开始调用|调用完成|调用失败|任务完成)/.test(line)

const items = computed((): ChainItem[] => {
  const s = props.step
  const out: ChainItem[] = []

  if (s.objective) {
    out.push({
      id: `${s.id}-prompt`,
      kind: 'prompt',
      label: '任务指令',
      text: s.objective,
    })
  }

  const thinkLogs = (s.logs ?? []).filter((line) => !isToolLog(line))
  thinkLogs.forEach((line, i) => {
    out.push({
      id: `${s.id}-think-${i}`,
      kind: 'think',
      label: '思考',
      text: line,
      live: s.status === 'running' && i === thinkLogs.length - 1 && !s.tools?.some((t) => t.status === 'running'),
    })
  })

  ;(s.tools ?? []).forEach((tool, i) => {
    const isLast =
      s.status === 'running' &&
      i === (s.tools?.length ?? 0) - 1 &&
      tool.status === 'running'
    out.push({
      id: tool.id,
      kind: 'tool',
      label: tool.toolLabel,
      text: tool.summary,
      tool,
      live: isLast,
    })
  })

  if (s.status === 'error' && s.summary) {
    out.push({
      id: `${s.id}-error`,
      kind: 'error',
      label: '执行失败',
      text: s.summary,
    })
  } else if (s.summary && (s.status === 'done' || s.status === 'error')) {
    out.push({
      id: `${s.id}-result`,
      kind: 'result',
      label: '产出结果',
      text: s.summary,
    })
  } else if (s.summary && s.status === 'running') {
    // 流式过程中的阶段性产出，作为思考片段
    out.push({
      id: `${s.id}-draft`,
      kind: 'think',
      label: '阶段性思考',
      text: s.summary,
      live: true,
    })
  }

  return out
})

const toolStatusText = (status: ToolCallRecord['status']) => {
  if (status === 'running') return '调用中'
  if (status === 'error') return '失败'
  return '已完成'
}
</script>

<template>
  <ol v-if="items.length" class="cot" :data-tone="tone" aria-label="思考与执行链">
    <li
      v-for="(item, index) in items"
      :key="item.id"
      class="cot-step"
      :data-kind="item.kind"
      :data-live="item.live ? '1' : undefined"
      :data-tool-status="item.tool?.status"
    >
      <div class="rail" aria-hidden="true">
        <span class="node">
          <template v-if="item.kind === 'prompt'">◎</template>
          <template v-else-if="item.kind === 'tool'">⌁</template>
          <template v-else-if="item.kind === 'result'">✓</template>
          <template v-else-if="item.kind === 'error'">!</template>
          <template v-else>✧</template>
        </span>
        <span v-if="index < items.length - 1" class="spine" />
      </div>

      <div class="body">
        <div class="meta">
          <span class="label" :class="{ shimmer: item.live }">{{ item.label }}</span>
          <em v-if="item.tool" class="tool-state">{{ toolStatusText(item.tool.status) }}</em>
        </div>

        <p v-if="item.kind === 'prompt' && item.text" class="prompt">{{ item.text }}</p>

        <p v-else-if="item.kind === 'think' && item.text" class="think">{{ item.text }}</p>

        <div v-else-if="item.kind === 'tool' && item.tool" class="tool-card">
          <p class="tool-summary">{{ item.tool.summary }}</p>
          <p v-if="item.tool.recipients?.length" class="recipients">
            收件人：{{ item.tool.recipients.join('、') }}
          </p>
        </div>

        <div v-else-if="item.kind === 'result' && item.text" class="result">
          <MarkdownView :tone="tone" :source="item.text" />
        </div>

        <p v-else-if="item.kind === 'error' && item.text" class="error">{{ item.text }}</p>
      </div>
    </li>
  </ol>
</template>

<style scoped>
.cot {
  list-style: none;
  margin: 0;
  padding: 4px 0 0;
  display: grid;
  gap: 0;
}

.cot-step {
  display: grid;
  grid-template-columns: 22px 1fr;
  gap: 10px;
  align-items: stretch;
}

.rail {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 2px;
}

.node {
  width: 20px;
  height: 20px;
  border-radius: 7px;
  display: grid;
  place-items: center;
  font-size: 0.68rem;
  line-height: 1;
  flex-shrink: 0;
  background: rgba(14, 42, 66, 0.85);
  border: 1px solid rgba(94, 200, 232, 0.35);
  color: #9ad8ea;
}

.cot-step[data-kind='think'] .node {
  color: rgba(232, 213, 163, 0.95);
  border-color: rgba(196, 163, 90, 0.4);
}

.cot-step[data-kind='tool'] .node {
  color: #9ad8ea;
}

.cot-step[data-tool-status='running'] .node,
.cot-step[data-live='1'] .node {
  animation: blink 1s ease-in-out infinite;
  border-color: rgba(196, 163, 90, 0.65);
  color: #e8d5a3;
}

.cot-step[data-kind='result'] .node {
  color: #9be4c4;
  border-color: rgba(93, 202, 160, 0.45);
  background: rgba(20, 48, 40, 0.85);
}

.cot-step[data-kind='error'] .node {
  color: #ffb4b4;
  border-color: rgba(168, 72, 72, 0.5);
}

.spine {
  flex: 1;
  width: 1px;
  min-height: 12px;
  margin: 4px 0 0;
  background: linear-gradient(
    180deg,
    rgba(94, 200, 232, 0.45),
    rgba(94, 200, 232, 0.08)
  );
}

.body {
  min-width: 0;
  padding-bottom: 14px;
}

.meta {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}

.label {
  font-family: var(--font-mono);
  font-size: 0.68rem;
  letter-spacing: 0.08em;
  color: rgba(158, 216, 234, 0.8);
}

.tool-state {
  font-style: normal;
  font-family: var(--font-mono);
  font-size: 0.66rem;
  letter-spacing: 0.04em;
  color: rgba(232, 213, 163, 0.85);
}

.cot-step[data-tool-status='done'] .tool-state {
  color: #9be4c4;
}

.cot-step[data-tool-status='error'] .tool-state {
  color: #ffb4b4;
}

.prompt {
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.55;
  color: rgba(210, 236, 245, 0.92);
}

.think {
  margin: 0;
  font-size: 0.86rem;
  line-height: 1.55;
  color: rgba(237, 244, 248, 0.68);
  white-space: pre-wrap;
  word-break: break-word;
}

.cot-step[data-live='1'] .think {
  color: rgba(237, 244, 248, 0.88);
}

.tool-card {
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(42, 180, 210, 0.08);
  border: 1px solid rgba(94, 200, 232, 0.28);
}

.cot-step[data-tool-status='running'] .tool-card {
  border-color: rgba(196, 163, 90, 0.45);
  box-shadow: 0 0 16px rgba(196, 163, 90, 0.1);
}

.cot-step[data-tool-status='done'] .tool-card {
  border-color: rgba(93, 202, 160, 0.35);
  background: rgba(93, 202, 160, 0.07);
}

.cot-step[data-tool-status='error'] .tool-card {
  border-color: rgba(168, 72, 72, 0.4);
  background: rgba(168, 72, 72, 0.1);
}

.tool-summary {
  margin: 0;
  font-size: 0.86rem;
  line-height: 1.5;
  color: rgba(237, 244, 248, 0.86);
}

.recipients {
  margin: 6px 0 0;
  font-size: 0.8rem;
  color: rgba(158, 216, 234, 0.95);
}

.result {
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.22);
  border: 1px solid rgba(255, 255, 255, 0.08);
  max-height: none;
  overflow: visible;
  font-size: 0.92rem;
  line-height: 1.65;
}

.error {
  margin: 0;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(168, 72, 72, 0.12);
  border: 1px solid rgba(168, 72, 72, 0.35);
  color: #ffc9c9;
  font-size: 0.86rem;
  line-height: 1.5;
}

.shimmer {
  background: linear-gradient(
    90deg,
    rgba(232, 213, 163, 0.45),
    rgba(232, 213, 163, 1),
    rgba(232, 213, 163, 0.45)
  );
  background-size: 200% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  animation: shimmer 1.6s linear infinite;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

@keyframes blink {
  50% { opacity: 0.45; }
}

/* 浅色气泡（猎头工作台） */
.cot[data-tone='light'] .node {
  background: rgba(46, 196, 214, 0.12);
  border-color: rgba(26, 122, 146, 0.3);
  color: var(--color-accent);
}

.cot[data-tone='light'] .cot-step[data-kind='think'] .node {
  color: #8a6a2e;
  border-color: rgba(201, 168, 108, 0.45);
}

.cot[data-tone='light'] .cot-step[data-kind='result'] .node {
  color: #1a7a5c;
  border-color: rgba(26, 122, 92, 0.35);
  background: rgba(26, 122, 92, 0.08);
}

.cot[data-tone='light'] .spine {
  background: linear-gradient(180deg, rgba(46, 196, 214, 0.4), rgba(46, 196, 214, 0.08));
}

.cot[data-tone='light'] .label {
  color: var(--color-accent);
}

.cot[data-tone='light'] .tool-state {
  color: #8a6a2e;
}

.cot[data-tone='light'] .cot-step[data-tool-status='done'] .tool-state {
  color: #1a7a5c;
}

.cot[data-tone='light'] .prompt,
.cot[data-tone='light'] .think,
.cot[data-tone='light'] .tool-summary {
  color: #14304a;
}

.cot[data-tone='light'] .cot-step[data-live='1'] .think {
  color: #0f2a3d;
}

.cot[data-tone='light'] .tool-card {
  background: rgba(46, 196, 214, 0.06);
  border-color: rgba(46, 196, 214, 0.22);
}

.cot[data-tone='light'] .recipients {
  color: var(--color-accent);
}

.cot[data-tone='light'] .result {
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(20, 40, 58, 0.08);
}

.cot[data-tone='light'] .error {
  color: #a84848;
  background: rgba(168, 72, 72, 0.06);
}
</style>
