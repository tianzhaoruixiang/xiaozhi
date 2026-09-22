<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useGroupTasks } from '../data/groupTasks'
import WorkbenchHeader from '../components/WorkbenchHeader.vue'
import MultiGroupTaskBoard from '../components/MultiGroupTaskBoard.vue'
import MeetingReminderDialog from '../components/MeetingReminderDialog.vue'

const { groups } = useGroupTasks()
const route = useRoute()
const router = useRouter()

// /command/task：总结材料生成交互页（整页由 /writing.html 提供，参考 writingAndLib/writing.html）
const isTaskPage = computed(
  () => route.path === '/command/task' || route.path.startsWith('/command/task/'),
)

// 首页输入的对话通过 ?q= 透传，由 writing.html 读取后自动开始执行
const writingSrc = computed(() => {
  const q = typeof route.query.q === 'string' && route.query.q ? route.query.q : ''
  return q ? `/writing.html?q=${encodeURIComponent(q)}` : '/writing.html'
})

/** 页头右上角按钮：跳转指挥态势大屏 */
const SCREEN_PATH = '/dashboard'

/** 进入本台后弹出「大型会议保障动员会」提醒（任务页不弹） */
const reminderVisible = ref(false)
let reminderTimer: number | undefined

onMounted(() => {
  if (isTaskPage.value) return
  reminderTimer = window.setTimeout(() => {
    reminderVisible.value = true
  }, 650)
})

onUnmounted(() => {
  if (reminderTimer) window.clearTimeout(reminderTimer)
})

/** 底部输入框：进入 /command/task 交给智枢办理 */
const homeDraft = ref('')
const startFreeTask = () => {
  const text = homeDraft.value.trim()
  if (!text) return
  homeDraft.value = ''
  void router.push(`/command/task?q=${encodeURIComponent(text)}`)
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

    <div class="shell wide" :class="{ task: isTaskPage }">
      <template v-if="isTaskPage">
        <iframe class="task-frame" :src="writingSrc" title="总结材料生成工作台" />
      </template>

      <template v-else>
        <WorkbenchHeader compact brand="高总，您好" tagline="专项任务 · 各组任务进展与工作组成果">
          <template #actions>
            <RouterLink class="library-link" to="/library">
              <span class="library-mark" aria-hidden="true" />
              档案馆
              <b aria-hidden="true">→</b>
            </RouterLink>
            <RouterLink class="screen-link" :to="SCREEN_PATH">
              <span class="screen-mark" aria-hidden="true" />
              大屏看板
              <b aria-hidden="true">→</b>
            </RouterLink>
          </template>
        </WorkbenchHeader>

        <MultiGroupTaskBoard :groups="groups" />

        <form class="home-dock" @submit.prevent="startFreeTask">
          <textarea
            :value="homeDraft"
            rows="2"
            placeholder="也可以直接问智枢，例如：当前组哪些任务需要我协调资源…"
            @input="homeDraft = ($event.target as HTMLTextAreaElement).value"
            @keydown.enter.exact.prevent="startFreeTask"
          />
          <button type="submit" :disabled="!homeDraft.trim()">发送</button>
        </form>

        <MeetingReminderDialog v-model="reminderVisible" />
      </template>
    </div>
  </div>
</template>

<style scoped>
.workbench {
  position: relative;
  height: 100vh;
  max-height: 100vh;
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

/* 工作台首页：固定一屏，滚动交给「专项任务」内部 */
.shell.wide:not(.task) {
  display: flex;
  flex-direction: column;
  height: 100%;
  max-height: 100vh;
  min-height: 0;
  box-sizing: border-box;
  padding: clamp(16px, 2.4vw, 26px) clamp(16px, 2.6vw, 30px) clamp(12px, 1.8vw, 18px);
}

.shell.task {
  display: flex;
  flex-direction: column;
  height: 100%;
  max-height: 100vh;
  min-height: 0;
  padding: 0;
  box-sizing: border-box;
}

/* 总结材料生成页：充满任务壳体的内嵌页面（无装饰边框，与 /personal/task 视觉一致） */
.task-frame {
  display: block;
  flex: 1;
  min-height: 0;
  width: 100%;
  border: 0;
  background: transparent;
}

/* 四块内容下方的输入框（固定在工作台底部，不参与专项任务内部滚动） */
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
/* 页头右上角：跳转档案馆 */
.library-link {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  padding: 9px 16px 9px 14px;
  border-radius: 999px;
  background: linear-gradient(160deg, #b87a35, #8f5e28);
  color: #fff;
  font-size: 0.86rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-decoration: none;
  white-space: nowrap;
  box-shadow: 0 10px 22px rgba(143, 94, 40, 0.24);
  transition: transform 160ms var(--ease-out), box-shadow 160ms var(--ease-out);
}

.library-link:hover {
  transform: translateY(-1px);
  box-shadow: 0 14px 26px rgba(143, 94, 40, 0.32);
}

/* 档案馆图标（书本） */
.library-mark {
  position: relative;
  width: 14px;
  height: 14px;
  border: 1.5px solid currentColor;
  border-radius: 1px 3px 3px 1px;
  opacity: 0.92;
}

.library-mark::after {
  position: absolute;
  top: 1px;
  left: 0;
  width: 2px;
  height: calc(100% - 2px);
  background: currentColor;
  content: '';
  opacity: 0.6;
}

.library-link b {
  font-family: var(--font-mono);
  font-size: 1rem;
  font-weight: 500;
}

/* 页头右上角：跳转指挥态势大屏 */
.screen-link {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  padding: 9px 16px 9px 14px;
  border-radius: 999px;
  background: linear-gradient(160deg, #1f8ea8, #176f84);
  color: #fff;
  font-size: 0.86rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-decoration: none;
  white-space: nowrap;
  box-shadow: 0 10px 22px rgba(23, 111, 132, 0.24);
  transition: transform 160ms var(--ease-out), box-shadow 160ms var(--ease-out);
}

.screen-link:hover {
  transform: translateY(-1px);
  box-shadow: 0 14px 26px rgba(23, 111, 132, 0.32);
}

/* 小屏图标 */
.screen-mark {
  position: relative;
  width: 16px;
  height: 11px;
  border: 1.5px solid currentColor;
  border-radius: 2px;
  opacity: 0.92;
}

.screen-mark::after {
  position: absolute;
  top: 100%;
  left: 50%;
  width: 7px;
  height: 4px;
  border-right: 1.5px solid currentColor;
  border-bottom: 1.5px solid currentColor;
  border-left: 1.5px solid currentColor;
  border-radius: 0 0 1px 1px;
  content: '';
  transform: translateX(-50%);
}

.screen-link b {
  font-family: var(--font-mono);
  font-size: 1rem;
  font-weight: 500;
}

@media (max-width: 640px) {
  .home-dock {
    grid-template-columns: 1fr;
  }
}
</style>
