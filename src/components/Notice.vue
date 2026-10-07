<script setup lang="ts">
import Icon from './Icon.vue'
defineProps<{ tone?: 'error' | 'empty' | 'info' }>()
</script>
<template>
  <div :class="['flex gap-3 rounded-lg border p-4 text-sm leading-relaxed', tone === 'error' ? 'border-wax/20 bg-wax/5 text-ink' : tone === 'info' ? 'border-woad/20 bg-woad/5' : 'border-rule bg-paper text-ink-soft']" :role="tone === 'error' ? 'alert' : undefined"><Icon name="info" :size="18" :class="['mt-0.5', tone === 'error' ? 'text-wax' : 'text-ink-soft']" /><div class="min-w-0 flex-1"><slot /></div></div>
</template>
