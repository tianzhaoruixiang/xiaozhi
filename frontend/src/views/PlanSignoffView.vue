<script setup lang="ts">
import SignoffAssistantPanel from '../components/signoff/SignoffAssistantPanel.vue'
import SignoffDocumentPanel from '../components/signoff/SignoffDocumentPanel.vue'
import SignoffSidebar from '../components/signoff/SignoffSidebar.vue'
import type { SignoffActivity, SignoffAssistantTask, SignoffClause, SignoffDepartment, SignoffMaterial } from '../types/signoff'

defineProps<{
  version: string
  sourceChangeCount: number
  clauses: SignoffClause[]
  departments: SignoffDepartment[]
  selectedDepartmentId: string
  selectedDepartment?: SignoffDepartment
  activities: SignoffActivity[]
  currentTask: SignoffAssistantTask
  materials: SignoffMaterial[]
  selectedMaterialId: string
  selectedMaterial?: SignoffMaterial
  signedCount: number
  progress: number
}>()

defineEmits<{
  select: [departmentId: string]
  sign: [departmentId: string]
  remind: [departmentId: string]
  'select-material': [materialId: string]
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
      :clauses="clauses"
      @sign="$emit('sign', $event)"
    />
    <SignoffAssistantPanel
      :current-task="currentTask"
      :materials="materials"
      :selected-material-id="selectedMaterialId"
      :selected-material="selectedMaterial"
      :activities="activities"
      :department="selectedDepartment"
      :signed-count="signedCount"
      :total-count="departments.length"
      :progress="progress"
      @remind="$emit('remind', $event)"
      @select-material="$emit('select-material', $event)"
      @complete-all="$emit('complete-all')"
    />
  </main>
</template>
