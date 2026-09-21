<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useRoute, useRouter } from 'vue-router'
import MeetingHeader from './components/MeetingHeader.vue'
import MeetingLiveStrip from './components/MeetingLiveStrip.vue'
import MeetingSidebar from './components/MeetingSidebar.vue'
import TranscriptPanel from './components/TranscriptPanel.vue'
import AssistantPanel from './components/AssistantPanel.vue'
import BottomStatusBar from './components/BottomStatusBar.vue'
import PlanRevisionView from './views/PlanRevisionView.vue'
import RevisionStatusBar from './components/revision/RevisionStatusBar.vue'
import PlanSignoffView from './views/PlanSignoffView.vue'
import SignoffStatusBar from './components/signoff/SignoffStatusBar.vue'
import TaskDistributionView from './views/TaskDistributionView.vue'
import DistributionStatusBar from './components/distribution/DistributionStatusBar.vue'
import { useMeetingSimulation } from './composables/useMeetingSimulation'
import { usePlanRevision } from './composables/usePlanRevision'
import { usePlanSignoff } from './composables/usePlanSignoff'
import { useTaskDistribution } from './composables/useTaskDistribution'
import { useOperationsContext } from './composables/useOperationsContext'
import { getMeetingHandoff, updateMeetingHandoff } from './composables/useMeetingHandoff'
import type { MeetingHandoff } from './types/handoff'

const meeting = reactive(useMeetingSimulation())
const revision = reactive(usePlanRevision())
const signoff = reactive(usePlanSignoff())
const distribution = reactive(useTaskDistribution())
const operations = useOperationsContext()
const route = useRoute()
const router = useRouter()
const currentStep = ref(1)
const handoff = ref<MeetingHandoff | null>(null)
const handoffId = computed(() => typeof route.query.handoffId === 'string' ? route.query.handoffId : 'SEC-20260921-001')

onMounted(async () => {
  handoff.value = await getMeetingHandoff(handoffId.value)
  if (handoff.value) await updateMeetingHandoff(handoffId.value, { status: 'meeting' })
})

const stageMeta = computed(() => ({
  1: { status: '会议进行中 · 意见征集中', assist: '智能记录中', clock: '会议时长', liveStage: '意见征集中', pending: '待领导确认' },
  2: { status: '会议进行中 · 统稿确认中', assist: '统稿核对中', clock: '会议时长', liveStage: '统稿确认中', pending: '统稿补充事项' },
  3: { status: '会议进行中 · 联合会签中', assist: '会签核验中', clock: '会议时长', liveStage: '联合会签中', pending: '会签补充意见' },
  4: { status: '会议进行中 · 任务部署中', assist: '部署校验中', clock: '会议时长', liveStage: '任务部署中', pending: '任务调整事项' },
}[currentStep.value] ?? { status: '会议进行中', assist: '持续工作中', clock: '会议时长', liveStage: '会议进行中', pending: '待处理事项' }))

const enterRevision = () => {
  revision.startConsolidation(meeting.planVersion)
  currentStep.value = 2
  ElMessage.success('意见征集已完成，会议进入方案统稿确认')
}

const backToMeeting = () => {
  currentStep.value = 1
  meeting.isRunning = true
  ElMessage.info('已返回会议讨论，统稿内容保持保存')
}

const acceptLowRisk = () => {
  const count = revision.acceptLowRisk()
  if (count > 0) ElMessage.success(`已确认 ${count} 项会议决议表述`)
  else ElMessage.info('当前没有可批量确认的统稿事项')
}

const submitRevision = () => {
  if (!revision.canSubmit) {
    ElMessage.warning(`仍有 ${revision.pendingCount} 项表述待确认、${revision.conflictCount} 项冲突待裁决`)
    return
  }
  signoff.prepare(revision.revisionVersion, revision.changes)
  currentStep.value = 3
  ElMessage.success(`会议定稿 ${revision.revisionVersion} 已生成，正在发起联合会签`)
}

const backToRevision = () => {
  currentStep.value = 2
  ElMessage.info('已返回统稿确认，会签状态保持保存')
}

const resolveSignoffOpinion = (opinionId: string) => {
  signoff.resolveOpinion(opinionId)
  ElMessage.success('补充意见已写入定稿条文，等待责任单位确认')
}

