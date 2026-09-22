<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import {
  STATUS_META,
  countDoneTasks,
  groupProgress,
  groupStatus,
  type TaskGroup,
} from '../data/groupTasks'
import { formatClock, useReviews } from '../data/reviews'
import TaskProgressBar from './TaskProgressBar.vue'

const props = defineProps<{
  groups: TaskGroup[]
}>()

const { approved } = useReviews()

/** 所有工作组的任务拉平成一个列表，只保留任务自身的进展信息与所属组名 */
const allTasks = computed(() =>
  props.groups.flatMap((group) =>
    group.tasks.map((task) => ({ ...task, uid: `${group.id}-${task.id}`, groupName: group.name })),
  ),
)

const totalTasks = computed(() => allTasks.value.length)

/** 该组已完成为成果的任务标题 */
const doneTitlesOf = (group: TaskGroup) =>
  group.tasks.filter((task) => task.status === 'done').map((task) => task.title)

/** 该组已交高总的成果（优先按 groupId 归属，兼容旧数据按任务名匹配） */
const handedOverOf = (group: TaskGroup) =>
  approved.value.filter((item) =>
    item.groupId
      ? item.groupId === group.id
      : group.tasks.some((task) => task.title === item.taskTitle),
  )

const riskCountOf = (group: TaskGroup) =>
  group.tasks.filter((task) => task.status === 'risk').length
</script>

<template>
  <section class="board" aria-label="专项任务 · 各组任务进展与工作组进度成果">
    <header class="board-head">
      <div class="board-title">
        <h2>专项任务</h2>
        <p>左侧为各组任务进展，右侧为各工作组进度与成果</p>
      </div>
      <div class="head-right">
        <RouterLink class="summary-btn" to="/command/task">
          任务总结
          <b aria-hidden="true">→</b>
        </RouterLink>
        <span class="head-meta">共 {{ totalTasks }} 项任务</span>
      </div>
    </header>

    <div class="board-body">
      <!-- 左：所有组的任务进展（不含工作组与成员信息） -->
      <div class="tasks-col">
        <h3 class="col-title">
          各组任务进展
          <span class="col-count">{{ totalTasks }}</span>
        </h3>

        <ol class="tasks">
          <li
            v-for="(task, index) in allTasks"
            :key="task.uid"
            class="task"
            :data-status="task.status"
          >
            <div class="t-head">
              <span class="t-title">
                <strong>
                  <span class="t-index">{{ String(index + 1).padStart(2, '0') }}</span>
                  {{ task.title }}
                </strong>
                <em>{{ task.detail }}</em>
              </span>
              <span class="chip" :data-status="task.status">
                {{ STATUS_META[task.status].label }}
              </span>
            </div>

            <div class="t-bar">
              <TaskProgressBar :progress="task.progress" :status="task.status" />
            </div>

            <div class="t-foot">
              <span class="t-group">{{ task.groupName }}</span>
            </div>
          </li>
        </ol>
      </div>

      <!-- 右：各组进度与成果 -->
      <aside class="summary-col">
        <h3 class="col-title">
          工作组进度与成果
          <span class="col-count">{{ groups.length }}</span>
        </h3>

        <ul class="summary-list">
          <li
            v-for="group in groups"
            :key="group.id"
            class="summary-card"
            :data-status="groupStatus(group)"
          >
            <header class="s-head">
              <strong>{{ group.name }}</strong>
              <em>组长 {{ group.lead }}</em>
            </header>

            <div class="s-progress">
              <TaskProgressBar :progress="groupProgress(group)" :status="groupStatus(group)" />
            </div>

            <div class="s-meta">
              <span>任务 {{ group.tasks.length }}</span>
              <span>完成 {{ countDoneTasks(group) }}</span>
              <span v-if="riskCountOf(group) > 0" class="warn">
                受阻 {{ riskCountOf(group) }}
              </span>
              <span>成员 {{ group.roster.length }}</span>
            </div>

            <div class="s-results">
              <p class="s-label">成果情况</p>
              <ul>
                <li v-for="title in doneTitlesOf(group)" :key="`done-${title}`">
                  <span class="tag" data-kind="done">已完成</span>{{ title }}
                </li>
                <li
                  v-for="item in handedOverOf(group)"
                  :key="`handed-${item.id}`"
                  class="handed"
                >
                  <span class="tag" data-kind="handed">已交高总</span>
                  {{ item.taskTitle }}
                  <em>{{ formatClock(item.forwardedAt || item.reviewedAt || '') }}</em>
                </li>
                <li
                  v-if="!doneTitlesOf(group).length && !handedOverOf(group).length"
                  class="none"
                >
                  暂无成果
                </li>
              </ul>
            </div>
          </li>
        </ul>
      </aside>
    </div>
  </section>
