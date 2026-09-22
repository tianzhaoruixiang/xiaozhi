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

const totalMembers = computed(() =>
  props.groups.reduce((sum, group) => sum + group.roster.length, 0),
)
</script>

<template>
  <section class="board" aria-label="专项任务 · 各组任务与工作组进度成果">
    <header class="board-head">
      <div class="board-title">
        <h2>专项任务</h2>
        <p>左侧为各组任务与成员进展，右侧为各工作组进度与成果</p>
      </div>
      <div class="head-right">
        <RouterLink class="summary-btn" to="/command/task">
          任务总结
          <b aria-hidden="true">→</b>
        </RouterLink>
        <span class="head-meta">
          {{ groups.length }} 个工作组 · {{ totalMembers }} 名成员
        </span>
      </div>
    </header>

    <div class="board-body">
      <!-- 左：所有工作组的任务 -->
      <div class="tasks-col">
        <article
          v-for="(group, index) in groups"
          :key="group.id"
          class="group-block"
          :data-status="groupStatus(group)"
        >
          <header class="group-block-head">
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
            </span>
          </header>

          <div class="g-progress">
            <TaskProgressBar :progress="groupProgress(group)" :status="groupStatus(group)" />
          </div>

          <ol class="tasks">
            <li
              v-for="task in group.tasks"
              :key="task.id"
              class="task"
              :data-status="task.status"
            >
              <div class="t-head">
                <span class="t-title">
                  <strong>{{ task.title }}</strong>
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
                <span>负责人 {{ task.owner || '待分配' }}</span>
                <span>截止 {{ task.due || '—' }}</span>
              </div>

              <div class="members-head">
                <span class="mh-label">成员进度</span>
                <span class="mh-meta">{{ task.members.length }} 人</span>
              </div>

              <ul v-if="task.members.length" class="member-list">
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
              <p v-else class="no-member">待分配，暂无成员</p>
            </li>
          </ol>
        </article>
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
  flex-direction: column;
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

/* 头部右侧：任务总结入口 + 组数/人数 */
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

/* 左任务 / 右进度成果 */
.board-body {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(280px, 1fr);
  gap: 18px;
  align-items: start;
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
  font-size: 0.66rem;
}

.tasks-col {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
}

.group-block {
  padding: 14px;
  border: 1px solid rgba(20, 40, 58, 0.08);
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.66);
}

.group-block[data-status='risk'] { border-color: rgba(168, 72, 72, 0.32); }
.group-block[data-status='done'] { border-color: rgba(47, 125, 90, 0.28); }

.group-block-head {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 10px 12px;
  align-items: center;
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

.g-progress {
  margin-top: 10px;
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
  gap: 10px;
  margin: 12px 0 0;
  padding: 12px 0 0;
  border-top: 1px dashed rgba(20, 40, 58, 0.1);
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
  font-size: 0.92rem;
  color: #14304a;
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

.members-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin: 11px 0 8px;
  padding-top: 10px;
  border-top: 1px dashed rgba(20, 40, 58, 0.1);
}

.mh-label {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  letter-spacing: 0.06em;
  color: var(--color-accent);
}

.mh-meta {
  font-size: 0.72rem;
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
  grid-template-columns: auto minmax(110px, 150px) minmax(110px, 1fr) minmax(0, 1.4fr);
  align-items: center;
  gap: 10px;
  padding: 9px 11px;
  border: 1px solid rgba(20, 40, 58, 0.08);
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.82);
}

.member[data-status='risk'] { border-color: rgba(168, 72, 72, 0.28); }

.avatar {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border: 1px solid rgba(46, 196, 214, 0.32);
  border-radius: 50%;
  background: rgba(46, 196, 214, 0.12);
  color: var(--color-accent);
  font-size: 0.78rem;
  font-weight: 700;
}

.m-who {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.m-who strong {
  font-size: 0.86rem;
  color: var(--color-ink);
}

.m-who em {
  font-style: normal;
  font-size: 0.7rem;
  color: var(--color-ink-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.m-note {
  font-size: 0.74rem;
  line-height: 1.45;
  color: var(--color-ink-muted);
}

.no-member {
  margin: 0;
  font-size: 0.76rem;
  color: var(--color-ink-muted);
}

/* 右侧：各组进度与成果 */
.summary-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 0;
  padding: 0;
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
  .board-body {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 860px) {
  .board { padding: 16px; }
  .group-block-head { grid-template-columns: auto 1fr; }
  .g-meta { grid-column: 1 / -1; justify-content: space-between; }
  .member {
    grid-template-columns: auto 1fr;
    row-gap: 8px;
  }
  .m-note { grid-column: 1 / -1; }
}
</style>
