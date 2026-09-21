<script setup lang="ts">
import { computed } from 'vue'
import { Bell, Document, Files, List, Warning } from '@element-plus/icons-vue'
import type { AssistantWatchItem, DailySummary, OperationGroup, OperationMaterial, OperationTask } from '../../types/operations'

const props = defineProps<{
  group?: OperationGroup
  tasks: OperationTask[]
  selectedTaskId: string
  watchItem?: AssistantWatchItem
  materials: OperationMaterial[]
  summary: DailySummary
}>()

defineEmits<{
  'select-task': [taskId: string]
  remind: []
  report: []
}>()

const statusLabels: Record<OperationTask['status'], string> = {
  pending: '待执行', doing: '执行中', review: '待核验', done: '已完成', exception: '有异常',
}

const summaryText = computed(() => `完成${props.summary.completed}项 · 进行中${props.summary.progressing}项 · 反馈${props.summary.feedbacks}条`)
const issuedMaterials = computed(() => props.materials.filter((material) => material.category === 'issued'))
const feedbackMaterials = computed(() => props.materials.filter((material) => material.category === 'feedback'))
</script>

<template>
  <aside class="panel-frame operation-command">
    <header class="operation-command-head">
      <span class="panel-icon"><el-icon><List /></el-icon></span>
      <div><h2>任务协同台账</h2><p>{{ group?.name }} · {{ tasks.length }}项任务</p></div>
      <strong>{{ group?.progress }}%</strong>
    </header>

    <div class="operation-command-scroll">
      <section v-if="watchItem" class="assistant-watch" :class="watchItem.tone">
        <header><span><el-icon><Warning v-if="watchItem.tone === 'warning'" /><Bell v-else /></el-icon>助手关注</span><i /></header>
        <h3>{{ watchItem.title }}</h3>
        <p>{{ watchItem.detail }}</p>
        <button type="button" @click="$emit('remind')">{{ watchItem.action }}</button>
      </section>

      <section class="operation-task-section">
        <div class="operation-section-title"><span><el-icon><List /></el-icon>当前任务</span><small>{{ summaryText }}</small></div>
        <div class="operation-task-list">
          <button
            v-for="task in tasks"
            :key="task.id"
            type="button"
            :class="[{ active: selectedTaskId === task.id }, `status-${task.status}`]"
            @click="$emit('select-task', task.id)"
          >
            <span class="operation-task-state">{{ statusLabels[task.status] }}</span>
            <strong>{{ task.title }}</strong>
            <small>{{ task.owner }} · {{ task.deadline }}</small>
            <span class="operation-task-progress"><i><b :style="{ width: `${task.progress}%` }" /></i><em>{{ task.progress }}%</em></span>
            <span class="operation-task-feedback">{{ task.feedbackCount }}条反馈</span>
          </button>
        </div>
      </section>

      <section class="operation-materials">
        <div class="operation-section-title"><span><el-icon><Files /></el-icon>群文件</span><small>{{ materials.length }}份</small></div>
        <div class="material-group-label issued"><span>任务下发</span><small>{{ issuedMaterials.length }}份</small></div>
        <article v-for="material in issuedMaterials" :key="material.id">
          <span><el-icon><Document /></el-icon></span>
          <div><strong>{{ material.title }}</strong><small>{{ material.type }}</small></div>
          <b :class="{ read: material.read }">{{ material.read ? '已查阅' : '待查阅' }}</b>
        </article>
        <div class="material-group-label feedback"><span>反馈材料</span><small>{{ feedbackMaterials.length }}份</small></div>
        <article v-for="material in feedbackMaterials" :key="material.id">
          <span><el-icon><Document /></el-icon></span>
          <div><strong>{{ material.title }}</strong><small>{{ material.type }}</small></div>
          <b :class="{ read: material.read }">{{ material.read ? '已查阅' : '待查阅' }}</b>
        </article>
      </section>
    </div>

    <footer class="operation-daily-entry">
      <div><strong>作战日报</strong><span>助手将按任务和有效反馈自动汇总</span></div>
      <button type="button" @click="$emit('report')">生成本组日报</button>
    </footer>
  </aside>
</template>
