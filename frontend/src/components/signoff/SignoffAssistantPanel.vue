<script setup lang="ts">
import { Bell, CircleCheck, MagicStick, WarningFilled } from '@element-plus/icons-vue'
import AIAssistantAvatar from '../AIAssistantAvatar.vue'
import type { SignoffActivity, SignoffAssistantTask, SignoffDepartment, SignoffOpinion } from '../../types/signoff'

defineProps<{
  currentTask: SignoffAssistantTask
  activities: SignoffActivity[]
  opinion: SignoffOpinion | null
  department?: SignoffDepartment
  signedCount: number
  totalCount: number
  progress: number
}>()

defineEmits<{
  remind: [departmentId: string]
  'complete-all': []
}>()
</script>

<template>
  <aside class="panel-frame signoff-assistant" aria-labelledby="signoff-assistant-title">
    <header class="signoff-assistant-head">
      <AIAssistantAvatar label="会签会议助手机器人头像" />
      <div><h2 id="signoff-assistant-title">会议助手</h2><p>持续跟踪审阅状态</p></div>
      <span class="assistant-online"><i />运行中</span>
    </header>

    <section class="signoff-current-task" aria-live="polite">
      <div><span class="panel-icon"><el-icon><MagicStick /></el-icon></span><div><small>当前工作</small><strong>{{ currentTask.title }}</strong></div></div>
      <p>{{ currentTask.detail }}</p>
      <div class="signoff-meter"><span :style="{ width: `${progress}%` }" /></div>
      <footer><span>会签进度</span><strong>{{ signedCount }} / {{ totalCount }} 单位</strong></footer>
    </section>

    <section v-if="opinion && opinion.status === 'open'" class="assistant-opinion-summary">
      <header><span><el-icon><WarningFilled /></el-icon>意见影响分析</span><b>中等影响</b></header>
      <p>该意见只补充执行触发条件，不改变缓冲区总体部署和作战组职责。</p>
      <ul><li>影响条文：{{ opinion.section }}</li><li>影响任务：现场安保组外围缓冲区布设</li><li>无需重新发起其他单位会签</li></ul>
    </section>

    <section class="signoff-timeline">
      <div class="right-section-title"><span><el-icon><CircleCheck /></el-icon>会签动态</span><small>实时</small></div>
      <article v-for="activity in activities.slice(0, 4)" :key="activity.id" :class="activity.type">
        <i /><div><strong>{{ activity.title }}</strong><p>{{ activity.detail }}</p></div><time>{{ activity.time }}</time>
      </article>
    </section>

    <footer class="signoff-assistant-actions">
      <button
        v-if="department && department.status !== 'signed'"
        type="button"
        class="remind-button"
        @click="$emit('remind', department.id)"
      ><el-icon><Bell /></el-icon>提醒当前单位处理</button>
      <button type="button" class="simulate-button" @click="$emit('complete-all')">同步演示单位返回的签章</button>
      <p class="signoff-boundary-note">会议助手仅汇总、校验和提醒，会签必须由各责任单位确认。</p>
    </footer>
  </aside>
</template>