const signCurrentDepartment = (departmentId: string) => {
  if (signoff.signDepartment(departmentId)) ElMessage.success('电子会签已完成并留痕')
}

const remindDepartment = (departmentId: string) => {
  if (signoff.sendReminder(departmentId)) ElMessage.info('会签提醒已发送')
}

const completeAllSignoff = () => {
  signoff.completeAll()
  ElMessage.success('已同步演示单位返回的签章，全部单位确认完成')
}

const enterDistribution = () => {
  if (!signoff.canComplete) {
    ElMessage.warning(`仍有 ${signoff.pendingCount} 个单位待会签、${signoff.objectionCount} 条意见待处理`)
    return
  }
  signoff.completeSignoff()
  distribution.prepare(signoff.version, signoff.recordId, signoff.clauses)
  currentStep.value = 4
  ElMessage.success(`会签记录 ${signoff.recordId} 已生成，会议进入任务部署`)
}

const backToSignoff = () => {
  currentStep.value = 3
  ElMessage.info('已返回联合会签，任务部署状态保持保存')
}

const confirmDistributionTask = (taskId: string) => {
  if (distribution.confirmTask(taskId)) ElMessage.success('任务内容已确认')
}

const confirmDistributionGroup = (groupId: string) => {
  const count = distribution.confirmGroup(groupId)
  if (count) ElMessage.success(`当前作战组 ${count} 项任务已确认`)
}

const confirmAllDistributionTasks = () => {
  const count = distribution.confirmAll()
  if (count) ElMessage.success(`已补全并确认剩余 ${count} 项任务`)
  else ElMessage.info('所有任务均已完成确认')
}

const finishMeetingAndEnterOperations = async () => {
  if (!distribution.dispatched && !distribution.canDispatch) {
    ElMessage.warning(`暂时无法下发：${distribution.pendingCount} 项任务待确认`)
    return
  }
  if (!distribution.dispatched) distribution.dispatchAll()
  meeting.isRunning = false
  operations.prepare(distribution.planVersion, distribution.signoffRecordId, distribution.groups, distribution.tasks, distribution.materials)
  await updateMeetingHandoff(handoffId.value, {
    status: 'personal_execution',
    planVersion: distribution.planVersion,
    signoffRecordId: distribution.signoffRecordId,
    groups: distribution.groups,
    tasks: distribution.tasks,
    materials: distribution.materials,
  })
  ElMessage.success('任务与材料已下发，安保动员会正式结束')
  await router.push({ name: 'personal', query: { handoffId: handoffId.value } })
}
</script>

