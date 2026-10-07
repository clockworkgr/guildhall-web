<script setup lang="ts">
import Icon from './Icon.vue'
import Amount from './Amount.vue'
import Pips from './Pips.vue'
import StatusWord from './StatusWord.vue'
import { relative } from '../lib/format'
import type { BountySummary } from '../lib/types'
withDefaults(defineProps<{ items: BountySummary[]; showStatus?: boolean; roles?: Record<number, string[]> }>(), { showStatus: true })
</script>
<template>
  <ol class="bounty-list" aria-label="Bounties">
    <li v-for="b in items" :key="b.id">
      <RouterLink :to="`/bounty/${b.id}`" class="bounty-card" :aria-label="`${b.title}, bounty ${b.id}`">
        <span class="bounty-avatar"><Icon :name="b.status === 'completed' ? 'check' : 'bounty'" :size="22" :class="b.status === 'completed' ? 'text-verdigris' : 'text-ink-soft'" /></span>
        <span class="bounty-content min-w-0 flex-1">
          <span class="bounty-card-title block">{{ b.title }}</span>
          <span class="flex flex-wrap items-center gap-2 mt-2"><StatusWord v-if="showStatus" :status="b.status" /><span v-for="t in b.tags" :key="t" class="tag">{{ t }}</span><span class="text-[11px] text-ink-faint ml-1">{{ relative(b.createdAt) }}</span></span>
          <span v-if="roles?.[b.id]?.length" class="block text-xs text-woad mt-2">Your role: {{ roles[b.id].join(', ') }}</span>
        </span>
        <span class="bounty-reward text-right shrink-0">
          <span class="block font-display text-xl font-semibold tracking-tight figures"><Amount :value="b.total" :symbol="b.symbol" :decimals="b.decimals" /></span>
          <span class="flex items-center justify-end gap-2 mt-1.5"><Pips :milestones="b.milestones" /><span class="text-[11px] text-ink-faint">{{ b.milestones.length }} milestone{{ b.milestones.length === 1 ? '' : 's' }}</span></span>
        </span>
      </RouterLink>
    </li>
  </ol>
</template>
