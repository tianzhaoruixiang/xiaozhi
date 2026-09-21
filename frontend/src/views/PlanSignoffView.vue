<script setup lang="ts">
import SignoffAssistantPanel from '../components/signoff/SignoffAssistantPanel.vue'
import SignoffDocumentPanel from '../components/signoff/SignoffDocumentPanel.vue'
import SignoffSidebar from '../components/signoff/SignoffSidebar.vue'
import type { SignoffActivity, SignoffAssistantTask, SignoffClause, SignoffDepartment, SignoffOpinion } from '../types/signoff'

defineProps<{
  version: string
  sourceChangeCount: number
  clauses: SignoffClause[]
  departments: SignoffDepartment[]
  selectedDepartmentId: string
  selectedDepartment?: SignoffDepartment
  selectedOpinion: SignoffOpinion | null
  activities: SignoffActivity[]
  currentTask: SignoffAssistantTask
  signedCount: number
  progress: number
}>()

defineEmits<{
  select: [departmentId: string]
  resolve: [opinionId: string]
  sign: [departmentId: string]
  remind: [departmentId: string]
  'complete-all': []
}>()
</script>

<template>
  <main class="signoff-workspace" id="main-content">
    <SignoffSidebar
      :departments="departments"
      :selected-department-id="selectedDepartmentId"
      :progress="progress"
      @select="$emit('select', $event)"
    />
    <SignoffDocumentPanel
      :version="version"
      :source-change-count="sourceChangeCount"
      :department="selectedDepartment"
      :opinion="selectedOpinion"
      :clauses="clauses"
      @resolve="$emit('resolve', $event)"
      @sign="$emit('sign', $event)"
    />
    <SignoffAssistantPanel
      :current-task="currentTask"
      :activities="activities"
      :opinion="selectedOpinion"
      :department="selectedDepartment"
      :signed-count="signedCount"
      :total-count="departments.length"
      :progress="progress"
      @remind="$emit('remind', $event)"
      @complete-all="$emit('complete-all')"
    />
  </main>
</template>
