<script setup lang="ts">
import GroupChatPanel from '../components/operations/GroupChatPanel.vue'
import OperationCommandPanel from '../components/operations/OperationCommandPanel.vue'
import OperationsGroupSidebar from '../components/operations/OperationsGroupSidebar.vue'
import type { AssistantWatchItem, ChatMessage, DailySummary, OperationGroup, OperationMaterial, OperationTask } from '../types/operations'

defineProps<{
  groups: OperationGroup[]
  activeGroupId: string
  activeGroup?: OperationGroup
  messages: ChatMessage[]
  tasks: OperationTask[]
  selectedTaskId: string
  selectedTask?: OperationTask
  watchItem?: AssistantWatchItem
  materials: OperationMaterial[]
  summary: DailySummary
  composerText: string
}>()

defineEmits<{
  select: [groupId: string]
  'select-task': [taskId: string]
  'update:composer-text': [value: string]
  send: []
  'create-task': []
  feedback: []
  report: []
  action: [message: ChatMessage, action: string]
  remind: []
}>()
</script>

<template>
  <main class="operations-workspace" id="main-content">
    <OperationsGroupSidebar :groups="groups" :active-group-id="activeGroupId" @select="$emit('select', $event)" />
    <GroupChatPanel
      :group="activeGroup"
      :messages="messages"
      :pinned-task="selectedTask"
      :model-value="composerText"
      @update:model-value="$emit('update:composer-text', $event)"
      @send="$emit('send')"
      @create-task="$emit('create-task')"
      @feedback="$emit('feedback')"
      @report="$emit('report')"
      @action="(message, action) => $emit('action', message, action)"
    />
    <OperationCommandPanel
      :group="activeGroup"
      :tasks="tasks"
      :selected-task-id="selectedTaskId"
      :watch-item="watchItem"
      :materials="materials"
      :summary="summary"
      @select-task="$emit('select-task', $event)"
      @remind="$emit('remind')"
      @report="$emit('report')"
    />
  </main>
</template>

<style src="../styles/operations.css"></style>
