<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ArrowRight, Check, EditPen, Promotion, Search, Timer } from '@element-plus/icons-vue'
import AssistantPulseChart from './AssistantPulseChart.vue'
import AIAssistantAvatar from './AIAssistantAvatar.vue'
import type { AssistantActivity, AssistantTask, Participant, Suggestion } from '../types/meeting'

const props = defineProps<{
  participants: Participant[]
  currentTask: AssistantTask
  activities: AssistantActivity[]
  pendingSuggestion: Suggestion | null
  assistantReply: string
  pulse: number[]
}>()

const emit = defineEmits<{
  accept: [content?: string]
  defer: []
  command: [command: string]
}>()

const command = ref('')
const editVisible = ref(false)
const editText = ref('')
const personMap = computed(() => new Map(props.participants.map((person) => [person.id, person])))

watch(() => props.pendingSuggestion, (suggestion) => {
  editText.value = suggestion?.content ?? ''
}, { immediate: true })

const send = (preset?: string) => {
  const value = preset ?? command.value
  if (!value.trim()) return
  emit('command', value)
  command.value = ''
}

const openEdit = () => {
  editText.value = props.pendingSuggestion?.content ?? ''
  editVisible.value = true
}

const confirmEdit = () => {
  emit('accept', editText.value)
  editVisible.value = false
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

    <section v-if="pendingSuggestion" class="decision-card">
      <div class="decision-alert"><span>智能识别到一条建议</span><em>需领导确认</em></div>
      <div class="decision-source">
        <div class="mini-avatar">{{ personMap.get(pendingSuggestion.speakerId)?.initial }}</div>
        <div>
          <strong>{{ personMap.get(pendingSuggestion.speakerId)?.name }}</strong>
          <span>{{ pendingSuggestion.time }} · 发言建议</span>
        </div>
      </div>
      <h3>{{ pendingSuggestion.title }}</h3>
      <blockquote>{{ pendingSuggestion.content }}</blockquote>
      <div class="decision-evidence">
        <span>拟写入：{{ pendingSuggestion.chapter }}</span>
        <span>关联 {{ pendingSuggestion.references }} 份材料</span>
      </div>
      <div class="decision-actions">
        <button class="secondary-action" @click="openEdit"><el-icon><EditPen /></el-icon>修改后采纳</button>
        <button class="primary-action" @click="$emit('accept')"><el-icon><Check /></el-icon>采纳建议</button>
      </div>
      <button class="defer-action" @click="$emit('defer')">暂不处理，加入会后待办</button>
    </section>

    <section v-else class="decision-empty">
      <div class="empty-scanner"><i /></div>
      <strong>持续监听会议建议</strong>
      <span>发现可执行意见后，将自动生成确认卡片</span>
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

    <el-dialog v-model="editVisible" title="修改建议后采纳" width="32.5rem" class="security-dialog">
      <div class="dialog-hint"><el-icon><Timer /></el-icon>修改内容将直接写入 {{ pendingSuggestion?.chapter }}</div>
      <el-input v-model="editText" type="textarea" :rows="5" resize="none" />
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmEdit">确认采纳 <el-icon><ArrowRight /></el-icon></el-button>
      </template>
    </el-dialog>
  </aside>
</template>
