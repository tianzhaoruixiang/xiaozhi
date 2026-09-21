<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { ChatMessage } from '../types/assistant'
import MarkdownView from './MarkdownView.vue'

type DeliverableKind = 'shortlist' | 'online-plan' | 'offline-plan'

const KIND_META: Record<
  DeliverableKind,
  {
    agentId: string
    defaultTitle: string
    desc: string
    contentHint: RegExp
    titleFallback: string
  }
> = {
  shortlist: {
    agentId: 'candidate-synthesizer',
    defaultTitle: '推荐领域专家寻访短名单',
    desc: '综合寻访短名单 · 可查阅后同意上报 HRBP',
    contentHint: /推荐领域专家寻访短名单|最终候选人短名单|上报建议/,
    titleFallback: '# 推荐领域专家寻访短名单\n\n',
  },
  'online-plan': {
    agentId: 'online-plan-synthesizer',
    defaultTitle: '线上沟通方案',
    desc: '线上沟通正式方案 · 可查阅后同意上报 HRBP',
    contentHint: /线上沟通方案|会前检查清单|沟通话术主线/,
    titleFallback: '# 线上沟通方案\n\n',
  },
  'offline-plan': {
    agentId: 'offline-plan-synthesizer',
    defaultTitle: '线下沟通方案',
    desc: '线下沟通正式方案 · 可查阅后同意上报 HRBP',
    contentHint: /线下沟通方案|邀约话术|接待安排/,
    titleFallback: '# 线下沟通方案\n\n',
  },
}

const props = defineProps<{
  message: ChatMessage
  taskId?: string
  taskTitle?: string
}>()

const emit = defineEmits<{
  reported: [kind: DeliverableKind]
}>()

const viewing = ref(false)
const submitting = ref(false)
const submitError = ref<string | null>(null)
const submitted = ref<{
  fileName: string
  reportedAt: string
} | null>(null)

const kind = computed<DeliverableKind | null>(() => {
  const steps = props.message.steps || []
  for (const k of Object.keys(KIND_META) as DeliverableKind[]) {
    if (steps.some((s) => s.id === KIND_META[k].agentId)) return k
  }
  const content = props.message.content?.trim() || ''
  for (const k of Object.keys(KIND_META) as DeliverableKind[]) {
    if (KIND_META[k].contentHint.test(content)) return k
  }
  return null
})

const meta = computed(() => (kind.value ? KIND_META[kind.value] : null))

const synthStep = computed(() => {
  if (!meta.value) return undefined
  return props.message.steps?.find(
    (s) => s.id === meta.value!.agentId && s.status === 'done' && s.summary,
  )
})

const rawMarkdown = computed(() => {
  const fromSynth = synthStep.value?.summary?.trim()
  if (fromSynth) return fromSynth
  const content = props.message.content?.trim() || ''
  if (meta.value && meta.value.contentHint.test(content)) return content
  return ''
})

const show = computed(
  () =>
    Boolean(kind.value && rawMarkdown.value) &&
    (Boolean(synthStep.value) ||
      props.message.taskPlan?.phase === 'done' ||
      Boolean(
        props.message.steps?.some((s) => s.id === meta.value?.agentId),
      )),
)

const fileName = computed(() => {
  const base = (props.taskTitle || meta.value?.defaultTitle || '交付方案')
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '-')
    .slice(0, 40)
  return `${base || 'plan'}.md`
})

