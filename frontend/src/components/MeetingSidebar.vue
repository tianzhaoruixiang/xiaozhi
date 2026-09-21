<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { ArrowRight, Check, Clock, DocumentChecked, UserFilled } from '@element-plus/icons-vue'
import { planDocument } from '../mock/meeting'
import type { Participant } from '../types/meeting'
import { getAvatar } from '../utils/avatars'

const props = defineProps<{
  participants: Participant[]
  activeSpeakerId: string
  planVersion: string
}>()

const planVisible = ref(false)
const planTab = ref('security')
const participantList = ref<HTMLElement | null>(null)

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

const agenda = [
  { title: '通报前期筹备情况', time: '10:00', done: true },
  { title: '审议总体安保方案', time: '10:15', done: true },
  { title: '各部门补充意见', time: '10:25', active: true },
  { title: '领导总结部署', time: '待开始' },
]
</script>

<template>
  <aside class="meeting-sidebar panel-frame">
    <section class="sidebar-section agenda-section">
      <div class="section-heading">
        <span><el-icon><DocumentChecked /></el-icon>会议议程</span>
        <small>3 / 4</small>
      </div>
      <div class="agenda-list">
        <div v-for="(item, index) in agenda" :key="item.title" class="agenda-item" :class="{ active: item.active, done: item.done }">
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
        <small>{{ participants.length }} 人在线</small>
      </div>
      <div ref="participantList" class="participant-list">
        <div v-for="person in participants" :key="person.id" class="participant-item" :data-participant-id="person.id" :class="{ speaking: person.id === activeSpeakerId }">
          <div class="avatar-wrap">
            <img class="avatar" :src="getAvatar(person.name)" :alt="person.name" />
            <span class="online-dot" />
          </div>
          <div class="participant-copy">
            <strong>{{ person.name }}</strong>
            <span>{{ person.department }}</span>
          </div>
          <div v-if="person.id === activeSpeakerId" class="mini-wave" aria-label="正在发言">
            <i v-for="n in 4" :key="n" />
          </div>
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
    >
      <div class="plan-head">
        <span class="plan-label">当前方案版本</span>
        <span class="plan-hint">方案与纪要<el-icon><ArrowRight /></el-icon></span>
      </div>
      <div class="plan-version">{{ planVersion }}</div>
      <div class="plan-meta"><span>自动保存</span><span>刚刚更新</span></div>
      <div class="plan-progress"><i /></div>
    </section>

    <el-dialog v-model="planVisible" :title="`${planVersion} · 会议方案与纪要`" width="42.5rem" class="security-dialog plan-dialog">
      <div class="plan-summary">
        <span>拟稿单位：{{ planDocument.draftUnit }}</span>
        <span>更新时间：{{ planDocument.updatedAt }}</span>
        <span>状态：会议修订中</span>
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
