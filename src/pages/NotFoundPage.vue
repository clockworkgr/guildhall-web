<script setup lang="ts">
import Icon from '../components/Icon.vue'
</script>
<template>
  <div class="panel text-center py-20 px-6"><p class="eyebrow text-woad mb-4">404 · A little off the path</p><h1>Page not found</h1><p class="mt-4 text-ink-soft">This page has moved, or the address doesn’t exist.</p><RouterLink to="/" class="btn mt-7"><Icon name="back" :size="16" />Back to Guildhall</RouterLink></div>
</template>
