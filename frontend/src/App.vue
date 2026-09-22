<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useRoute, useRouter } from 'vue-router'
import MeetingHeader from './components/MeetingHeader.vue'
import MeetingLiveStrip from './components/MeetingLiveStrip.vue'
import MeetingSidebar from './components/MeetingSidebar.vue'
import TranscriptPanel from './components/TranscriptPanel.vue'
import AssistantPanel from './components/AssistantPanel.vue'
import MeetingPlanWorkspace from './components/MeetingPlanWorkspace.vue'
import DistributionCompletionDialog from './components/distribution/DistributionCompletionDialog.vue'
import { useMeetingSimulation } from './composables/useMeetingSimulation'
import { usePlanRevision } from './composables/usePlanRevision'
import { useMeetingConfirmation } from './composables/useMeetingConfirmation'
import { useTaskDistribution } from './composables/useTaskDistribution'
import { useOperationsContext } from './composables/useOperationsContext'
import { getMeetingHandoff, updateMeetingHandoff } from './composables/useMeetingHandoff'
import type { MeetingHandoff } from './types/handoff'
import type { SignoffClause } from './types/signoff'

const meeting = reactive(useMeetingSimulation())
const revision = reactive(usePlanRevision())
const confirmation = reactive(useMeetingConfirmation())
const distribution = reactive(useTaskDistribution())
const operations = useOperationsContext()
const route = useRoute()
const router = useRouter()
const centerMode = ref<'transcript' | 'plan'>('transcript')
const distributionCompleteVisible = ref(false)
const handoff = ref<MeetingHandoff | null>(null)
const handoffId = computed(() => typeof route.query.handoffId === 'string' ? route.query.handoffId : 'SEC-20260921-001')
const recognizedGroup = computed(() => distribution.groups.find((group) => group.id === 'x') ?? distribution.groups[0])

onMounted(async () => {
  handoff.value = await getMeetingHandoff(handoffId.value)
  if (handoff.value) await updateMeetingHandoff(handoffId.value, { status: 'meeting' })
})

const stageMeta = computed(() => {
  if (confirmation.dispatched) {
    return {
      status: '会议已完成 · 任务已下发',
      clock: '会议总时长',
      liveStage: '任务已下发',
      pending: '待确认人员',
      tone: 'wait' as const,
    }
  }
  if (!meeting.isRunning) {
    return {
      status: `等待签到 · ${meeting.signedCount}/${meeting.totalCount}`,
      clock: '会议尚未开始',
      liveStage: '等待签到',
      pending: '等待签到',
      tone: 'wait' as const,
    }
  }
  if (centerMode.value === 'plan') {
    return {
      status: '会议进行中 · 方案同步审阅',
      clock: '会议时长',
      liveStage: '会议讨论',
      pending: '已登记建议',
      tone: 'revision' as const,
    }
  }
  return { status: '会议进行中 · 讨论与意见征集中', clock: '会议时长', liveStage: '会议讨论', pending: '已登记建议', tone: 'live' as const }
})

const lastSpeech = computed(() => {
  const list = meeting.transcripts.filter((transcript) => transcript.speakerId !== 'assistant')
  const last = list.at(-1)
  if (!last) return ''
  const name = meeting.participants.find((participant) => participant.id === last.speakerId)?.name ?? ''
  return `${name}：${last.content}`
})

const buildClauses = (): SignoffClause[] => revision.changes.map((change) => ({
    id: change.id,
    section: change.section,
    title: change.title,
    finalText: change.status === 'kept' ? change.original : change.revised,
    owner: change.owner,
    speaker: change.speaker,
    department: change.department,
    decisionTime: change.time,
    decision: change.status === 'kept' ? 'kept' : 'accepted',
  }))

const preparePlanWorkspace = () => {
  if (confirmation.prepared) return
  revision.startConsolidation(meeting.planVersion)
  revision.finalizeAll()

  const confirmationId = `CONF-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-001`
  const currentVersion = meeting.planVersion.replace('版本', '').trim()
  distribution.prepare(currentVersion, confirmationId, buildClauses())
  distribution.confirmAll()
  confirmation.prepare(currentVersion, meeting.participants, revision.changes.length, distribution.tasks.length)
}

const openPlanWorkspace = () => {
  preparePlanWorkspace()
  centerMode.value = 'plan'
  ElMessage.success('已在中间工作区打开当前方案、工作组和会议纪要')
}

const closePlanWorkspace = () => {
  if (confirmation.dispatching || confirmation.dispatched) return
  centerMode.value = 'transcript'
}

const dispatchTasks = async () => {
  if (!confirmation.allConfirmed) {
    ElMessage.warning(`仍有 ${confirmation.pendingCount} 位参会人员待确认`)
    return
  }
  if (!confirmation.startDispatch()) return
  distribution.prepare(
    meeting.planVersion.replace('版本', '').trim(),
    distribution.signoffRecordId,
    buildClauses(),
  )
  distribution.dispatchAll()
  meeting.isRunning = false
  meeting.stopStageSpeech()
  operations.prepare(distribution.planVersion, distribution.signoffRecordId, distribution.groups, distribution.tasks, distribution.materials)
  await updateMeetingHandoff(handoffId.value, {
    status: 'dispatched',
    planVersion: distribution.planVersion,
    signoffRecordId: distribution.signoffRecordId,
    groups: distribution.groups,
    tasks: distribution.tasks,
    materials: distribution.materials,
  })
  await new Promise((resolve) => window.setTimeout(resolve, 550))
  confirmation.markDispatched()
  ElMessage.success('签章确认完成，方案、任务与材料已下发')
  distributionCompleteVisible.value = true
}

