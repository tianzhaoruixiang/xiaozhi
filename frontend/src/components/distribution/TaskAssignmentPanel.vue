<script setup lang="ts">
import { Check, Clock, DocumentChecked, Link, UserFilled } from '@element-plus/icons-vue'
import type { DistributionGroup, DistributionTask } from '../../types/distribution'
import type { SignoffClause } from '../../types/signoff'

const props = defineProps<{
  group?: DistributionGroup
  tasks: DistributionTask[]
  clauses: SignoffClause[]
  planVersion: string
  signoffRecordId: string
}>()

defineEmits<{ confirm: [taskId: string]; 'pull-members': [groupId: string] }>()

const priorityText = { normal: '常规', important: '重要', urgent: '紧急' }
const statusText = { pending: '待确认', confirmed: '已确认', sent: '已下发' }
const sourcesFor = (task: DistributionTask) => props.clauses.filter((clause) => task.sourceClauseIds.includes(clause.id))
</script>

<template>
  <section class="panel-frame task-assignment" aria-labelledby="task-assignment-title">
    <header class="task-assignment-head">
      <div>
        <span class="distribution-context">{{ group?.name }} · {{ group?.responsibility }}</span>
        <h2 id="task-assignment-title">{{ group?.name }}任务清单</h2>
      </div>
      <div class="assignment-origin"><span>方案版本 {{ planVersion }}</span><i /><span>会签编号 {{ signoffRecordId }}</span></div>
    </header>

    <div class="task-assignment-scroll">
      <section class="group-brief">
        <div class="group-lead"><span>{{ group?.lead.slice(0, 1) }}</span><div><small>作战组组长</small><strong>{{ group?.lead }} · {{ group?.department }}</strong></div></div>
        <div><small>编组人数</small><strong>{{ group?.memberCount }} 人</strong></div>
        <div><small>执行成员</small><strong>{{ group?.membersPulled ? '已到位' : '待组长拉入' }}</strong></div>
        <div><small>任务数量</small><strong>{{ tasks.length }} 项</strong></div>
      </section>

      <section class="group-members" :class="{ pending: !group?.membersPulled }">
        <header>
          <span>本组执行成员</span>
          <small>{{ group?.membersPulled ? `共 ${group?.memberCount} 人 · 由组长拉入` : '尚未拉入' }}</small>
        </header>
        <template v-if="group?.membersPulled">
          <div class="member-chips">
            <span v-for="member in group.members" :key="member.name" class="member-chip">
              <strong>{{ member.name }}</strong>
              <small>{{ member.role }} · {{ member.unit }}</small>
            </span>
            <span class="member-more">等 {{ group.memberCount }} 人</span>
          </div>
          <p class="member-note">成员由组长从责任单位与协作力量中拉入，不限于本次参会人员。</p>
        </template>
        <template v-else>
          <p class="member-wait">组长尚未拉入执行成员，成员到位后本组任务方可下发。</p>
          <button type="button" class="member-pull-button" @click="group && $emit('pull-members', group.id)">
            <el-icon><UserFilled /></el-icon>组长拉入本组执行成员
          </button>
        </template>
      </section>

      <article v-for="task in tasks" :key="task.id" class="assignment-task" :class="task.status">
        <header>
          <div><span class="task-sequence">{{ task.id.toUpperCase() }}</span><h3>{{ task.title }}</h3></div>
          <div><span :class="['priority-tag', task.priority]">{{ priorityText[task.priority] }}</span><span :class="['task-state', task.status]">{{ statusText[task.status] }}</span></div>
        </header>
        <p class="task-description">{{ task.description }}</p>
        <div class="task-specs">
          <span><el-icon><UserFilled /></el-icon><small>负责人</small><strong>{{ task.owner }}</strong></span>
          <span><el-icon><Clock /></el-icon><small>完成时限</small><strong>{{ task.deadline }}</strong></span>
          <span><el-icon><DocumentChecked /></el-icon><small>交付物</small><strong>{{ task.deliverable }}</strong></span>
        </div>
        <footer>
          <div class="task-links">
            <span><el-icon><Link /></el-icon>{{ task.collaborators.join('、') }}</span>
            <span v-if="sourcesFor(task).length">定稿条款：{{ sourcesFor(task).map((clause) => clause.section).join('、') }}</span>
            <span v-if="sourcesFor(task).length">会议决议：{{ sourcesFor(task).map((clause) => `${clause.speaker} ${clause.decisionTime}`).join('、') }}</span>
            <span v-else>来源：总体安保方案基础任务</span>
          </div>
          <button v-if="task.status === 'pending'" type="button" @click="$emit('confirm', task.id)"><el-icon><Check /></el-icon>确认任务内容</button>
          <span v-else class="task-confirmed"><el-icon><Check /></el-icon>{{ task.status === 'sent' ? '已送达执行人员' : '任务已确认' }}</span>
        </footer>
      </article>
    </div>
  </section>
</template>
