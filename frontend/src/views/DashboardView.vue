<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import CollabFeed from '../components/dashboard/CollabFeed.vue'
import CommandCabin from '../components/dashboard/CommandCabin.vue'
import DashboardHeader from '../components/dashboard/DashboardHeader.vue'
import EntryExitPanel from '../components/dashboard/EntryExitPanel.vue'
import KeyGroupMonitor from '../components/dashboard/KeyGroupMonitor.vue'
import OpinionScroll from '../components/dashboard/OpinionScroll.vue'
import SituationMap from '../components/dashboard/SituationMap.vue'
import TaskList from '../components/dashboard/TaskList.vue'
import ViewSwitcher from '../components/dashboard/ViewSwitcher.vue'
import { useDashboard } from '../composables/useDashboard'
import { useKeyGroupPulse } from '../composables/useKeyGroupPulse'
import { getMeetingHandoff, updateMeetingHandoff } from '../composables/useMeetingHandoff'
import { getTaskExecutionProgress } from '../mock/dashboard'
import '../styles/dashboard.css'

const { data, viewMode, now } = useDashboard()
// 王处审核通过的成果 → 重点群体 A+2 / B+5 并标记新增
const keyGroupPulse = useKeyGroupPulse(
  computed(() => data.value.keyGroups),
  computed(() => data.value.keyPersons),
)
const route = useRoute()
const dashboardTitle = ref('大型会议保障 · 指挥作战大屏')

onMounted(async () => {
  const handoffId = typeof route.query.handoffId === 'string' ? route.query.handoffId : 'SEC-20260921-001'
  const session = await getMeetingHandoff(handoffId)
  if (!session?.tasks?.length) return
  const groupNames = new Map(session.groups.map((group) => [group.id, group.name]))
  data.value.tasks = session.tasks.map((task) => {
    const progress = getTaskExecutionProgress(task.id, task.progress)
    return {
      id: task.id,
      group: groupNames.get(task.groupId) ?? task.groupId,
      title: task.title,
      status: progress >= 100 ? '已完成' : task.status === 'pending' ? '待处置' : '推进中',
      progress,
    }
  })
  data.value.commandGroups = session.groups.map((group) => ({ id: group.id, name: group.name, online: true, members: group.memberCount }))
  data.value.location = session.location
    ? `深圳国际交流中心 · ${session.location}`
    : data.value.location
  data.value.overallReport = `${session.groups.length}个作战组在线，${session.tasks.length}项会议任务进入执行阶段，现场安保与场馆检查为当前重点。`
  dashboardTitle.value = `${session.title.replace(/动员会$/, '')} · 指挥作战大屏`
  data.value.taskSummary = {
    total: data.value.tasks.length,
    done: data.value.tasks.filter((task) => task.status === '已完成').length,
    doing: data.value.tasks.filter((task) => task.status === '推进中').length,
    pending: data.value.tasks.filter((task) => task.status === '待处置').length,
  }
  await updateMeetingHandoff(handoffId, { status: 'commanding' })
})

const showMap = computed(() => viewMode.value === 'overview' || viewMode.value === 'groups')
const showGroups = computed(() => viewMode.value === 'overview' || viewMode.value === 'groups')
const showEntry = computed(() => viewMode.value === 'overview')
const showOpinion = computed(() => viewMode.value === 'overview' || viewMode.value === 'opinion')
const showTasks = computed(() => viewMode.value === 'overview' || viewMode.value === 'tasks')
const showCollab = computed(() => viewMode.value === 'opinion' || viewMode.value === 'tasks')
const alertCount = computed(() => data.value.patrolPoints.filter((point) => point.status !== '正常').length)
const sensitiveCount = computed(() => data.value.opinions.filter((opinion) => opinion.sensitive).length)
const activeTaskCount = computed(() => data.value.tasks.filter((task) => task.status !== '已完成').length)
</script>

<template>
  <div class="dashboard">
    <DashboardHeader
      :title="dashboardTitle"
      :now="now"
      :tick="data.tick"
      :weather="data.weather"
      :temperature="data.temperature"
      :location="data.location"
    />

    <main class="main-stage" :class="viewMode">
      <SituationMap
        v-if="showMap"
        class="area-map"
        :patrol-points="data.patrolPoints"
      />

      <CommandCabin
        v-if="viewMode === 'overview'"
        class="area-command"
        :command-groups="data.commandGroups"
        :overall-report="data.overallReport"
      />

      <KeyGroupMonitor
        v-if="showGroups"
        class="area-groups"
        :key-groups="keyGroupPulse.groups.value"
        :key-persons="keyGroupPulse.persons.value"
        :expanded="viewMode === 'groups'"
      />

      <EntryExitPanel
        v-if="showEntry"
        class="area-entry"
        :data="data.borderFlow"
      />

      <OpinionScroll
        v-if="showOpinion"
        class="area-opinion"
        :opinions="data.opinions"
      />

      <TaskList
        v-if="showTasks"
        class="area-tasks"
        :tasks="data.tasks"
        :summary="data.taskSummary"
      />

      <CollabFeed
        v-if="showCollab"
        class="area-collab"
        :collabs="data.collabs"
      />
    </main>

    <ViewSwitcher
      v-model="viewMode"
      :alert-count="alertCount"
      :key-person-count="data.keyPersons.length"
      :sensitive-count="sensitiveCount"
      :active-task-count="activeTaskCount"
    />
  </div>
</template>
