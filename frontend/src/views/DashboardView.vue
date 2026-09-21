<script setup lang="ts">
import { computed, onMounted } from 'vue'
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
import { getMeetingHandoff, updateMeetingHandoff } from '../composables/useMeetingHandoff'
import '../styles/dashboard.css'

const { data, viewMode, now } = useDashboard()
const route = useRoute()

onMounted(async () => {
  const handoffId = typeof route.query.handoffId === 'string' ? route.query.handoffId : 'SEC-20260921-001'
  const session = await getMeetingHandoff(handoffId)
  if (!session?.tasks?.length) return
  const groupNames = new Map(session.groups.map((group) => [group.id, group.name]))
  data.value.tasks = session.tasks.map((task) => ({
    id: task.id,
    group: groupNames.get(task.groupId) ?? task.groupId,
    title: task.title,
    status: (task.progress ?? 0) >= 100 ? '已完成' : task.status === 'pending' ? '待处置' : '推进中',
    progress: task.progress ?? (task.status === 'sent' ? 12 : 0),
  }))
  data.value.commandGroups = session.groups.map((group) => ({ id: group.id, name: group.name, online: true, members: group.memberCount }))
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
</script>

<template>
  <div class="dashboard">
    <DashboardHeader
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
        :key-groups="data.keyGroups"
        :key-persons="data.keyPersons"
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

    <ViewSwitcher v-model="viewMode" />
  </div>
</template>
