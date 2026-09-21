<script setup lang="ts">
defineProps<{
  steps: string[]
  currentStep: number
}>()
</script>

<template>
  <nav class="process-ribbon" aria-label="任务流程">
    <ol>
      <li
        v-for="(step, index) in steps"
        :key="step"
        :class="{
          completed: index + 1 < currentStep,
          active: index + 1 === currentStep,
        }"
      >
        <span class="ribbon-sequence">
          <b>{{ index + 1 < currentStep ? '✓' : String(index + 1).padStart(2, '0') }}</b>
        </span>
        <span class="ribbon-title">{{ step }}</span>
        <span v-if="index + 1 === currentStep" class="ribbon-signal" aria-hidden="true">
          <i /><i /><i />
        </span>
      </li>
    </ol>
  </nav>
</template>
