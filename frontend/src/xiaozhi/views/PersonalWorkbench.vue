<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { usePersonalTasks } from '../data/personalTasks'
import WorkbenchHeader from '../components/WorkbenchHeader.vue'
import WorkbenchBoards from '../components/WorkbenchBoards.vue'
import type { WorkbenchPanel } from '../components/WorkbenchBoards.vue'
import PersonalTaskWorkspace from './PersonalTaskWorkspace.vue'

const { specialTasks, keyTasks, dailyTasks, reminders } = usePersonalTasks()
const route = useRoute()
const router = useRouter()

const path = computed(() => route.path)
const meetingReminderVisible = ref(false)
let meetingReminderTimer: number | undefined

onMounted(() => {
  if (route.path === '/personal') {
    meetingReminderTimer = window.setTimeout(() => {
      meetingReminderVisible.value = true
    }, 650)
  }
})

onUnmounted(() => {
  if (meetingReminderTimer) window.clearTimeout(meetingReminderTimer)
})

const isTaskPage = computed(
  () => path.value === '/personal/task' || path.value.startsWith('/personal/task/'),
)

const query = computed(() => {
  return typeof route.query.q === 'string' ? route.query.q : ''
})

const activeTaskId = computed(() => {
  // 未指定任务时进入自由对话（由下方输入框内的任务按钮再选择）
  return typeof route.query.id === 'string' ? route.query.id : ''
})

const navigate = (to: string) => {
  void router.push(to)
}

const openTask = (id: string) => {
  navigate(`/personal/task?id=${encodeURIComponent(id)}`)
}

const backToHome = () => {
  navigate('/personal')
}

const onQueryConsumed = () => {
  void router.replace('/personal/task')
}

const handoffId = computed(() =>
  typeof route.query.handoffId === 'string' ? route.query.handoffId : 'SEC-20260921-001',
)

const enterWorkGroup = () => {
  void router.push({ name: 'group-operations', query: { handoffId: handoffId.value } })
}

const enterMeeting = () => {
  meetingReminderVisible.value = false
  void router.push({ name: 'command', query: { handoffId: handoffId.value } })
}

/** 首页自由输入：直接进入交互框并开始执行 */
const homeDraft = ref('')
const startFreeTask = () => {
  const text = homeDraft.value.trim()
  if (!text) return
  homeDraft.value = ''
  navigate(`/personal/task?q=${encodeURIComponent(text)}`)
}

const panels = computed<WorkbenchPanel[]>(() => [
  {
    title: '专项任务',
    subtitle: '项目制寻访与交付',
    variant: 'focus',
    items: specialTasks.value,
  },
  {
    title: '重点任务',
    subtitle: '关键推进与沟通安排',
    variant: 'key',
    items: keyTasks.value,
  },
  {
    title: '待办任务',
    subtitle: '每日必做的人选经营',
    variant: 'todo',
    items: dailyTasks.value,
  },
  {
    title: '事项提醒',
    subtitle: '会议、邮件与临期动作',
    variant: 'reminder',
    items: reminders.value,
    warn: true,
  },
])
</script>

<template>
  <div class="workbench xiaozhi-scope">
    <div class="atmosphere" aria-hidden="true">
      <div class="mesh" />
      <div class="orb orb-a" />
      <div class="orb orb-b" />
      <div class="orb orb-c" />
      <div class="grid-layer" />
      <div class="grain" />
      <div class="vignette" />
      <div class="horizon" />
    </div>

    <div class="shell" :class="{ wide: isTaskPage, task: isTaskPage }">
      <WorkbenchHeader
        v-if="!isTaskPage"
        compact
        brand="小智"
        tagline="个人助手 · 协同工作台"
      >
        <template #actions>
          <RouterLink class="desk-link" to="/leader">领导工作台</RouterLink>
          <button type="button" class="group-entry" @click="enterWorkGroup">
            <span class="group-entry-mark" aria-hidden="true"><i /><i /></span>
            <span><small>当前任务已接收</small><strong>进入工作组</strong></span>
            <b aria-hidden="true">→</b>
          </button>
        </template>
      </WorkbenchHeader>

      <PersonalTaskWorkspace
        v-if="isTaskPage"
        :task-id="activeTaskId"
        :query="query"
        @select-task="openTask"
        @query-consumed="onQueryConsumed"
        @back="backToHome"
      />

      <template v-else>
        <WorkbenchBoards
          :panels="panels"
          :columns="2"
          label="猎头个人工作台"
          :clickable-variants="['focus', 'key', 'todo']"
          @select="openTask($event.item.id)"
        />

        <form class="home-dock" @submit.prevent="startFreeTask">
          <textarea
            :value="homeDraft"
            rows="2"
            placeholder="也可以直接告诉小智要办的事，例如：帮我梳理今天的人选跟进重点…"
            @input="homeDraft = ($event.target as HTMLTextAreaElement).value"
            @keydown.enter.exact.prevent="startFreeTask"
          />
          <button type="submit" :disabled="!homeDraft.trim()">发送</button>
        </form>
      </template>
    </div>

    <el-dialog
      v-model="meetingReminderVisible"
      width="31rem"
      class="meeting-reminder-dialog"
      modal-class="meeting-reminder-overlay"
      :show-close="false"
      :close-on-click-modal="false"
      align-center
      append-to-body
    >
      <div class="meeting-reminder-card">
        <div class="reminder-status"><i />会议提醒 · 即将开始</div>
        <h2>大型会议保障动员会</h2>
        <p>会议材料与参会信息已准备完毕，请按时进入会议。</p>
        <dl>
          <div><dt>时间</dt><dd>今天 10:00</dd></div>
          <div><dt>地点</dt><dd>市局联合指挥中心</dd></div>
          <div><dt>参会</dt><dd>12 人</dd></div>
        </dl>
        <div class="reminder-actions">
          <button type="button" class="later-button" @click="meetingReminderVisible = false">稍后提醒</button>
          <button type="button" class="meeting-button" @click="enterMeeting">进入会议 <span>→</span></button>
        </div>
      </div>
    </el-dialog>

  </div>
