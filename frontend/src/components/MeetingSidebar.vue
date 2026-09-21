<script setup lang="ts">
import { ref } from 'vue'
import { ArrowRight, Check, Clock, DocumentChecked, UserFilled } from '@element-plus/icons-vue'
import { planDocument } from '../mock/meeting'
import type { Participant } from '../types/meeting'

defineProps<{
  participants: Participant[]
  activeSpeakerId: string
  planVersion: string
}>()

const planVisible = ref(false)
const planTab = ref('security')

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
      <div class="participant-list">
        <div v-for="person in participants" :key="person.id" class="participant-item" :class="{ speaking: person.id === activeSpeakerId }">
          <div class="avatar" :style="{ '--avatar-color': person.color }">
            {{ person.initial }}
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
      aria-label="查看当前版本方案内容"
      @click="planVisible = true"
      @keydown.enter.prevent="planVisible = true"
      @keydown.space.prevent="planVisible = true"
    >
      <div class="plan-head">
        <span class="plan-label">当前方案版本</span>
        <span class="plan-hint">查看方案<el-icon><ArrowRight /></el-icon></span>
      </div>
      <div class="plan-version">{{ planVersion }}</div>
      <div class="plan-meta"><span>自动保存</span><span>刚刚更新</span></div>
      <div class="plan-progress"><i /></div>
    </section>

    <el-dialog v-model="planVisible" :title="`${planVersion} · 大型会议保障动员会`" width="42.5rem" class="security-dialog plan-dialog">
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
      </el-tabs>
    </el-dialog>
  </aside>
</template>
