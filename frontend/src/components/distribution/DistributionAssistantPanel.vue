<script setup lang="ts">
import { CircleCheck, Files, MagicStick, Promotion } from '@element-plus/icons-vue'
import AIAssistantAvatar from '../AIAssistantAvatar.vue'
import type {
  DistributionActivity,
  DistributionAssistantTask,
  DistributionGroup,
  DistributionMaterial,
  DistributionTask,
} from '../../types/distribution'

const props = defineProps<{
  currentTask: DistributionAssistantTask
  activities: DistributionActivity[]
  materials: DistributionMaterial[]
  group?: DistributionGroup
  groupTasks: DistributionTask[]
  pendingCount: number
  pendingMemberCount: number
  dispatched: boolean
}>()

defineEmits<{ 'confirm-group': [groupId: string]; 'confirm-all': []; 'pull-members': [groupId: string] }>()

const materialStatusText = { ready: '待发送', sent: '已送达', read: '已查阅' }
const pendingInGroup = () => props.groupTasks.filter((task) => task.status === 'pending').length
</script>

<template>
  <aside class="panel-frame distribution-assistant" aria-labelledby="distribution-assistant-title">
    <header class="distribution-assistant-head">
      <AIAssistantAvatar label="任务部署会议助手机器人头像" />
      <div><h2 id="distribution-assistant-title">会议助手</h2><p>任务拆解、责任校核与送达检查</p></div>
      <span class="assistant-online"><i />持续检查</span>
    </header>

    <section class="distribution-current-task" aria-live="polite">
      <div><span class="panel-icon"><el-icon><MagicStick /></el-icon></span><div><small>当前工作</small><strong>{{ currentTask.title }}</strong></div></div>
      <p>{{ currentTask.detail }}</p>
      <div class="distribution-checks"><span class="done"><i>✓</i>责任人</span><span class="done"><i>✓</i>完成时限</span><span class="active"><i />跨组依赖</span><span><i />材料送达</span></div>
    </section>

    <section class="group-readiness">
      <header><span><el-icon><CircleCheck /></el-icon>{{ group?.name }}完整性</span><b>{{ groupTasks.length - pendingInGroup() }}/{{ groupTasks.length }}</b></header>
      <div class="readiness-line"><span :style="{ width: `${groupTasks.length ? ((groupTasks.length - pendingInGroup()) / groupTasks.length) * 100 : 0}%` }" /></div>
      <p v-if="pendingInGroup()">还有 {{ pendingInGroup() }} 项任务需要确认，确认后可随整批任务下发。</p>
      <p v-else-if="group && !group.membersPulled">组长尚未拉入执行成员，成员到位后本组任务方可下发。</p>
      <p v-else>负责人、时限、协作单位和交付物均已完整。</p>
      <button v-if="group && pendingInGroup()" type="button" @click="$emit('confirm-group', group.id)">确认当前组全部任务</button>
      <button v-else-if="group && !group.membersPulled" type="button" @click="$emit('pull-members', group.id)">拉入本组执行成员</button>
    </section>

    <section class="distribution-materials">
      <div class="right-section-title"><span><el-icon><Files /></el-icon>待发材料</span><small>{{ materials.length }} 份</small></div>
      <article v-for="material in materials" :key="material.id">
        <span><el-icon><Files /></el-icon></span>
        <div><strong>{{ material.title }}</strong><p>{{ material.type }} · {{ material.recipients }}</p></div>
        <b :class="material.status">{{ materialStatusText[material.status] }}</b>
      </article>
    </section>

    <section class="distribution-activities">
      <div class="right-section-title"><span><el-icon><Promotion /></el-icon>部署动态</span><small>实时</small></div>
      <article v-for="activity in activities.slice(0, 3)" :key="activity.id" :class="activity.type"><i /><div><strong>{{ activity.title }}</strong><p>{{ activity.detail }}</p></div><time>{{ activity.time }}</time></article>
    </section>

    <footer class="distribution-assistant-actions">
      <p v-if="!dispatched">全局还有 {{ pendingCount }} 项任务待确认<template v-if="pendingMemberCount > 0">，{{ pendingMemberCount }} 个组待拉成员</template></p>
      <p v-else>所有任务与材料均已完成下发</p>
      <button type="button" :disabled="pendingCount === 0 || dispatched" @click="$emit('confirm-all')">智能补全并确认剩余任务</button>
    </footer>
  </aside>
</template>
