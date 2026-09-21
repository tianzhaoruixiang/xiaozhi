<script setup lang="ts">
import DistributionAssistantPanel from '../components/distribution/DistributionAssistantPanel.vue'
import DistributionSidebar from '../components/distribution/DistributionSidebar.vue'
import TaskAssignmentPanel from '../components/distribution/TaskAssignmentPanel.vue'
import type {
  DistributionActivity,
  DistributionAssistantTask,
  DistributionGroup,
  DistributionMaterial,
  DistributionTask,
} from '../types/distribution'
import type { SignoffClause } from '../types/signoff'

defineProps<{
  planVersion: string
  signoffRecordId: string
  clauses: SignoffClause[]
  groups: DistributionGroup[]
  allTasks: DistributionTask[]
  tasks: DistributionTask[]
  selectedGroupId: string
  selectedGroup?: DistributionGroup
  currentTask: DistributionAssistantTask
  activities: DistributionActivity[]
  materials: DistributionMaterial[]
  pendingCount: number
  progress: number
  dispatched: boolean
}>()

defineEmits<{
  select: [groupId: string]
  confirm: [taskId: string]
  'confirm-group': [groupId: string]
  'confirm-all': []
}>()
</script>

<template>
  <main class="distribution-workspace" id="main-content">
    <DistributionSidebar
      :groups="groups"
      :tasks="allTasks"
      :selected-group-id="selectedGroupId"
      :progress="progress"
      @select="$emit('select', $event)"
    />
    <TaskAssignmentPanel
      :group="selectedGroup"
      :tasks="tasks"
      :clauses="clauses"
      :plan-version="planVersion"
      :signoff-record-id="signoffRecordId"
      @confirm="$emit('confirm', $event)"
    />
    <DistributionAssistantPanel
      :current-task="currentTask"
      :activities="activities"
      :materials="materials"
      :group="selectedGroup"
      :group-tasks="tasks"
      :pending-count="pendingCount"
      :dispatched="dispatched"
      @confirm-group="$emit('confirm-group', $event)"
      @confirm-all="$emit('confirm-all')"
    />
  </main>
</template>
