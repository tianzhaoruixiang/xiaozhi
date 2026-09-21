<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useGroupTasks, type GroupTask } from '../data/groupTasks'
import { quickCommandsForTask, type QuickCommand } from '../data/quickCommands'
import WorkbenchHeader from '../components/WorkbenchHeader.vue'
import GroupProgressBoard from '../components/GroupProgressBoard.vue'
import MeetingReminderDialog from '../components/MeetingReminderDialog.vue'
import ReviewQueueDialog from '../components/ReviewQueueDialog.vue'
import { useReviews } from '../data/reviews'

const { currentGroup } = useGroupTasks()
const { pendingCount } = useReviews()
const router = useRouter()

/** 张磊提交的成果待审核 */
const reviewVisible = ref(false)

/** 进入本台后弹出「大型会议保障动员会」提醒 */
const reminderVisible = ref(false)
let reminderTimer: number | undefined

onMounted(() => {
  reminderTimer = window.setTimeout(() => {
    reminderVisible.value = true
  }, 650)
})

onUnmounted(() => {
  if (reminderTimer) window.clearTimeout(reminderTimer)
})

/** 底部输入框：初始为空，由占位提示引导；点击任务后填入任务名 */
const homeDraft = ref('')

/** 点击任务：任务名进入输入框，并按任务状态生成快捷指令 */
const selectedTaskId = ref('')
const selectedTask = computed(
  () => currentGroup.value?.tasks.find((t) => t.id === selectedTaskId.value) ?? null,
)

/** 待分配 → 拆分/分配；进行中 → 进展/风险；已完成 → 成果成效 */
const quickCommands = computed<QuickCommand[]>(() =>
  quickCommandsForTask(selectedTask.value),
)

const selectTask = (task: GroupTask) => {
  selectedTaskId.value = task.id
  homeDraft.value = task.title
}

const applyQuickCommand = (command: QuickCommand) => {
  homeDraft.value = command.text
}

const startFreeTask = () => {
  const text = homeDraft.value.trim()
  if (!text) return
  const taskQuery = selectedTaskId.value
    ? `&task=${encodeURIComponent(selectedTaskId.value)}`
    : ''
  void router.push(`/team/task?q=${encodeURIComponent(text)}${taskQuery}`)
}
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

    <div class="shell wide">
      <WorkbenchHeader compact brand="王处，您好" tagline="专项任务 · 本组各项任务进展" />

      <GroupProgressBoard
        :group="currentGroup"
        :selected-id="selectedTaskId"
        @select="selectTask"
      >
        <template #title-action>
          <!-- 新标签页打开工作组页面，当前工作台不离开 -->
          <RouterLink
            class="group-link"
            to="/group-operations"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span class="group-mark" aria-hidden="true"><i /><i /></span>
            进入工作组
            <b aria-hidden="true">↗</b>
          </RouterLink>
        </template>
        <template #head-action>
          <!-- 待审核：张磊提交的成果，右上角显示待审数量 -->
          <button type="button" class="review-entry" @click="reviewVisible = true">
            待审核
            <span v-if="pendingCount > 0" class="review-badge">+{{ pendingCount }}</span>
          </button>
        </template>
      </GroupProgressBoard>

      <form class="home-dock" @submit.prevent="startFreeTask">
        <!-- 输入框：快捷指令在同一框内 -->
        <div class="composer">
          <textarea
            :value="homeDraft"
            rows="2"
            :placeholder="
              selectedTask
                ? '可补充说明后发送'
                : '你可以向小智分配任务，询问进度'
            "
            @input="homeDraft = ($event.target as HTMLTextAreaElement).value"
            @keydown.enter.exact.prevent="startFreeTask"
          />

          <div v-if="quickCommands.length" class="quick-bar">
            <button
              v-for="command in quickCommands"
              :key="command.id"
              type="button"
              class="quick-chip"
              @click="applyQuickCommand(command)"
            >
              {{ command.label }}
            </button>
          </div>
        </div>

        <button type="submit" :disabled="!homeDraft.trim()">发送</button>
      </form>
    </div>

    <MeetingReminderDialog v-model="reminderVisible" />
    <ReviewQueueDialog v-model="reviewVisible" />
  </div>
</template>

