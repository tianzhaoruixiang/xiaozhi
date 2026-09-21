<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { ArrowRight, Check, CircleCloseFilled, Clock, DocumentChecked, UserFilled } from '@element-plus/icons-vue'
import { agendaPhases, planDocument } from '../mock/meeting'
import type { Participant } from '../types/meeting'
import { getAvatar } from '../utils/avatars'

const props = defineProps<{
  participants: Participant[]
  activeSpeakerId: string
  planVersion: string
  isRunning: boolean
  phase: number
}>()

const planVisible = ref(false)
const planTab = ref('security')
const participantList = ref<HTMLElement | null>(null)
const signedCount = computed(() => props.participants.filter((p) => p.signedIn).length)
const totalCount = computed(() => props.participants.length)

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
        <small>{{ isRunning ? `${participants.length} 人在线` : `${signedCount}/${totalCount} 已签到` }}</small>
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
      role="button"
      tabindex="0"
      aria-label="查看当前版本方案与会议纪要"
      @click="planVisible = true"
      @keydown.enter.prevent="planVisible = true"
      @keydown.space.prevent="planVisible = true"
      :aria-disabled="!isRunning"
    >
      <div class="plan-head">
        <span class="plan-label">当前方案版本</span>
        <span class="plan-hint">方案与纪要<el-icon><ArrowRight /></el-icon></span>
      </div>
      <div class="plan-version">{{ planVersion }}</div>
      <div class="plan-meta"><span>自动保存</span><span>{{ isRunning ? '刚刚更新' : '等待会议开始' }}</span></div>
      <div class="plan-progress"><i :style="{ width: isRunning ? '30%' : '0%' }" /></div>
    </section>

    <el-dialog v-model="planVisible" :title="`${planVersion} · 会议方案与纪要`" width="42.5rem" class="security-dialog plan-dialog">
      <div class="plan-summary">
        <span>拟稿单位：{{ planDocument.draftUnit }}</span>
        <span>更新时间：{{ planDocument.updatedAt }}</span>
        <span>状态：{{ isRunning ? '会议修订中' : '会议未开始' }}</span>
      </div>

      <el-tabs v-model="planTab" class="plan-tabs">
        <el-tab-pane :label="`安保方案（${planDocument.chapters.length} 章）`" name="security">
          <section class="plan-changes">
            <h4>本版主要变更</h4>
            <ul>
              <li v-for="item in planDocument.changes" :key="item">{{ item }}</li>
            </ul>
          </section>

          <section class="plan-chapters">
            <article v-for="chapter in planDocument.chapters" :key="chapter.id" class="plan-chapter">
              <h5><span>{{ chapter.no }}</span>{{ chapter.title }}</h5>
              <ul>
                <li v-for="item in chapter.items" :key="item">{{ item }}</li>
              </ul>
            </article>
          </section>
        </el-tab-pane>

        <el-tab-pane :label="`工作组安排（${planDocument.groups.length} 组）`" name="groups">
          <section class="work-groups">
            <article v-for="group in planDocument.groups" :key="group.id" class="work-group">
              <header class="work-group-head">
                <h5>{{ group.name }}</h5>
                <span>{{ group.size }} 人</span>
              </header>
              <p class="work-group-lead">组长 {{ group.lead }} · {{ group.department }}</p>
              <ul>
                <li v-for="task in group.tasks" :key="task">{{ task }}</li>
              </ul>
            </article>
          </section>
        </el-tab-pane>

        <el-tab-pane label="会议纪要" name="minutes">
          <section class="meeting-minutes">
            <header class="minutes-head">
              <div>
                <small>会议纪要</small>
                <h4>{{ planDocument.minutes.title }}</h4>
              </div>
              <span>{{ planDocument.minutes.status }}</span>
            </header>

            <div class="minutes-meta">
              <span>记录：{{ planDocument.minutes.recorder }}</span>
              <span>更新时间：{{ planDocument.updatedAt }}</span>
            </div>

            <section class="minutes-section">
              <h4>会议概述</h4>
              <p>{{ planDocument.minutes.summary }}</p>
            </section>

            <section class="minutes-section">
              <h4>议定事项</h4>
              <ol class="minutes-decisions">
                <li v-for="item in planDocument.minutes.decisions" :key="item">{{ item }}</li>
              </ol>
            </section>

            <section class="minutes-section">
              <h4>后续任务</h4>
              <div class="minutes-actions">
                <article v-for="item in planDocument.minutes.actions" :key="item.id">
                  <strong>{{ item.content }}</strong>
                  <span>{{ item.owner }}</span>
                  <time>{{ item.deadline }}</time>
                </article>
              </div>
            </section>
          </section>
        </el-tab-pane>
      </el-tabs>
    </el-dialog>
  </aside>
</template>
