<script setup lang="ts">
import { computed, ref } from 'vue'
import { Promotion, Search, Check } from '@element-plus/icons-vue'
import AssistantPulseChart from './AssistantPulseChart.vue'
import AIAssistantAvatar from './AIAssistantAvatar.vue'
import type { AssistantActivity, AssistantTask, Participant, Suggestion } from '../types/meeting'
import { getAvatar } from '../utils/avatars'

const props = defineProps<{
  participants: Participant[]
  currentTask: AssistantTask
  activities: AssistantActivity[]
  registeredSuggestions: Suggestion[]
  assistantReply: string
  pulse: number[]
}>()

const emit = defineEmits<{ command: [command: string] }>()

const command = ref('')
const personMap = computed(() => new Map(props.participants.map((person) => [person.id, person])))
// 只展示最新识别到的建议，出现新建议时替换上一条
const latestSuggestion = computed(() => props.registeredSuggestions.at(-1) ?? null)

const send = (preset?: string) => {
  const value = preset ?? command.value
  if (!value.trim()) return
  emit('command', value)
  command.value = ''
}
</script>

<template>
  <aside class="assistant-panel panel-frame">
    <header class="panel-header assistant-header">
      <AIAssistantAvatar />
      <div>
        <h2>会议助手</h2>
      </div>
      <span class="ai-status"><i />持续工作中</span>
    </header>

    <section class="current-task-card">
      <div class="task-glow" />
      <div class="task-heading">
        <div class="task-icon"><el-icon><Search /></el-icon></div>
        <div><span>当前工作</span><strong>{{ currentTask.title }}</strong></div>
        <div class="task-percent">{{ 42 + currentTask.activeStep * 19 }}<small>%</small></div>
      </div>
      <p>{{ currentTask.detail }}</p>
      <div class="task-steps">
        <div v-for="(step, index) in currentTask.steps" :key="step" :class="{ done: index < currentTask.activeStep, active: index === currentTask.activeStep }">
          <i><el-icon v-if="index < currentTask.activeStep"><Check /></el-icon></i><span>{{ step }}</span>
        </div>
      </div>
      <AssistantPulseChart :data="pulse" />
      <div class="chart-caption"><span>实时分析负载</span><span>当前 {{ pulse.at(-1) }}%</span></div>
    </section>

    <section v-if="latestSuggestion" class="decision-card">
      <div class="decision-alert">
        <span>已识别到 {{ registeredSuggestions.length }} 条会议建议</span>
        <em>最新 · 待统稿确认</em>
      </div>
      <div class="registered-item">
        <img class="speech-avatar" :src="getAvatar(personMap.get(latestSuggestion.speakerId)?.name ?? '')" :alt="personMap.get(latestSuggestion.speakerId)?.name" />
        <div class="registered-copy">
          <strong>{{ latestSuggestion.title }}</strong>
          <span>{{ personMap.get(latestSuggestion.speakerId)?.name }} · {{ latestSuggestion.time }} · 拟写入{{ latestSuggestion.chapter }}</span>
        </div>
      </div>
      <p class="registered-note">建议已写入方案待修改清单（版本同步更新），统稿确认阶段统一审定，无需现场逐条确认。</p>
    </section>

    <section v-else class="decision-empty">
      <div class="empty-scanner"><i /></div>
      <strong>持续监听会议建议</strong>
      <span>识别到可执行意见后，将自动登记为统稿事项</span>
    </section>

    <section class="activity-section">
      <div class="section-heading compact"><span>助手动态</span><small>实时</small></div>
      <div class="activity-list">
        <div v-for="activity in activities.slice(0, 3)" :key="activity.id" class="activity-item" :class="activity.type">
          <div class="activity-marker"><span /></div>
          <div class="activity-copy"><strong>{{ activity.title }}</strong><p>{{ activity.detail }}</p></div>
          <time>{{ activity.time }}</time>
        </div>
      </div>
    </section>

    <section class="assistant-command">
      <div class="assistant-reply"><span>智</span><p>{{ assistantReply }}</p></div>
      <div class="quick-commands">
        <button @click="send('汇总当前会议重点')">汇总重点</button>
        <button @click="send('说明方案版本变化')">版本变化</button>
        <button @click="send('检查当前职责空白')">职责检查</button>
      </div>
      <div class="command-input">
        <input v-model="command" placeholder="向会议助手下达指令…" @keyup.enter="send()" />
        <button aria-label="发送指令" @click="send()"><el-icon><Promotion /></el-icon></button>
      </div>
    </section>
  </aside>
</template>