</template>

<style scoped>
.workbench {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  background:
    radial-gradient(1200px 620px at 6% -10%, rgba(46, 196, 214, 0.2), transparent 58%),
    radial-gradient(920px 540px at 96% 0%, rgba(201, 168, 108, 0.14), transparent 50%),
    radial-gradient(780px 420px at 48% 110%, rgba(26, 122, 146, 0.14), transparent 55%),
    linear-gradient(168deg, #c5d8e6 0%, #e7f0f6 42%, #eef4f8 78%, #e9eef3 100%);
}

.workbench:has(.shell.task) {
  height: 100vh;
  max-height: 100vh;
}

.atmosphere {
  pointer-events: none;
  position: absolute;
  inset: 0;
  z-index: 0;
}

.mesh {
  position: absolute;
  inset: -10%;
  background:
    conic-gradient(from 210deg at 30% 20%, rgba(46, 196, 214, 0.08), transparent 40%),
    conic-gradient(from 40deg at 78% 18%, rgba(201, 168, 108, 0.07), transparent 35%);
  filter: blur(8px);
  opacity: 0.9;
}

.orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(44px);
  animation: float-orb 16s ease-in-out infinite;
  opacity: 0.75;
}

.orb-a {
  width: 340px;
  height: 340px;
  top: 6%;
  left: -5%;
  background: radial-gradient(circle, rgba(46, 196, 214, 0.38), transparent 70%);
}

.orb-b {
  width: 280px;
  height: 280px;
  top: 10%;
  right: -3%;
  background: radial-gradient(circle, rgba(201, 168, 108, 0.3), transparent 70%);
  animation-duration: 19s;
  animation-delay: -5s;
}

.orb-c {
  width: 400px;
  height: 240px;
  bottom: 4%;
  left: 26%;
  background: radial-gradient(circle, rgba(26, 122, 146, 0.2), transparent 70%);
  animation-duration: 22s;
  animation-delay: -9s;
}

.grid-layer {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(20, 40, 58, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(20, 40, 58, 0.04) 1px, transparent 1px);
  background-size: 56px 56px;
  mask-image: radial-gradient(ellipse 78% 68% at 50% 26%, black, transparent 78%);
  animation: grid-drift 32s linear infinite;
  opacity: 0.8;
}

.grain {
  position: absolute;
  inset: 0;
  opacity: 0.035;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  mix-blend-mode: multiply;
}

.vignette {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at center, transparent 40%, rgba(6, 20, 31, 0.16) 100%);
}

.horizon {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 42%;
  background:
    linear-gradient(180deg, transparent, rgba(6, 20, 31, 0.05) 45%, rgba(6, 20, 31, 0.1)),
    repeating-linear-gradient(
      90deg,
      transparent,
      transparent 96px,
      rgba(46, 196, 214, 0.035) 96px,
      rgba(46, 196, 214, 0.035) 97px
    );
  mask-image: linear-gradient(180deg, transparent, black 48%);
}

.shell {
  position: relative;
  z-index: 1;
  max-width: 1120px;
  margin: 0 auto;
  padding: clamp(28px, 5vw, 56px) clamp(20px, 4vw, 40px) 64px;
}

.shell.wide {
  max-width: 1440px;
}

.shell.task {
  display: flex;
  flex-direction: column;
  height: 100%;
  max-height: 100vh;
  min-height: 0;
  padding: 16px clamp(16px, 2.5vw, 28px) 16px;
  box-sizing: border-box;
}

