<script setup lang="ts">
defineProps<{ title: string; description?: string; eyebrow?: string }>()
</script>
<template>
  <header class="page-heading">
    <div class="min-w-0">
      <p v-if="eyebrow" class="eyebrow mb-3">{{ eyebrow }}</p>
      <h1>{{ title }}</h1>
      <p v-if="description" class="page-description">{{ description }}</p>
    </div>
    <div v-if="$slots.default" class="page-heading-action"><slot /></div>
  </header>
</template>
