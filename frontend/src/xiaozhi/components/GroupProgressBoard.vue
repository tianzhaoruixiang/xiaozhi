<script setup lang="ts">
import { computed } from 'vue'
import {
  SATURATION_MAX,
  STATUS_META,
  groupProgress,
  groupStatus,
  type TaskGroup,
} from '../data/groupTasks'
import TaskProgressBar from './TaskProgressBar.vue'

const props = defineProps<{
  group: TaskGroup
  /** 当前选中的任务（高亮 + 生成快捷指令） */
  selectedId?: string
}>()

const emit = defineEmits<{
  select: [task: TaskGroup['tasks'][number]]
}>()

const status = computed(() => groupStatus(props.group))
const progress = computed(() => groupProgress(props.group))

/** 饱和度分级：≥4 高、=3 偏高、其余正常 */
const saturationLevel = (value: number) => {
  if (value >= 4) return 'high'
  if (value >= 3) return 'mid'
  return 'normal'
}

const saturationPercent = (value: number) =>
  Math.min(100, Math.round((value / SATURATION_MAX) * 100))
</script>

<template>
  <section class="board" aria-label="专项任务 · 本组任务与成员饱和度">
    <header class="board-head">
      <div class="board-title">
        <div class="title-row">
          <h2>专项任务</h2>
          <slot name="title-action" />
        </div>
        <p>本组各项任务进展与成员饱和度</p>
      </div>
      <!-- 右侧：待审核入口等 -->
      <div class="head-right">
        <div class="head-action">
          <slot name="head-action" />
        </div>
      </div>
    </header>

    <div class="group-line">
      <span class="group-name">{{ group.name }}</span>
      <span class="chip" :data-status="status">{{ STATUS_META[status].label }}</span>
      <span class="lead">组长 {{ group.lead }}</span>
      <span class="scope">{{ group.scope }}</span>
      <div class="line-bar">
        <TaskProgressBar compact :progress="progress" :status="status" />
      </div>
    </div>

    <div class="board-body">
      <!-- 左：任务 -->
      <div class="tasks-col">
        <h3 class="col-title">
          任务
          <span class="col-count">{{ group.tasks.length }}</span>
        </h3>
        <ol class="tasks">
          <li
            v-for="task in group.tasks"
            :key="task.id"
            class="task"
            :data-status="task.status"
            :data-selected="task.id === props.selectedId ? '1' : '0'"
          >
            <button
              type="button"
              class="task-btn"
              :aria-pressed="task.id === props.selectedId"
              @click="emit('select', task)"
            >
              <span class="t-head">
                <span class="t-title">
                  <strong>{{ task.title }}</strong>
                  <em>{{ task.detail }}</em>
                </span>
                <span class="t-side">
                  <span class="chip" :data-status="task.status">
                    {{ STATUS_META[task.status].label }}
                  </span>
                </span>
              </span>

              <span class="t-bar">
                <TaskProgressBar :progress="task.progress" :status="task.status" />
              </span>

              <span class="t-foot">
                <span>负责人 {{ task.owner || '待分配' }}</span>
                <span>截止 {{ task.due || '—' }}</span>
                <span>成员 {{ task.members.length ? `${task.members.length} 名` : '—' }}</span>
              </span>
            </button>
          </li>
        </ol>
      </div>

      <!-- 右：成员与工作饱和度 -->
      <aside class="members-col">
        <h3 class="col-title">
          成员
          <span class="col-count">{{ group.roster.length }}</span>
        </h3>
        <ul class="members">
          <li
            v-for="member in group.roster"
            :key="member.id"
            class="member"
            :data-level="saturationLevel(member.saturation)"
          >
            <span class="avatar" aria-hidden="true">{{ member.name.charAt(0) }}</span>
            <span class="m-who">
              <strong>{{ member.name }}</strong>
              <em>{{ member.role }}</em>
            </span>
            <div class="sat">
              <div
                class="sat-track"
                :aria-label="`工作饱和度 ${member.saturation} / ${SATURATION_MAX}`"
              >
                <span
                  class="sat-fill"
                  :style="{ width: `${saturationPercent(member.saturation)}%` }"
                />
              </div>
              <span class="sat-value">{{ member.saturation }} / {{ SATURATION_MAX }}</span>
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
  flex-direction: column;
  /* 撑满工作台剩余高度：两栏各自内部滚动，页面本身不滚 */
  flex: 1;
  min-height: 0;
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
  flex-shrink: 0;
}

.board-title h2 {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.28rem;
  font-weight: 600;
  letter-spacing: 0.03em;
  color: var(--color-ink);
}

/* 标题行：专项任务 + 右侧动作（如「进入工作组」） */
.title-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 14px;
}

.board-title p {
  margin: 6px 0 0;
  font-size: 0.82rem;
  color: var(--color-ink-muted);
}

/* 头部右侧：待审核入口，整体靠右 */
.head-right {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: flex-end;
  gap: 10px 14px;
  margin-left: auto;
}

/* 统计行左侧的入口（待审核等） */
.head-action {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-top: 2px;
}

.head-action:empty {
  display: none;
}

