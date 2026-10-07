<script setup lang="ts">
import type { Milestone } from '../lib/types'

defineProps<{ milestones: Milestone[] }>()

function tone(s: Milestone['status']): string {
  switch (s) {
    case 'paid':
      return 'bg-verdigris border-verdigris'
    case 'split':
      return 'bg-verdigris/50 border-verdigris'
    case 'refunded':
      return 'bg-ink-faint/40 border-ink-faint'
    case 'disputed':
      return 'bg-wax border-wax'
    case 'submitted':
      return 'bg-woad/40 border-woad'
    case 'changes requested':
      return 'bg-transparent border-woad border-dashed'
    default:
      return 'bg-transparent border-ink-faint'
  }
}
</script>

<template>
  <span class="inline-flex gap-1" :aria-label="milestones.map((m, i) => `Milestone ${i + 1}: ${m.status}`).join(', ')">
    <span v-for="(m, i) in milestones" :key="i" :title="`${m.title}: ${m.status}`" :class="['h-1.5 w-3 rounded-full border', tone(m.status)]" />
  </span>
</template>
