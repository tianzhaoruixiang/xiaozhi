<script setup lang="ts">
import { ref } from 'vue'
import {
  STATUS_META,
  countDoneTasks,
  groupProgress,
  groupStatus,
  type TaskGroup,
} from '../data/groupTasks'
import TaskProgressBar from './TaskProgressBar.vue'

defineProps<{
  groups: TaskGroup[]
  summary: {
    groupCount: number
    taskCount: number
    memberCount: number
    doneCount: number
    riskCount: number
    progress: number
  }
}>()

/** 默认收起各组任务明细；用户展开后记在 opened 里 */
const opened = ref<Record<string, boolean>>({})

const isOpen = (id: string) => opened.value[id] === true

const toggle = (id: string) => {
  opened.value = { ...opened.value, [id]: !isOpen(id) }
}
</script>

<template>
  <section class="board" aria-label="专项任务 · 各组任务进展">
    <header class="board-head">
      <div class="board-title">
        <h2>专项任务</h2>
        <p>各组任务进展汇总</p>
      </div>
      <dl class="stats">
        <div><dt>组</dt><dd>{{ summary.groupCount }}</dd></div>
        <div><dt>任务</dt><dd>{{ summary.taskCount }}</dd></div>
        <div><dt>完成</dt><dd>{{ summary.doneCount }}</dd></div>
        <div :data-warn="summary.riskCount > 0"><dt>受阻</dt><dd>{{ summary.riskCount }}</dd></div>
        <div><dt>总进度</dt><dd>{{ summary.progress }}%</dd></div>
      </dl>
    </header>

    <ol class="groups">
      <li
        v-for="(group, index) in groups"
        :key="group.id"
        class="group"
        :data-status="groupStatus(group)"
        :data-open="isOpen(group.id) ? '1' : '0'"
      >
        <button
          type="button"
          class="group-top"
          :aria-expanded="isOpen(group.id)"
          @click="toggle(group.id)"
        >
          <span class="g-index">{{ String(index + 1).padStart(2, '0') }}</span>
          <span class="g-name">
            <strong>
              {{ group.name }}
              <span v-if="group.current" class="current-tag">当前组</span>
            </strong>
            <em>组长 {{ group.lead }} · {{ group.scope }}</em>
          </span>
          <span class="g-meta">
            <span class="chip" :data-status="groupStatus(group)">
              {{ STATUS_META[groupStatus(group)].label }}
            </span>
            <span class="g-count">
              {{ countDoneTasks(group) }}/{{ group.tasks.length }}
            </span>
            <span class="chev">{{ isOpen(group.id) ? '收起' : '展开' }}</span>
          </span>
        </button>

        <div class="g-progress">
          <TaskProgressBar :progress="groupProgress(group)" :status="groupStatus(group)" />
        </div>

        <ul v-show="isOpen(group.id)" class="tasks">
          <li
            v-for="task in group.tasks"
            :key="task.id"
            class="task"
            :data-status="task.status"
          >
            <div class="t-head">
              <strong>{{ task.title }}</strong>
              <span class="chip" :data-status="task.status">
                {{ STATUS_META[task.status].label }}
              </span>
            </div>
            <p class="t-detail">{{ task.detail }}</p>
            <TaskProgressBar compact :progress="task.progress" :status="task.status" />
            <div class="t-foot">
              <span>负责人 {{ task.owner }}</span>
              <span>{{ task.due }}</span>
              <span>{{ task.members.length }} 名成员</span>
            </div>
          </li>
        </ul>
      </li>
    </ol>
  </section>
</template>

<style scoped>
.board {
  position: relative;
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
  animation: page-rise var(--dur-enter) var(--ease-out) 160ms both;
}

.board::before {
  position: absolute;
  top: 18px;
  bottom: 18px;
  left: 0;
  width: 3px;
  border-radius: 999px;
  content: '';
  background: linear-gradient(180deg, rgba(201, 168, 108, 0.85), rgba(201, 168, 108, 0.15));
}

.board-head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px 20px;
  padding-bottom: 14px;
  margin-bottom: 14px;
  border-bottom: 1px solid rgba(20, 40, 58, 0.08);
}

.board-title h2 {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.28rem;
  font-weight: 600;
  letter-spacing: 0.03em;
  color: var(--color-ink);
}