const documentMarkdown = computed(() => {
  const body = rawMarkdown.value
  if (!body) return ''
  if (/^#\s/.test(body)) return body
  return `${meta.value?.titleFallback || '# 交付方案\n\n'}${body}`
})

watch(viewing, (open) => {
  document.body.style.overflow = open ? 'hidden' : ''
})

const openViewer = () => {
  viewing.value = true
}

const closeViewer = () => {
  viewing.value = false
}

const downloadMd = () => {
  const blob = new Blob([documentMarkdown.value], {
    type: 'text/markdown;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName.value
  a.click()
  URL.revokeObjectURL(url)
}

const reportToHrbp = async () => {
  if (submitting.value || submitted.value || !kind.value) return
  submitting.value = true
  submitError.value = null
  try {
    const res = await fetch('/api/hrbp/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: props.taskTitle || meta.value?.defaultTitle || '交付方案',
        markdown: documentMarkdown.value,
        taskId: props.taskId,
        fileName: fileName.value.replace(/\.md$/i, ''),
        kind: kind.value,
      }),
    })
    if (!res.ok) {
      const detail = await res.text()
      throw new Error(detail || `上报失败（${res.status}）`)
    }
    const data = (await res.json()) as {
      fileName?: string
      reportedAt?: string
    }
    submitted.value = {
      fileName: data.fileName || fileName.value,
      reportedAt: data.reportedAt || new Date().toISOString(),
    }
    emit('reported', kind.value)
  } catch (err) {
    submitError.value =
      err instanceof Error ? err.message : '上报 HRBP 失败，请稍后重试'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div v-if="show" class="deliverable">
    <header class="head">
      <div>
        <p class="eyebrow">交付物</p>
        <h3>{{ fileName }}</h3>
        <p class="desc">{{ meta?.desc }}</p>
      </div>
      <span class="badge" :data-state="submitted ? 'done' : 'ready'">
        {{ submitted ? '已上报' : '待确认' }}
      </span>
    </header>

    <div class="actions">
      <button type="button" class="btn ghost" @click="openViewer">查阅 MD</button>
      <button type="button" class="btn ghost" @click="downloadMd">下载 .md</button>
      <button
        type="button"
        class="btn primary"
        :disabled="submitting || Boolean(submitted)"
        @click="reportToHrbp"
      >
        {{ submitted ? '已同意并上报' : submitting ? '上报中…' : '同意并上报 HRBP' }}
      </button>
    </div>

    <p v-if="submitError" class="error">{{ submitError }}</p>
    <p v-else-if="submitted" class="ok">
      已上报 HRBP · 存档 {{ submitted.fileName }}
    </p>
  </div>

  <Teleport to="body">
    <div class="drawer-layer" :class="{ open: viewing }" :aria-hidden="!viewing">
      <button
        type="button"
        class="drawer-backdrop"
        aria-label="关闭方案查阅"
        @click="closeViewer"
      />
      <aside
        class="drawer"
        :class="{ open: viewing }"
        role="dialog"
        aria-modal="true"
        aria-label="方案 Markdown 查阅"
      >
        <header class="drawer-head">
          <div>
            <p class="drawer-eyebrow">Markdown 查阅</p>
            <h2>{{ fileName }}</h2>
            <p class="drawer-meta">{{ meta?.defaultTitle }}</p>
          </div>
          <div class="drawer-actions">
            <button type="button" class="btn ghost" @click="downloadMd">下载</button>
            <button type="button" class="icon-close" aria-label="关闭" @click="closeViewer">
              ×
            </button>
          </div>
        </header>
        <div class="drawer-body">
          <MarkdownView tone="light" :source="documentMarkdown" />
        </div>
        <footer class="drawer-foot">
          <button type="button" class="btn ghost" @click="closeViewer">关闭</button>
          <button
            type="button"
            class="btn primary"
            :disabled="submitting || Boolean(submitted)"
            @click="reportToHrbp"
          >
            {{ submitted ? '已同意并上报' : submitting ? '上报中…' : '同意并上报 HRBP' }}
          </button>
        </footer>
      </aside>
    </div>
  </Teleport>
</template>

<style scoped>
.deliverable {
  margin-top: 12px;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid rgba(26, 122, 146, 0.22);
  background:
    linear-gradient(160deg, rgba(46, 196, 214, 0.1), rgba(255, 255, 255, 0.7));
}

.head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.eyebrow {
  margin: 0 0 4px;
  font-family: var(--font-mono);
  font-size: 0.68rem;
  color: var(--color-accent);
}

.head h3 {
  margin: 0;
  font-size: 0.98rem;
  font-weight: 600;
  color: #14304a;
  word-break: break-all;
}

.desc {
  margin: 4px 0 0;
  font-size: 0.8rem;
  color: var(--color-ink-muted);
}

.badge {
  flex-shrink: 0;
  font-family: var(--font-mono);
  font-size: 0.68rem;
  letter-spacing: 0.04em;
  padding: 3px 8px;
  border-radius: 999px;
  border: 1px solid rgba(20, 40, 58, 0.12);
  color: var(--color-ink-muted);
  background: rgba(255, 255, 255, 0.7);
}

.badge[data-state='ready'] {
  color: #8a6a2e;
  border-color: rgba(201, 168, 108, 0.4);
  background: rgba(201, 168, 108, 0.12);
}

.badge[data-state='done'] {
  color: #1a7a5c;
  border-color: rgba(26, 122, 92, 0.3);
  background: rgba(26, 122, 92, 0.1);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.btn {
  border-radius: 999px;
  padding: 7px 12px;
  font-size: 0.8rem;
  cursor: pointer;
}

.btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.btn.ghost {
  border: 1px solid rgba(20, 40, 58, 0.12);
  background: rgba(255, 255, 255, 0.75);
  color: var(--color-ink);
}

.btn.ghost:hover:not(:disabled) {
  border-color: rgba(46, 196, 214, 0.35);
  color: var(--color-accent);
}

.btn.primary {
  border: 0;
  background: linear-gradient(160deg, #1f8ea8, #176f84);
  color: #fff;
  font-weight: 600;
}

.error {
  margin: 8px 0 0;
  font-size: 0.82rem;
  color: #a84848;
}

.ok {
  margin: 8px 0 0;
  font-size: 0.82rem;
  color: #1a7a5c;
}

.drawer-layer {
  position: fixed;
  inset: 0;
  z-index: 80;
  pointer-events: none;
}

.drawer-layer.open {
  pointer-events: auto;
}

.drawer-backdrop {
  position: absolute;
  inset: 0;
  border: 0;
  background: rgba(8, 20, 32, 0.38);
  opacity: 0;
  transition: opacity 220ms ease;
  cursor: pointer;
}

.drawer-layer.open .drawer-backdrop {
  opacity: 1;
}

.drawer {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: min(560px, 100vw);
  display: flex;
  flex-direction: column;
  background:
    linear-gradient(165deg, rgba(255, 255, 255, 0.96), rgba(236, 245, 250, 0.94));
  border-left: 1px solid rgba(255, 255, 255, 0.8);
  box-shadow: -18px 0 48px rgba(8, 28, 42, 0.18);
  transform: translateX(104%);
  transition: transform 260ms cubic-bezier(0.22, 1, 0.36, 1);
}

.drawer.open {
  transform: translateX(0);
}

.drawer-head {
  flex-shrink: 0;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 20px 20px 14px;
  border-bottom: 1px solid rgba(20, 40, 58, 0.08);
}

.drawer-eyebrow {
  margin: 0 0 4px;
  font-family: var(--font-mono);
  font-size: 0.7rem;
  color: var(--color-accent);
}

.drawer-head h2 {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.2rem;
  font-weight: 600;
  color: #14304a;
  word-break: break-all;
}

.drawer-meta {
  margin: 6px 0 0;
  font-size: 0.82rem;
  color: var(--color-ink-muted);
}

.drawer-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.icon-close {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: 1px solid rgba(20, 40, 58, 0.12);
  background: rgba(255, 255, 255, 0.8);
  color: #14304a;
  font-size: 1.4rem;
  line-height: 1;
  cursor: pointer;
}

.icon-close:hover {
  border-color: rgba(46, 196, 214, 0.35);
  color: var(--color-accent);
}

.drawer-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 18px 20px 24px;
}

.drawer-foot {
  flex-shrink: 0;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 16px 16px;
  border-top: 1px solid rgba(20, 40, 58, 0.08);
  background: rgba(255, 255, 255, 0.55);
}

@media (max-width: 640px) {
  .drawer {
    width: 100vw;
  }
}
</style>
