<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  STATUS_META,
  countDoneTasks,
  groupProgress,
  groupStatus,
  type TaskGroup,
} from '../data/groupTasks'
import TaskProgressBar from './TaskProgressBar.vue'

const props = defineProps<{
  groups: TaskGroup[]
}>()

/** 组默认收起；展开后组内任务直接带出成员进度 */
const openedGroups = ref<Record<string, boolean>>({})
/** 任务默认展开，可单独收起 */
const closedTasks = ref<Record<string, boolean>>({})

const isGroupOpen = (id: string) => openedGroups.value[id] === true
const toggleGroup = (id: string) => {
  openedGroups.value = { ...openedGroups.value, [id]: !isGroupOpen(id) }
}

const isTaskOpen = (id: string) => closedTasks.value[id] !== true
const toggleTask = (id: string) => {
  closedTasks.value = { ...closedTasks.value, [id]: isTaskOpen(id) }
}

const allTasks = computed(() => props.groups.flatMap((group) => group.tasks))

const stats = computed(() => {
  const tasks = allTasks.value
  return {
    group: props.groups.length,
    task: tasks.length,
    member: tasks.reduce((sum, task) => sum + task.members.length, 0),
    done: tasks.filter((task) => task.status === 'done').length,
    risk: tasks.filter((task) => task.status === 'risk').length,
    progress: tasks.length
      ? Math.round(tasks.reduce((sum, task) => sum + task.progress, 0) / tasks.length)
      : 0,
  }
})
</script>

<template>
  <section class="board" aria-label="专项任务 · 各工作组任务与成员进展">
    <header class="board-head">
      <div class="board-title">
        <h2>专项任务</h2>
        <p>各工作组任务与成员进展</p>
      </div>
      <dl class="stats">
        <div><dt>组</dt><dd>{{ stats.group }}</dd></div>
        <div><dt>任务</dt><dd>{{ stats.task }}</dd></div>
        <div><dt>成员</dt><dd>{{ stats.member }}</dd></div>
        <div><dt>完成</dt><dd>{{ stats.done }}</dd></div>
        <div :data-warn="stats.risk > 0"><dt>受阻</dt><dd>{{ stats.risk }}</dd></div>
        <div><dt>总进度</dt><dd>{{ stats.progress }}%</dd></div>
      </dl>
    </header>

    <ol class="groups">
      <li
        v-for="(group, index) in groups"
        :key="group.id"
        class="group"
        :data-status="groupStatus(group)"
        :data-open="isGroupOpen(group.id) ? '1' : '0'"
      >
        <button
          type="button"
          class="group-top"
          :aria-expanded="isGroupOpen(group.id)"
          @click="toggleGroup(group.id)"
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
            <span class="g-count">{{ countDoneTasks(group) }}/{{ group.tasks.length }}</span>
            <span class="chev">{{ isGroupOpen(group.id) ? '收起' : '展开' }}</span>
          </span>
        </button>

        <div class="g-progress">
          <TaskProgressBar :progress="groupProgress(group)" :status="groupStatus(group)" />
        </div>

        <ol v-show="isGroupOpen(group.id)" class="tasks">
          <li
            v-for="task in group.tasks"
            :key="task.id"
            class="task"
            :data-status="task.status"
            :data-open="isTaskOpen(task.id) ? '1' : '0'"
          >
            <button
              type="button"
              class="task-top"
              :aria-expanded="isTaskOpen(task.id)"
              @click="toggleTask(task.id)"
            >
              <span class="t-title">
                <strong>{{ task.title }}</strong>
                <em>{{ task.detail }}</em>
              </span>
              <span class="t-side">
                <span class="chip" :data-status="task.status">
                  {{ STATUS_META[task.status].label }}
                </span>
                <span class="pct">{{ task.progress }}%</span>
                <span class="chev">{{ isTaskOpen(task.id) ? '收起' : '展开' }}</span>
              </span>
            </button>

            <div class="task-bar">
              <TaskProgressBar :progress="task.progress" :status="task.status" />
            </div>

            <div v-show="isTaskOpen(task.id)" class="members">
              <div class="members-head">
                <span class="mh-label">成员进度</span>
                <span class="mh-meta">负责人 {{ task.owner }} · 截止 {{ task.due }}</span>
              </div>

              <ul class="member-list">
                <li
                  v-for="member in task.members"
                  :key="member.id"
                  class="member"
                  :data-status="member.status"
                >
                  <span class="avatar" aria-hidden="true">{{ member.name.charAt(0) }}</span>
                  <span class="m-who">
                    <strong>{{ member.name }}</strong>
                    <em>{{ member.role }}</em>
                  </span>
                  <TaskProgressBar compact :progress="member.progress" :status="member.status" />
                  <span class="m-note">{{ member.note }}</span>
                </li>
              </ul>
            </div>
          </li>
        </ol>
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
  background: linear-gradient(180deg, rgba(46, 196, 214, 0.75), rgba(46, 196, 214, 0.12));
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
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 12px 0 0;
  padding: 12px 0 0;
  border-top: 1px dashed rgba(20, 40, 58, 0.1);
}

.task {
  padding: 13px 14px;
  border: 1px solid rgba(20, 40, 58, 0.08);
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.78);
}

.task[data-status='risk'] { border-color: rgba(168, 72, 72, 0.28); }
.task[data-status='done'] { border-color: rgba(47, 125, 90, 0.24); }

.task-top {
  width: 100%;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  text-align: left;
}

.t-title {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.t-title strong {
  font-size: 0.94rem;
  color: #14304a;
}

.t-title em {
  font-style: normal;
  font-size: 0.76rem;
  line-height: 1.5;
  color: var(--color-ink-muted);
}

.t-side {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.pct {
  font-family: var(--font-mono);
  font-size: 0.84rem;
  font-weight: 700;
  color: var(--color-accent);
}

.task-bar {
  margin-top: 11px;
}

.members {
  margin-top: 13px;
  padding-top: 13px;
  border-top: 1px dashed rgba(20, 40, 58, 0.1);
}

.members-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 6px 12px;
  margin-bottom: 10px;
}

.mh-label {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  letter-spacing: 0.06em;
  color: var(--color-accent);
}

.mh-meta {
  font-size: 0.74rem;
  color: var(--color-ink-muted);
}

.member-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
}

.member {
  display: grid;
  grid-template-columns: auto minmax(120px, 168px) minmax(120px, 1fr) minmax(0, 1.6fr);
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid rgba(20, 40, 58, 0.08);
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.82);
}

.member[data-status='risk'] { border-color: rgba(168, 72, 72, 0.28); }

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

.m-who {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.m-who strong {
  font-size: 0.88rem;
  color: var(--color-ink);
}

.m-who em {
  font-style: normal;
  font-size: 0.72rem;
  color: var(--color-ink-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.m-note {
  font-size: 0.76rem;
  line-height: 1.5;
  color: var(--color-ink-muted);
}

@media (max-width: 860px) {
  .board { padding: 16px; }
  .group-top { grid-template-columns: auto 1fr; }
  .g-meta { grid-column: 1 / -1; justify-content: space-between; }
  .member {
    grid-template-columns: auto 1fr;
    row-gap: 8px;
  }
  .m-note { grid-column: 1 / -1; }
}
</style>