/* 四块内容下方的输入框 */
.home-dock {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px;
  align-items: end;
  margin-top: 18px;
  padding: 14px 16px;
  border-radius: calc(var(--radius-lg) + 2px);
  background:
    linear-gradient(160deg, rgba(255, 255, 255, 0.8), rgba(240, 248, 252, 0.54)),
    rgba(255, 255, 255, 0.36);
  backdrop-filter: blur(18px) saturate(1.2);
  border: 1px solid rgba(255, 255, 255, 0.72);
  box-shadow:
    var(--shadow-soft),
    inset 0 1px 0 rgba(255, 255, 255, 0.85);
  animation: page-rise var(--dur-enter) var(--ease-out) 240ms both;
}

.home-dock textarea {
  resize: none;
  border-radius: 12px;
  border: 1px solid rgba(20, 40, 58, 0.12);
  background: rgba(255, 255, 255, 0.82);
  padding: 10px 12px;
  font: inherit;
  font-size: 0.94rem;
  color: var(--color-ink);
  line-height: 1.5;
}

.home-dock button {
  border: 0;
  border-radius: 12px;
  padding: 12px 22px;
  background: linear-gradient(160deg, #1f8ea8, #176f84);
  color: #fff;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 160ms ease;
}

.home-dock button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.group-entry {
  display: flex;
  align-items: center;
  gap: 11px;
  min-width: 196px;
  padding: 9px 12px;
  border: 1px solid rgba(26, 122, 146, 0.2);
  border-radius: 14px;
  color: #fff;
  background: linear-gradient(145deg, #0f5368, #16798f);
  box-shadow: 0 10px 24px rgba(15, 83, 104, 0.2);
  cursor: pointer;
  text-align: left;
  transition: transform 180ms ease, box-shadow 180ms ease;
}

.group-entry:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 28px rgba(15, 83, 104, 0.26);
}

.group-entry-mark {
  display: flex;
  gap: 3px;
  transform: skewX(-14deg);
}

.group-entry-mark i {
  width: 7px;
  height: 28px;
  border-radius: 2px;
  background: #61d8e5;
}

.group-entry-mark i + i { background: #d8b878; }
.group-entry span:nth-child(2) { display: grid; gap: 2px; }
.group-entry small { color: rgba(255, 255, 255, 0.64); font-size: 0.68rem; }
.group-entry strong { font-size: 0.92rem; letter-spacing: 0.04em; }
.group-entry b { margin-left: auto; font-size: 1.2rem; font-weight: 500; }

:global(.meeting-reminder-overlay) {
  background: rgba(6, 20, 31, 0.5);
  backdrop-filter: blur(5px);
}

:global(.meeting-reminder-dialog) {
  overflow: hidden;
  border: 1px solid rgba(46, 196, 214, 0.22);
  border-radius: 22px;
  background: #f4f9fc;
  box-shadow: 0 28px 80px rgba(6, 20, 31, 0.28);
}

:global(.meeting-reminder-dialog .el-dialog__header) { display: none; }
:global(.meeting-reminder-dialog .el-dialog__body) { padding: 0; }

.meeting-reminder-card {
  position: relative;
  padding: 30px;
  color: #14283a;
  background:
    linear-gradient(135deg, rgba(46, 196, 214, 0.09), transparent 42%),
    linear-gradient(160deg, #fff, #edf6fa);
}

.meeting-reminder-card::before {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 4px;
  content: '';
  background: linear-gradient(90deg, #1a7a92, #2ec4d6 68%, #c9a86c);
}

.reminder-status {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #1a7a92;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.06em;
}

.reminder-status i {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #2ec4d6;
  box-shadow: 0 0 0 5px rgba(46, 196, 214, 0.12);
}

.meeting-reminder-card h2 {
  margin: 17px 0 8px;
  font-family: 'Noto Serif SC', 'Songti SC', serif;
  font-size: 1.72rem;
  letter-spacing: 0.04em;
}

.meeting-reminder-card > p {
  margin: 0;
  color: #5a7084;
  line-height: 1.65;
}

.meeting-reminder-card dl {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin: 24px 0;
}

.meeting-reminder-card dl div {
  padding: 12px;
  border: 1px solid rgba(20, 40, 58, 0.08);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.72);
}

.meeting-reminder-card dt { color: #718497; font-size: 0.7rem; }
.meeting-reminder-card dd { margin: 5px 0 0; font-size: 0.84rem; font-weight: 700; }
.reminder-actions { display: flex; justify-content: flex-end; gap: 10px; }
.reminder-actions button { padding: 11px 18px; border-radius: 11px; cursor: pointer; font-weight: 700; }
.later-button { border: 1px solid rgba(20, 40, 58, 0.12); color: #5a7084; background: #fff; }
.meeting-button { border: 0; color: #fff; background: linear-gradient(145deg, #16798f, #0f5368); box-shadow: 0 9px 22px rgba(15, 83, 104, 0.22); }
.meeting-button span { margin-left: 8px; }

@media (max-width: 640px) {
  .home-dock {
    grid-template-columns: 1fr;
  }
}
</style>
