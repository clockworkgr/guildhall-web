<script setup lang="ts">
const props = defineProps<{ status: string; claim?: boolean }>()
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
  closed: 'text-ink-faint',
  approved: 'text-verdigris',
  rejected: 'text-wax',
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
  closed: 'Closed',
  approved: 'Paid',
  rejected: 'Rejected',
}
// A pending claim is waiting for a reviewer, not for work to start.
const claimWords: Record<string, string> = { pending: 'In review' }
</script>

<template>
  <span :class="['status-badge', props.claim && status === 'pending' ? 'text-woad' : tone[status] ?? 'text-ink-soft']">{{ (props.claim && claimWords[status]) || words[status] || status }}</span>
</template>