<style scoped>
.workbench {
  position: relative;
  /* 固定一屏：页面自身不滚动，滚动交给任务 / 成员两栏 */
  height: 100vh;
  max-height: 100vh;
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
  display: flex;
  flex-direction: column;
  height: 100%;
  max-height: 100%;
  min-height: 0;
  max-width: 1440px;
  padding: clamp(16px, 2.4vw, 26px) clamp(16px, 2.6vw, 30px) clamp(12px, 1.8vw, 18px);
  box-sizing: border-box;
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

/* 底部输入框：固定在工作台底部，不参与两栏滚动 */
.home-dock {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px;
  align-items: end;
  margin-top: 14px;
  flex-shrink: 0;
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

/* 输入框：快捷指令与文本框同在一个边框内 */
.composer {
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 4px 4px 6px;
  border: 1px solid rgba(20, 40, 58, 0.12);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.82);
  transition: border-color 160ms ease, box-shadow 160ms ease;
}

.composer:focus-within {
  border-color: rgba(26, 122, 146, 0.45);
  box-shadow: 0 0 0 3px rgba(46, 196, 214, 0.12);
}

.composer textarea {
  resize: none;
  border: 0;
  background: transparent;
  padding: 8px 8px 4px;
  font: inherit;
  font-size: 0.94rem;
  color: var(--color-ink);
  line-height: 1.5;
  outline: none;
}

/* 未选任务时的提示文案：灰色 */
.home-dock textarea::placeholder {
  color: #93a3b1;
  opacity: 1;
}

/* 仅提交按钮用按钮样式；不要命中框内的快捷指令标签 */
.home-dock button[type='submit'] {
  border: 0;
  border-radius: 12px;
  padding: 12px 22px;
  background: linear-gradient(160deg, #1f8ea8, #176f84);
  color: #fff;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 160ms ease;
}

.home-dock button[type='submit']:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 点击任务后出现在输入框内部的快捷指令（行内标签） */
.quick-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin: 5px 8px 1px;
}

/* 标签形式：与文字同高、虚线描边、两端半圆、无底色（限定在输入框内，避免被提交按钮样式覆盖） */
.home-dock .quick-chip {
  display: inline-flex;
  align-items: center;
  padding: 0 10px;
  border: 1px dashed rgba(26, 122, 146, 0.5);
  border-radius: 999px;
  background: transparent;
  color: var(--color-accent);
  font-size: 0.78rem;
  font-weight: 500;
  line-height: 1.5;
  cursor: pointer;
  transition:
    border-color 160ms ease,
    color 160ms ease;
}

.home-dock .quick-chip:hover {
  border-color: rgba(26, 122, 146, 0.9);
  color: #12606f;
}

/* 待审核入口（右上角带 +N 角标） */
.review-entry {
  position: relative;
  padding: 6px 14px;
  border: 1px solid rgba(26, 122, 146, 0.34);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.72);
  color: var(--color-accent);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 160ms ease, background 160ms ease;
}

.review-entry:hover {
  border-color: rgba(26, 122, 146, 0.6);
  background: rgba(255, 255, 255, 0.92);
}

.review-badge {
  position: absolute;
  top: -9px;
  right: -9px;
  min-width: 1.4rem;
  padding: 1px 6px;
  border-radius: 999px;
  background: linear-gradient(160deg, #d9534f, #a84848);
  color: #fff;
  font-family: var(--font-mono);
  font-size: 0.7rem;
  font-weight: 700;
  line-height: 1.5;
  text-align: center;
  box-shadow:
    0 0 0 2px rgba(255, 255, 255, 0.9),
    0 4px 12px rgba(168, 72, 72, 0.38);
  animation: badge-pop 460ms var(--ease-out) both;
}

@keyframes badge-pop {
  0% {
    transform: scale(0.5);
    opacity: 0;
  }
  60% {
    transform: scale(1.14);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
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
/* 「专项任务」标题右侧：跳转工作组 */
.group-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 13px 6px 11px;
  border-radius: 999px;
  background: linear-gradient(160deg, #1f8ea8, #176f84);
  color: #fff;
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-decoration: none;
  white-space: nowrap;
  box-shadow: 0 6px 14px rgba(23, 111, 132, 0.22);
  transition: transform 160ms var(--ease-out), box-shadow 160ms var(--ease-out);
}

.group-link:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 20px rgba(23, 111, 132, 0.3);
}

/* 斜切双条：工作组标识 */
.group-mark {
  display: flex;
  gap: 3px;
  transform: skewX(-14deg);
}

.group-mark i {
  width: 4px;
  height: 12px;
  border-radius: 1px;
  background: currentColor;
}

.group-mark i + i {
  opacity: 0.6;
}

.group-link b {
  font-family: var(--font-mono);
  font-size: 0.9rem;
  font-weight: 500;
}

@media (max-width: 640px) {
  .home-dock {
    grid-template-columns: 1fr;
  }
}
</style>
