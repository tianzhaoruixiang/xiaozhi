<script setup lang="ts">
import { provide, reactive } from 'vue'
import { RouterView } from 'vue-router'
import { useGroupOperations } from './composables/useGroupOperations'
import { operationsContextKey } from './composables/useOperationsContext'

const operations = reactive(useGroupOperations())
provide(operationsContextKey, operations)
</script>

<template>
  <RouterView />
</template>
