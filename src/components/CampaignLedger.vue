<script setup lang="ts">
import Icon from './Icon.vue'
import Amount from './Amount.vue'
import StatusWord from './StatusWord.vue'
import { relative } from '../lib/format'
import type { CampaignSummary } from '../lib/types'
withDefaults(defineProps<{ items: CampaignSummary[]; showStatus?: boolean; roles?: Record<number, string[]> }>(), { showStatus: true })
</script>
<template>
  <ol class="bounty-list" aria-label="Campaigns">
    <li v-for="c in items" :key="c.id">
      <RouterLink :to="`/campaign/${c.id}`" class="bounty-card" :aria-label="`${c.title}, campaign ${c.id}`">
        <span class="bounty-avatar"><Icon name="megaphone" :size="22" :class="c.status === 'closed' ? 'text-ink-faint' : 'text-ink-soft'" /></span>
        <span class="bounty-content min-w-0 flex-1">
          <span class="bounty-card-title block">{{ c.title }}</span>
          <span class="flex flex-wrap items-center gap-2 mt-2"><StatusWord v-if="showStatus" :status="c.status" /><span v-for="t in c.tags" :key="t" class="tag">{{ t }}</span><span class="text-[11px] text-ink-faint ml-1">{{ relative(c.createdAt) }}</span></span>
          <span v-if="roles?.[c.id]?.length" class="block text-xs text-woad mt-2">Your role: {{ roles[c.id].join(', ') }}</span>
        </span>
        <span class="bounty-reward text-right shrink-0">
          <span class="block font-display text-xl font-semibold tracking-tight figures"><Amount :value="c.reward" :symbol="c.symbol" :decimals="c.decimals" /> <span class="text-sm font-sans font-normal text-ink-soft">each</span></span>
          <span class="block text-[11px] text-ink-faint mt-1.5 figures">{{ c.paid }} of {{ c.slots }} paid<template v-if="c.status === 'open'"> · {{ c.freeSlots }} left</template></span>
          <span class="slot-meter mt-1.5" aria-hidden="true"><span class="slot-meter-paid" :style="{ width: `${(c.paid / c.slots) * 100}%` }" /><span class="slot-meter-pending" :style="{ width: `${(c.pending / c.slots) * 100}%` }" /></span>
        </span>
      </RouterLink>
    </li>
  </ol>
</template>
