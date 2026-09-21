<template>
  <section class="panel">
    <header class="panel-header">
      <h3 class="panel-title">{{ title }}</h3>
      <slot name="extra" />
    </header>
    <div class="panel-body">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{ title: string }>()
</script>
