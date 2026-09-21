<script setup lang="ts">
import RevisionAssistantPanel from '../components/revision/RevisionAssistantPanel.vue'
import RevisionSidebar from '../components/revision/RevisionSidebar.vue'
import PlanDiffPanel from '../components/revision/PlanDiffPanel.vue'
import type {
  RevisionActivity,
  RevisionAssistantTask,
  RevisionChapter,
  RevisionChange,
  RevisionSource,
  RevisionViewMode,
} from '../types/revision'

defineProps<{
  chapters: RevisionChapter[]
  allChanges: RevisionChange[]
  changes: RevisionChange[]
  selectedChapter?: RevisionChapter
  selectedChapterId: string
  viewMode: RevisionViewMode
  currentTask: RevisionAssistantTask
  conflictChange: RevisionChange | null
  activities: RevisionActivity[]
  sources: RevisionSource[]
  pendingCount: number
  progress: number
  sourceVersion: string
  targetVersion: string
  assistantReply: string
}>()

defineEmits<{
  'select-chapter': [chapterId: string]
  'update:viewMode': [mode: RevisionViewMode]
  accept: [id: string]
  keep: [id: string]
  resolve: [id: string]
  'accept-low-risk': []
  command: [text: string]
}>()
</script>

<template>
  <main class="revision-workspace" id="main-content">
    <RevisionSidebar
      :chapters="chapters"
      :changes="allChanges"
      :selected-chapter-id="selectedChapterId"
      :progress="progress"
      :source-version="sourceVersion"
      :target-version="targetVersion"
      @select="$emit('select-chapter', $event)"
    />

    <PlanDiffPanel
      :chapter="selectedChapter"
      :chapters="chapters"
      :changes="changes"
      :all-changes="allChanges"
      :view-mode="viewMode"
      :source-version="sourceVersion"
      :target-version="targetVersion"
      @update:view-mode="$emit('update:viewMode', $event)"
      @accept="$emit('accept', $event)"
      @keep="$emit('keep', $event)"
      @resolve="$emit('resolve', $event)"
    />

    <RevisionAssistantPanel
      :current-task="currentTask"
      :conflict-change="conflictChange"
      :activities="activities"
      :sources="sources"
      :pending-count="pendingCount"
      :assistant-reply="assistantReply"
      @resolve="$emit('resolve', $event)"
      @accept-low-risk="$emit('accept-low-risk')"
      @command="$emit('command', $event)"
    />
  </main>
</template>
