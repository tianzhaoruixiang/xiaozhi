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
  activities: RevisionActivity[]
  sources: RevisionSource[]
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
    />

    <RevisionAssistantPanel
      :current-task="currentTask"
      :activities="activities"
      :sources="sources"
      :assistant-reply="assistantReply"
      @command="$emit('command', $event)"
    />
  </main>
</template>
