<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { ArrowRight, Check, CircleCloseFilled, Clock, DocumentChecked, UserFilled } from '@element-plus/icons-vue'
import { agendaPhases } from '../mock/meeting'
import type { Participant } from '../types/meeting'
import { getAvatar } from '../utils/avatars'

const props = defineProps<{
  participants: Participant[]
  activeSpeakerId: string
  planVersion: string
  isRunning: boolean
  phase: number
  planActive?: boolean
  meetingEnded?: boolean
}>()

const emit = defineEmits<{ openPlan: [] }>()
const participantList = ref<HTMLElement | null>(null)
const signedCount = computed(() => props.participants.filter((p) => p.signedIn).length)
const totalCount = computed(() => props.participants.length)
const canOpenPlan = computed(() => props.isRunning || props.meetingEnded)

const openPlan = () => {
  if (!canOpenPlan.value) return
  emit('openPlan')
}

const keepActiveSpeakerInView = async (speakerId: string) => {
  await nextTick()
  const list = participantList.value
  if (!list) return

  const speaker = Array.from(list.querySelectorAll<HTMLElement>('.participant-item'))
    .find((item) => item.dataset.participantId === speakerId)
  if (!speaker) return

  const listRect = list.getBoundingClientRect()
  const speakerRect = speaker.getBoundingClientRect()
  let offset = 0

  if (speakerRect.top < listRect.top) offset = speakerRect.top - listRect.top
  else if (speakerRect.bottom > listRect.bottom) offset = speakerRect.bottom - listRect.bottom
  if (Math.abs(offset) < 1) return

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  list.scrollTo({
    top: Math.max(0, list.scrollTop + offset),
    behavior: reducedMotion ? 'auto' : 'smooth',
  })
}

watch(
  () => props.activeSpeakerId,
  (speakerId) => { void keepActiveSpeakerInView(speakerId) },
  { immediate: true, flush: 'post' },
)

const agendaTitles = [
  { title: '会前准备·人员签到', time: '10:00' },
  { title: '通报前期筹备情况', time: '10:02' },
  { title: '审议总体安保方案', time: '10:08' },
  { title: '各部门补充意见', time: '10:16' },
  { title: '领导总结部署', time: '10:28' },
]

const agenda = computed(() => {
  if (props.meetingEnded) {
    return agendaTitles.map((item) => ({ ...item, done: true, active: false }))
  }
  if (!props.isRunning) {
    return agendaTitles.map((item, index) => ({
      ...item,
      time: index === 0 ? '10:00' : '待签到后',
      done: false,
      active: index === 0,
    }))
  }
  const finished = props.phase >= agendaPhases.length
  return agendaTitles.map((item, index) => {
    // 议程 0 是签到（已完成），议程 1..4 对应 phase 0..3
    if (index === 0) return { ...item, done: true, active: false }
    const itemPhase = index - 1
    const done = finished || itemPhase < props.phase
    const active = !finished && itemPhase === props.phase
    return { ...item, time: active ? '进行中' : done ? item.time : '待开始', done, active }
  })
})
</script>