const confirmCurrentParticipant = () => {
  const participant = meeting.participants.find((item) => item.isMe)
  if (!participant || !confirmation.confirmParticipant(participant.id)) return
  ElMessage.success('签章确认完成，回执已留痕')
}

const confirmParticipant = (participantId: string) => {
  const participant = meeting.participants.find((item) => item.id === participantId)
  if (!confirmation.confirmParticipant(participantId)) return
  ElMessage.success(`${participant?.name ?? '参会人员'}已完成确认`)
}

const openPostMeetingDestination = async (destination: 'workbench' | 'operations' | 'dashboard') => {
  const status = destination === 'workbench'
    ? 'personal_execution'
    : destination === 'operations' ? 'group_execution' : 'commanding'
  await updateMeetingHandoff(handoffId.value, { status })
  distributionCompleteVisible.value = false

  if (destination === 'operations') {
    if (recognizedGroup.value) operations.selectGroup(recognizedGroup.value.id)
    await router.push({
      name: 'group-operations',
      query: { handoffId: handoffId.value, groupId: recognizedGroup.value?.id },
    })
    return
  }

  await router.push({
    name: destination === 'workbench' ? 'personal' : 'dashboard',
    query: { handoffId: handoffId.value },
  })
}
</script>

<template>
  <div class="app-shell meeting-shell no-fixed-footer" :class="{ 'has-live-strip': centerMode === 'plan' && meeting.isRunning }">
    <MeetingHeader
      :elapsed="meeting.elapsed"
      :status-label="stageMeta.status"
      :clock-label="stageMeta.clock"
      :status-tone="stageMeta.tone"
      :meeting-title="handoff?.title"
      :meeting-time="handoff?.startTime"
      :location="handoff?.location"
      :participant-count="handoff?.participants.length"
    />

    <MeetingLiveStrip
      v-if="centerMode === 'plan' && meeting.isRunning"
      :speaker="meeting.activeSpeaker"
      :live-draft="meeting.liveDraft"
      :last-speech="lastSpeech"
      :assistant-task="meeting.currentTask.title"
      stage-label="方案同步修订"
      pending-label="已识别建议"
      :pending-count="meeting.registeredSuggestions.length"
      :is-running="meeting.isRunning"
    />

    <main class="workspace">
      <MeetingSidebar
        :participants="meeting.participants"
        :active-speaker-id="meeting.activeSpeaker.id"
        :plan-version="meeting.planVersion"
        :is-running="meeting.isRunning"
        :phase="meeting.phase"
        :plan-active="centerMode === 'plan'"
        :meeting-ended="confirmation.dispatched"
        @open-plan="openPlanWorkspace"
      />

      <TranscriptPanel
        v-if="centerMode === 'transcript'"
        :participants="meeting.participants"
        :transcripts="meeting.transcripts"
        :active-speaker="meeting.activeSpeaker"
        :live-draft="meeting.liveDraft"
        :is-running="meeting.isRunning"
        :me-signed="!!meeting.me?.signedIn"
        :meeting-done="meeting.meetingDone"
        @toggle-running="meeting.isRunning = !meeting.isRunning"
        @sign-in="meeting.signIn"
      />

      <MeetingPlanWorkspace
        v-else
        :version="meeting.planVersion"
        :participants="meeting.participants"
        :confirmations="confirmation.records"
        :groups="distribution.groups"
        :tasks="distribution.tasks"
        :materials="distribution.materials"
        :changes="revision.changes"
        :confirmed-count="confirmation.confirmedCount"
        :pending-count="confirmation.pendingCount"
        :progress="confirmation.progress"
        :dispatching="confirmation.dispatching"
        :dispatched="confirmation.dispatched"
        @close="closePlanWorkspace"
        @confirm-current="confirmCurrentParticipant"
        @confirm-participant="confirmParticipant"
        @dispatch="dispatchTasks"
      />

      <AssistantPanel
        :participants="meeting.participants"
        :current-task="meeting.currentTask"
        :activities="meeting.activities"
        :registered-suggestions="meeting.registeredSuggestions"
        :assistant-reply="meeting.assistantReply"
        :pulse="meeting.pulse"
        @command="meeting.sendCommand"
      />
    </main>

    <DistributionCompletionDialog
      v-model:visible="distributionCompleteVisible"
      :group="recognizedGroup"
      :task-count="distribution.tasks.length"
      :material-count="distribution.materials.length"
      :group-count="distribution.groups.length"
      @workbench="openPostMeetingDestination('workbench')"
      @operations="openPostMeetingDestination('operations')"
      @dashboard="openPostMeetingDestination('dashboard')"
    />
  </div>
</template>

<style scoped>
.app-shell.no-fixed-footer { padding-bottom: 0; }
</style>