<template>
  <div class="app-shell" :class="{ 'has-live-strip': currentStep > 1 }">
    <MeetingHeader
      :elapsed="meeting.elapsed"
      :current-step="currentStep"
      :status-label="stageMeta.status"
      :assist-label="stageMeta.assist"
      :clock-label="stageMeta.clock"
      status-tone="live"
      :meeting-title="handoff?.title"
      :meeting-time="handoff?.startTime"
      :location="handoff?.location"
      :participant-count="handoff?.participants.length"
    />

    <MeetingLiveStrip
      v-if="currentStep > 1"
      :speaker="meeting.activeSpeaker"
      :live-draft="meeting.liveDraft"
      :assistant-task="meeting.currentTask.title"
      :stage-label="stageMeta.liveStage"
      :pending-label="stageMeta.pending"
      :pending-count="meeting.pendingSuggestion ? 1 : 0"
      :is-running="meeting.isRunning"
    />

    <main v-if="currentStep === 1" class="workspace">
      <MeetingSidebar
        :participants="meeting.participants"
        :active-speaker-id="meeting.activeSpeaker.id"
        :plan-version="meeting.planVersion"
      />

      <TranscriptPanel
        :participants="meeting.participants"
        :transcripts="meeting.transcripts"
        :active-speaker="meeting.activeSpeaker"
        :live-draft="meeting.liveDraft"
        :is-running="meeting.isRunning"
        @toggle-running="meeting.isRunning = !meeting.isRunning"
      />

      <AssistantPanel
        :participants="meeting.participants"
        :current-task="meeting.currentTask"
        :activities="meeting.activities"
        :pending-suggestion="meeting.pendingSuggestion"
        :assistant-reply="meeting.assistantReply"
        :pulse="meeting.pulse"
        @accept="meeting.acceptSuggestion"
        @defer="meeting.deferSuggestion"
        @command="meeting.sendCommand"
      />
    </main>

    <PlanRevisionView
      v-else-if="currentStep === 2"
      :chapters="revision.chapters"
      :all-changes="revision.changes"
      :changes="revision.visibleChanges"
      :selected-chapter="revision.selectedChapter"
      :selected-chapter-id="revision.selectedChapterId"
      :view-mode="revision.viewMode"
      :current-task="revision.currentTask"
      :conflict-change="revision.conflictChange"
      :activities="revision.activities"
      :sources="revision.sources"
      :pending-count="revision.pendingCount"
      :progress="revision.progress"
      :source-version="revision.sourceVersion"
      :target-version="revision.revisionVersion"
      :assistant-reply="revision.assistantReply"
      @select-chapter="revision.selectedChapterId = $event"
      @update:view-mode="revision.viewMode = $event"
      @accept="revision.acceptChange"
      @keep="revision.keepOriginal"
      @resolve="revision.resolveConflict"
      @accept-low-risk="acceptLowRisk"
      @command="revision.sendCommand"
    />

    <PlanSignoffView
      v-else-if="currentStep === 3"
      :version="signoff.version"
      :source-change-count="signoff.sourceChangeCount"
      :clauses="signoff.clauses"
      :departments="signoff.departments"
      :selected-department-id="signoff.selectedDepartmentId"
      :selected-department="signoff.selectedDepartment"
      :selected-opinion="signoff.selectedOpinion"
      :activities="signoff.activities"
      :current-task="signoff.currentTask"
      :materials="signoff.materials"
      :selected-material-id="signoff.selectedMaterialId"
      :selected-material="signoff.selectedMaterial"
      :signed-count="signoff.signedCount"
      :progress="signoff.progress"
      @select="signoff.selectedDepartmentId = $event"
      @resolve="resolveSignoffOpinion"
      @sign="signCurrentDepartment"
      @remind="remindDepartment"
      @select-material="signoff.selectMaterial"
      @complete-all="completeAllSignoff"
    />

    <TaskDistributionView
      v-else
      :plan-version="distribution.planVersion"
      :signoff-record-id="distribution.signoffRecordId"
      :clauses="distribution.sourceClauses"
      :groups="distribution.groups"
      :all-tasks="distribution.tasks"
      :tasks="distribution.visibleTasks"
      :selected-group-id="distribution.selectedGroupId"
      :selected-group="distribution.selectedGroup"
      :current-task="distribution.currentTask"
      :activities="distribution.activities"
      :materials="distribution.materials"
      :pending-count="distribution.pendingCount"
      :progress="distribution.progress"
      :dispatched="distribution.dispatched"
      @select="distribution.selectedGroupId = $event"
      @confirm="confirmDistributionTask"
      @confirm-group="confirmDistributionGroup"
      @confirm-all="confirmAllDistributionTasks"
    />

    <BottomStatusBar
      v-if="currentStep === 1"
      :plan-version="meeting.planVersion"
      :accepted-count="meeting.acceptedCount"
      :pending-count="meeting.pendingSuggestion ? 1 : 0"
      @next="enterRevision"
    />

    <RevisionStatusBar
      v-else-if="currentStep === 2"
      :version="revision.revisionVersion"
      :accepted-count="revision.acceptedCount"
      :pending-count="revision.pendingCount"
      :conflict-count="revision.conflictCount"
      :can-submit="revision.canSubmit"
      @back="backToMeeting"
      @next="submitRevision"
    />

    <SignoffStatusBar
      v-else-if="currentStep === 3"
      :signed-count="signoff.signedCount"
      :pending-count="signoff.pendingCount"
      :objection-count="signoff.objectionCount"
      :can-complete="signoff.canComplete"
      @back="backToRevision"
      @next="enterDistribution"
    />

    <DistributionStatusBar
      v-else
      :confirmed-count="distribution.confirmedCount"
      :pending-count="distribution.pendingCount"
      :total-count="distribution.tasks.length"
      :can-dispatch="distribution.canDispatch"
      :dispatched="distribution.dispatched"
      @back="backToSignoff"
      @finish="finishMeetingAndEnterOperations"
    />
  </div>
</template>