.group-line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 14px;
  padding: 12px 14px;
  margin-bottom: 16px;
  border: 1px solid rgba(20, 40, 58, 0.08);
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.66);
  flex-shrink: 0;
}

.group-name {
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--color-ink);
}

.group-line .lead {
  font-size: 0.84rem;
  font-weight: 600;
  color: var(--color-ink);
}

.group-line .scope {
  font-size: 0.78rem;
  color: var(--color-ink-muted);
}

.line-bar {
  flex: 1;
  min-width: 160px;
}

/* 左任务 / 右成员：占满剩余高度，两栏各自内部滚动 */
.board-body {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1.7fr) minmax(260px, 1fr);
  gap: 18px;
  align-items: stretch;
}

.tasks-col,
.members-col {
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding-right: 6px;
}

.col-title {
  display: flex;
  align-items: center;
  gap: 8px;
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
  color: var(--color-accent);
  font-size: 0.66rem;
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

.tasks {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 0;
  padding: 0;
}

.task {
  padding: 14px 16px;
  border: 1px solid rgba(20, 40, 58, 0.08);
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.72);
  transition: border-color 160ms var(--ease-out), box-shadow 160ms var(--ease-out), background 160ms var(--ease-out);
}

.task:hover {
  border-color: rgba(26, 122, 146, 0.36);
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 6px 16px rgba(6, 20, 31, 0.06);
}

.task[data-selected='1'] {
  border-color: rgba(26, 122, 146, 0.55);
  background: rgba(255, 255, 255, 0.96);
  box-shadow:
    inset 0 0 0 1px rgba(26, 122, 146, 0.2),
    0 8px 20px rgba(6, 20, 31, 0.08);
}

/* 整卡可点：点击后任务名进入输入框并生成快捷指令 */
.task-btn {
  display: block;
  width: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.task-btn:focus-visible {
  outline: 2px solid rgba(46, 196, 214, 0.65);
  outline-offset: 4px;
}

.task[data-status='unassigned'] {
  border-style: dashed;
  border-color: rgba(107, 124, 140, 0.42);
  background: rgba(255, 255, 255, 0.5);
}

.task[data-status='risk'] { border-color: rgba(168, 72, 72, 0.32); }
.task[data-status='done'] { border-color: rgba(47, 125, 90, 0.28); }

.t-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.t-title {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.t-title strong {
  font-size: 0.96rem;
  color: #14304a;
}

.t-title em {
  font-style: normal;
  font-size: 0.78rem;
  line-height: 1.5;
  color: var(--color-ink-muted);
}

.t-side {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.t-bar {
  margin-top: 11px;
}

.t-foot {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 16px;
  margin-top: 10px;
  font-size: 0.74rem;
  color: var(--color-ink-muted);
}

/* 成员列表 */
.members {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 0;
  padding: 0;
}

.member {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 8px 10px;
  padding: 10px 12px;
  border: 1px solid rgba(20, 40, 58, 0.08);
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.72);
}

.member[data-level='mid'] { border-color: rgba(184, 122, 53, 0.28); }
.member[data-level='high'] { border-color: rgba(168, 72, 72, 0.3); }

.avatar {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border: 1px solid rgba(46, 196, 214, 0.32);
  border-radius: 50%;
  background: rgba(46, 196, 214, 0.12);
  color: var(--color-accent);
  font-size: 0.82rem;
  font-weight: 700;
}

.member[data-level='mid'] .avatar {
  border-color: rgba(184, 122, 53, 0.4);
  background: rgba(184, 122, 53, 0.12);
  color: var(--color-warn);
}

.member[data-level='high'] .avatar {
  border-color: rgba(168, 72, 72, 0.4);
  background: rgba(168, 72, 72, 0.12);
  color: var(--color-danger);
}

.m-who {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  justify-content: center;
}

.m-who strong {
  font-size: 0.88rem;
  color: var(--color-ink);
}

.m-who em {
  font-style: normal;
  font-size: 0.72rem;
  color: var(--color-ink-muted);
}

.sat {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: 10px;
}

.sat-track {
  position: relative;
  flex: 1;
  height: 6px;
  border: 1px solid rgba(20, 40, 58, 0.1);
  border-radius: 999px;
  background: rgba(20, 40, 58, 0.09);
  overflow: hidden;
}

.sat-fill {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #2ec4d6, #1a7a92);
  transition: width var(--dur-mid) var(--ease-out);
}

.member[data-level='mid'] .sat-fill {
  background: linear-gradient(90deg, #d8b878, #b87a35);
}

.member[data-level='high'] .sat-fill {
  background: linear-gradient(90deg, #c96f6f, #a84848);
}

.sat-value {
  flex-shrink: 0;
  font-family: var(--font-mono);
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--color-accent);
}

.member[data-level='mid'] .sat-value { color: var(--color-warn); }
.member[data-level='high'] .sat-value { color: var(--color-danger); }

@media (max-width: 900px) {
  /* 窄屏仍保持一屏：上下两栏各自滚动 */
  .board-body {
    grid-template-columns: 1fr;
    grid-template-rows: minmax(0, 1.5fr) minmax(0, 1fr);
  }
}

@media (max-width: 720px) {
  .board { padding: 16px; }
  .t-head { flex-direction: column; }
}
</style>
