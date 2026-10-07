<script setup lang="ts">
defineProps<{ status: string }>()
const tone: Record<string, string> = {
  open: 'text-woad',
  active: 'text-ink',
  completed: 'text-verdigris',
  cancelled: 'text-ink-faint',
  disputed: 'text-wax',
  paid: 'text-verdigris',
  split: 'text-verdigris',
  refunded: 'text-ink-faint',
  submitted: 'text-woad',
  'changes requested': 'text-woad',
  pending: 'text-ink-soft',
}
const words: Record<string, string> = {
  open: 'Open',
  active: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  pending: 'Not started',
  submitted: 'In review',
  'changes requested': 'Changes requested',
  disputed: 'Disputed',
  paid: 'Paid',
  split: 'Split by arbiter',
  refunded: 'Refunded',
}
</script>

<template>
  <span :class="['status-badge', tone[status] ?? 'text-ink-soft']">{{ words[status] ?? status }}</span>
</template>