</template>

<style scoped>
.board {
  position: relative;
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  padding: 20px 20px 18px;
  border-radius: calc(var(--radius-lg) + 2px);
  border: 1px solid rgba(255, 255, 255, 0.72);
  background:
    linear-gradient(160deg, rgba(255, 255, 255, 0.78), rgba(240, 248, 252, 0.52)),
    rgba(255, 255, 255, 0.34);
  backdrop-filter: blur(18px) saturate(1.2);
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
  background: linear-gradient(180deg, rgba(46, 196, 214, 0.75), rgba(46, 196, 214, 0.12));
}

.board-head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px 20px;
  flex-shrink: 0;
  padding-bottom: 14px;
  margin-bottom: 16px;
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

.summary-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 20px;
  border: 1px solid rgba(46, 196, 214, 0.4);
  background: rgba(46, 196, 214, 0.08);
  color: var(--color-accent);
  font-size: 0.88rem;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.summary-btn:hover {
  background: rgba(46, 196, 214, 0.18);
  border-color: var(--color-accent);
  transform: translateX(2px);
}

.summary-btn b {
  font-weight: 700;
  font-size: 1.1rem;
  line-height: 1;
}

/* 头部右侧：任务总结入口 + 任务总数 */
.head-right {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 14px;
}

.head-meta {
  font-family: var(--font-mono);
  font-size: 0.74rem;
  color: var(--color-ink-muted);
}

/* 左任务 / 右进度成果：两栏各自在卡片内部滚动，页面本身不滚动 */
.board-body {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(280px, 1fr);
  gap: 18px;
  align-items: stretch;
  flex: 1;
  min-height: 0;
}

.col-title {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  margin: 0 0 10px;
  font-family: var(--font-mono);
  font-size: 0.74rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: var(--color-accent);
}

.col-count {
  padding: 1px 7px;
  border: 1px solid rgba(26, 122, 146, 0.24);
  border-radius: 999px;
  background: rgba(26, 122, 146, 0.07);
  font-size: 0.66rem;
}

.tasks-col {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

/* 所有组的任务平铺：只呈现任务自身的进展 */
.tasks {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  margin: 0;
  padding: 0 4px 2px 0;
}

.task {
  padding: 12px 13px;
  border: 1px solid rgba(20, 40, 58, 0.08);
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.78);
}

.task[data-status='risk'] { border-color: rgba(168, 72, 72, 0.28); }
.task[data-status='done'] { border-color: rgba(47, 125, 90, 0.24); }
.task[data-status='unassigned'] {
  border-style: dashed;
  border-color: rgba(107, 124, 140, 0.42);
  background: rgba(255, 255, 255, 0.5);
}

.t-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.t-title {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.t-title strong {
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-size: 0.92rem;
  color: #14304a;
}

.t-index {
  flex-shrink: 0;
  font-family: var(--font-mono);
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--color-accent);
}

.t-title em {
  font-style: normal;
  font-size: 0.76rem;
  line-height: 1.5;
  color: var(--color-ink-muted);
}

.t-bar {
  margin-top: 10px;
}

