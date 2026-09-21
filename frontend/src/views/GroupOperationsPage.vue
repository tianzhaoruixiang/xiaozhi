<script setup lang="ts">
import { onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useRoute, useRouter } from 'vue-router'
import OperationsHeader from '../components/operations/OperationsHeader.vue'
import GroupOperationsView from './GroupOperationsView.vue'
import { useOperationsContext } from '../composables/useOperationsContext'
import { getMeetingHandoff, updateMeetingHandoff } from '../composables/useMeetingHandoff'
import type { DistributionTask } from '../types/distribution'

const operations = useOperationsContext()
const route = useRoute()
const router = useRouter()
const handoffId = typeof route.query.handoffId === 'string' ? route.query.handoffId : 'SEC-20260921-001'
const initialGroupId = typeof route.query.groupId === 'string' ? route.query.groupId : ''

const syncSession = () => updateMeetingHandoff(handoffId, {
  status: 'group_execution',
  planVersion: operations.planVersion,
  signoffRecordId: operations.signoffRecordId,
  groups: operations.groups,
  tasks: operations.tasks,
})

onMounted(async () => {
  const session = await getMeetingHandoff(handoffId)
  if (session?.groups?.length && session.tasks?.length) {
    const dispatchedTasks: DistributionTask[] = session.tasks.map((task) => ({
      ...task,
      status: task.status === 'pending' || task.status === 'confirmed' || task.status === 'sent' ? task.status : 'sent',
    }))
    operations.prepare(session.planVersion, session.signoffRecordId, session.groups, dispatchedTasks, session.materials)
  } else {
    operations.ensurePrepared()
  }
  if (initialGroupId && operations.groups.some((group) => group.id === initialGroupId)) {
    operations.selectGroup(initialGroupId)
  }
  await syncSession()
})

const createTask = () => {
  operations.createTask()
  ElMessage.success('补充任务草案已生成并写入群聊')
}

const submitFeedback = () => {
  operations.submitFeedback()
  void syncSession()
  ElMessage.success('任务反馈已回传，台账进度已更新')
}

const generateReport = () => {
  operations.generateDailyReport()
  void syncSession()
  ElMessage.success('已根据本组任务和反馈生成日报草稿')
}

const remindOwner = () => {
  operations.remind()
  ElMessage.info('提醒已发送给对应负责人')
}

const enterDashboard = async () => {
  await syncSession()
  await router.push({ name: 'dashboard', query: { handoffId } })
}
</script>

<template>
  <div class="app-shell operation-mode meeting-shell">
    <OperationsHeader
      :group="operations.activeGroup"
      :overall-progress="operations.overallProgress"
      :plan-version="operations.planVersion"
      :signoff-record-id="operations.signoffRecordId"
      @dashboard="enterDashboard"
    />
    <GroupOperationsView
      :groups="operations.groups"
      :active-group-id="operations.activeGroupId"
      :active-group="operations.activeGroup"
      :messages="operations.activeMessages"
      :tasks="operations.activeTasks"
      :selected-task-id="operations.selectedTaskId"
      :selected-task="operations.selectedTask"
      :watch-item="operations.watchItem"
      :materials="operations.activeMaterials"
      :summary="operations.activeSummary"
      :composer-text="operations.composerText"
      @select="operations.selectGroup"
      @select-task="operations.selectedTaskId = $event"
      @update:composer-text="operations.composerText = $event"
      @send="operations.sendMessage()"
      @create-task="createTask"
      @feedback="submitFeedback"
      @report="generateReport"
      @action="operations.handleCardAction"
      @remind="remindOwner"
    />
  </div>
</template>
