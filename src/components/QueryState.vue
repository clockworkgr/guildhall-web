<script setup lang="ts">
import Icon from './Icon.vue'
withDefaults(defineProps<{ loading?: boolean; error?: string; title?: string; description?: string; compact?: boolean }>(), { title: 'Nothing here yet' })
defineEmits<{ retry: [] }>()
</script>
<template>
  <div v-if="loading" class="loading-state" role="status" aria-label="Loading content">
    <span class="sr-only">Loading…</span>
    <div v-for="i in compact ? 2 : 3" :key="i" class="skeleton-row"><div class="skeleton skeleton-avatar" /><div class="flex-1 space-y-3"><div class="skeleton h-4 w-2/3" /><div class="skeleton h-3 w-1/3" /></div><div class="skeleton h-5 w-16" /></div>
  </div>
  <div v-else :class="['empty-state', compact && 'empty-state-compact']" :role="error ? 'alert' : undefined">
    <span class="empty-icon"><Icon :name="error ? 'globe' : 'bounty'" :size="24" /></span>
    <h3>{{ error ? 'Unable to load this content' : title }}</h3>
    <p>{{ error || description }}</p>
    <button v-if="error" class="btn-quiet mt-4" @click="$emit('retry')"><Icon name="refresh" :size="16" /> Try again</button>
    <div v-else-if="$slots.default" class="mt-4"><slot /></div>
  </div>
</template>