.t-foot {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 14px;
  margin-top: 9px;
  font-size: 0.73rem;
  color: var(--color-ink-muted);
}

/* 该任务所属工作组 */
.t-group {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: var(--color-accent);
  font-weight: 600;
  letter-spacing: 0.02em;
}

.t-group::before {
  width: 3px;
  height: 11px;
  border-radius: 1px;
  background: currentColor;
  content: '';
  opacity: 0.7;
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

.chip[data-status='unassigned'] {
  color: #6b7c8c;
  border-color: rgba(107, 124, 140, 0.36);
  border-style: dashed;
  background: rgba(107, 124, 140, 0.08);
}

/* 右侧：各组进度与成果 */
.summary-col {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.summary-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  margin: 0;
  padding: 0 4px 2px 0;
}

/* 卡片内部滚动条：细窄、低对比，不抢内容 */
.tasks,
.summary-list {
  scrollbar-width: thin;
  scrollbar-color: rgba(26, 122, 146, 0.28) transparent;
}

.tasks::-webkit-scrollbar,
.summary-list::-webkit-scrollbar {
  width: 6px;
}

.tasks::-webkit-scrollbar-track,
.summary-list::-webkit-scrollbar-track {
  background: transparent;
}

.tasks::-webkit-scrollbar-thumb,
.summary-list::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgba(26, 122, 146, 0.26);
}

.tasks::-webkit-scrollbar-thumb:hover,
.summary-list::-webkit-scrollbar-thumb:hover {
  background: rgba(26, 122, 146, 0.42);
}

.summary-card {
  padding: 13px;
  border: 1px solid rgba(20, 40, 58, 0.08);
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.72);
}

.summary-card[data-status='risk'] { border-color: rgba(168, 72, 72, 0.3); }
.summary-card[data-status='done'] { border-color: rgba(47, 125, 90, 0.28); }

.s-head {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin-bottom: 9px;
}

.s-head strong {
  font-size: 0.9rem;
  color: var(--color-ink);
}

.s-head em {
  font-style: normal;
  font-size: 0.74rem;
  color: var(--color-ink-muted);
}

.s-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  margin-top: 9px;
  font-size: 0.73rem;
  color: var(--color-ink-muted);
}

.s-meta .warn { color: var(--color-danger); }

.s-results {
  margin-top: 11px;
  padding-top: 10px;
  border-top: 1px dashed rgba(20, 40, 58, 0.1);
}

.s-label {
  margin: 0 0 7px;
  font-family: var(--font-mono);
  font-size: 0.7rem;
  letter-spacing: 0.06em;
  color: var(--color-accent);
}

.s-results ul {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  padding: 0;
}

.s-results li {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 0.78rem;
  color: var(--color-ink);
}

.s-results li em {
  font-style: normal;
  font-family: var(--font-mono);
  font-size: 0.7rem;
  color: var(--color-ink-muted);
}

.s-results li.none {
  font-size: 0.76rem;
  color: var(--color-ink-muted);
}

.tag {
  flex-shrink: 0;
  padding: 1px 7px;
  border: 1px solid rgba(47, 125, 90, 0.28);
  border-radius: 999px;
  background: rgba(47, 125, 90, 0.1);
  color: var(--color-success);
  font-family: var(--font-mono);
  font-size: 0.66rem;
}

.tag[data-kind='handed'] {
  border-color: rgba(26, 122, 146, 0.3);
  background: rgba(26, 122, 146, 0.1);
  color: var(--color-accent);
}

@media (max-width: 1000px) {
  /* 窄屏改为单栏堆叠：滚动统一交给卡片主体 */
  .board-body {
    grid-template-columns: 1fr;
    align-items: start;
    overflow-y: auto;
    overscroll-behavior: contain;
  }

  .tasks-col,
  .summary-col,
  .tasks,
  .summary-list {
    overflow: visible;
    min-height: auto;
  }
}

@media (max-width: 860px) {
  .board { padding: 16px; }
}
</style>