<template>
  <aside class="meeting-sidebar panel-frame">
    <section class="sidebar-section agenda-section">
      <div class="section-heading">
        <span><el-icon><DocumentChecked /></el-icon>会议议程</span>
        <small>{{ agenda.filter((a) => a.done).length }} / {{ agenda.length }}</small>
      </div>
      <div class="agenda-list">
        <div v-for="(item, index) in agenda" :key="item.title" class="agenda-item" :class="{ active: item.active, done: item.done, disabled: !isRunning && !item.active && !item.done }">
          <div class="agenda-node">
            <el-icon v-if="item.done"><Check /></el-icon>
            <span v-else>{{ index + 1 }}</span>
          </div>
          <div class="agenda-copy">
            <strong>{{ item.title }}</strong>
            <span><el-icon><Clock /></el-icon>{{ item.time }}</span>
          </div>
        </div>
      </div>
    </section>

    <section class="sidebar-section participant-section">
      <div class="section-heading">
        <span><el-icon><UserFilled /></el-icon>参会人员</span>
        <small>{{ meetingEnded ? `${participants.length} 人已确认` : isRunning ? `${participants.length} 人在线` : `${signedCount}/${totalCount} 已签到` }}</small>
      </div>
      <div ref="participantList" class="participant-list">
        <div v-for="person in participants" :key="person.id" class="participant-item" :data-participant-id="person.id" :class="{ speaking: person.id === activeSpeakerId, 'is-me': person.isMe, unsigned: !person.signedIn }">
          <div class="avatar-wrap">
            <img class="avatar" :src="getAvatar(person.name)" :alt="person.name" />
            <span class="online-dot" :class="person.signedIn ? 'signed' : 'unsigned'" />
          </div>
          <div class="participant-copy">
            <strong>{{ person.name }}<em v-if="person.isMe" class="me-tag">我</em></strong>
            <span>{{ person.department }}</span>
          </div>
          <el-icon v-if="isRunning && person.id === activeSpeakerId" class="mini-wave" aria-label="正在发言">
            <svg viewBox="0 0 40 16" width="34" height="14">
              <g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <line x1="3" y1="8" x2="3" y2="8">
                  <animate attributeName="y1" values="8;3;11;6;8" dur="1.2s" repeatCount="indefinite" />
                  <animate attributeName="y2" values="8;13;5;10;8" dur="1.2s" repeatCount="indefinite" />
                </line>
                <line x1="11" y1="8" x2="11" y2="8">
                  <animate attributeName="y1" values="8;11;4;9;8" dur="1.2s" repeatCount="indefinite" />
                  <animate attributeName="y2" values="8;5;12;6;8" dur="1.2s" repeatCount="indefinite" />
                </line>
                <line x1="19" y1="8" x2="19" y2="8">
                  <animate attributeName="y1" values="8;4;11;7;8" dur="1.2s" repeatCount="indefinite" />
                  <animate attributeName="y2" values="8;12;5;9;8" dur="1.2s" repeatCount="indefinite" />
                </line>
                <line x1="27" y1="8" x2="27" y2="8">
                  <animate attributeName="y1" values="8;10;5;11;8" dur="1.2s" repeatCount="indefinite" />
                  <animate attributeName="y2" values="8;4;12;5;8" dur="1.2s" repeatCount="indefinite" />
                </line>
                <line x1="35" y1="8" x2="35" y2="8">
                  <animate attributeName="y1" values="8;6;12;4;8" dur="1.2s" repeatCount="indefinite" />
                  <animate attributeName="y2" values="8;11;5;12;8" dur="1.2s" repeatCount="indefinite" />
                </line>
              </g>
            </svg>
          </el-icon>
          <el-icon v-else-if="person.isMe && !person.signedIn" class="unsigned-badge"><CircleCloseFilled /></el-icon>
          <el-icon v-else-if="!isRunning" class="signed-badge"><Check /></el-icon>
        </div>
      </div>
    </section>

    <section
      class="plan-card"
      :class="{ active: planActive, disabled: !canOpenPlan }"
      role="button"
      :tabindex="canOpenPlan ? 0 : -1"
      aria-label="查看当前版本方案与会议纪要"
      @click="openPlan"
      @keydown.enter.prevent="openPlan"
      @keydown.space.prevent="openPlan"
      :aria-disabled="!canOpenPlan"
    >
      <div class="plan-head">
        <span class="plan-label">当前方案版本</span>
        <span class="plan-hint">方案与纪要<el-icon><ArrowRight /></el-icon></span>
      </div>
      <div class="plan-version">{{ planVersion }}</div>
      <div class="plan-meta"><span>自动保存</span><span>{{ planActive ? '正在查看' : canOpenPlan ? '点击查看完整内容' : '等待会议开始' }}</span></div>
    </section>
  </aside>
</template>

<style scoped>
.plan-card { transition: border-color .18s ease, background-color .18s ease, transform .18s ease; }
.plan-card:not(.disabled):hover { transform: translateY(-1px); border-color: var(--line-strong); }
.plan-card.active { border-color: var(--cyan); background: linear-gradient(110deg, rgba(21,139,161,.12), rgba(255,255,255,.92)); box-shadow: inset .18rem 0 0 var(--cyan); }
.plan-card.disabled { opacity: .65; cursor: not-allowed; }
@media (prefers-reduced-motion: reduce) { .plan-card { transition: none; } }
</style>