.board-title p {
  margin: 6px 0 0;
  font-size: 0.82rem;
  color: var(--color-ink-muted);
}

.stats {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0;
}

.stats div {
  display: flex;
  align-items: baseline;
  gap: 6px;
  padding: 6px 10px;
  border: 1px solid rgba(20, 40, 58, 0.1);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.72);
}

.stats dt {
  font-size: 0.7rem;
  color: var(--color-ink-muted);
}

.stats dd {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 0.92rem;
  font-weight: 700;
  color: var(--color-accent);
}

.stats div[data-warn='true'] {
  border-color: rgba(168, 72, 72, 0.28);
  background: rgba(168, 72, 72, 0.06);
}

.stats div[data-warn='true'] dd { color: var(--color-danger); }

.groups {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 0;
  padding: 0;
}

.group {
  padding: 14px;
  border: 1px solid rgba(20, 40, 58, 0.08);
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.66);
}

.group[data-status='risk'] { border-color: rgba(168, 72, 72, 0.32); }
.group[data-status='done'] { border-color: rgba(47, 125, 90, 0.28); }

.group-top {
  width: 100%;
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 10px 12px;
  align-items: center;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  text-align: left;
}

.g-index {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border: 1px solid rgba(46, 196, 214, 0.32);
  border-radius: 9px;
  background: rgba(46, 196, 214, 0.1);
  color: var(--color-accent);
  font-family: var(--font-mono);
  font-size: 0.78rem;
  font-weight: 700;
}

.g-name {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.g-name strong {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.96rem;
  color: var(--color-ink);
}

.current-tag {
  padding: 1px 7px;
  border: 1px solid rgba(26, 122, 146, 0.3);
  border-radius: 999px;
  background: rgba(26, 122, 146, 0.08);
  color: var(--color-accent);
  font-size: 0.64rem;
  font-weight: 600;
  letter-spacing: 0.04em;
}

.g-name em {
  font-style: normal;
  font-size: 0.76rem;
  color: var(--color-ink-muted);
}

.g-meta {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.g-count {
  font-family: var(--font-mono);
  font-size: 0.78rem;
  color: var(--color-ink-muted);
}

.chev {
  min-width: 2.2rem;
  text-align: right;
  font-size: 0.74rem;
  color: var(--color-accent);
}

.chip {
  flex-shrink: 0;
  padding: 2px 8px;
  border: 1px solid rgba(20, 40, 58, 0.12);
  border-radius: 6px;
  font-family: var(--font-mono);
  font-size: 0.68rem;
  color: var(--color-ink-muted);
  background: rgba(255, 255, 255, 0.7);
}

.chip[data-status='doing'] {
  color: var(--color-accent);
  border-color: rgba(46, 196, 214, 0.34);
  background: rgba(46, 196, 214, 0.12);
}

.chip[data-status='done'] {
  color: var(--color-success);
  border-color: rgba(47, 125, 90, 0.28);
  background: rgba(47, 125, 90, 0.1);
}

.chip[data-status='risk'] {
  color: var(--color-danger);
  border-color: rgba(168, 72, 72, 0.3);
  background: rgba(168, 72, 72, 0.1);
}

.chip[data-status='todo'] {
  color: var(--color-warn);
  border-color: rgba(184, 122, 53, 0.3);
  background: rgba(184, 122, 53, 0.12);
}

.g-progress {
  margin-top: 10px;
}

.tasks {
  list-style: none;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 10px;
  margin: 12px 0 0;
  padding: 12px 0 0;
  border-top: 1px dashed rgba(20, 40, 58, 0.1);
}

.task {
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 12px;
  border: 1px solid rgba(20, 40, 58, 0.08);
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.78);
}

.task[data-status='risk'] { border-color: rgba(168, 72, 72, 0.28); }

.t-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.t-head strong {
  font-size: 0.88rem;
  line-height: 1.4;
  color: #14304a;
}

.t-detail {
  margin: 0;
  font-size: 0.76rem;
  line-height: 1.5;
  color: var(--color-ink-muted);
}

.t-foot {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  font-size: 0.72rem;
  color: var(--color-ink-muted);
}

@media (max-width: 720px) {
  .board { padding: 16px; }
  .group-top { grid-template-columns: auto 1fr; }
  .g-meta { grid-column: 1 / -1; justify-content: space-between; }
}
</style>
