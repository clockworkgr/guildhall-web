<script setup lang="ts">
import Hallmark from './Hallmark.vue'
import Amount from './Amount.vue'
import { relative, shortAddr } from '../lib/format'
import { useTokens } from '../composables/tokens'
import type { WorkRecord } from '../lib/types'
withDefaults(defineProps<{ items: WorkRecord[]; showWorker?: boolean; compact?: boolean }>(), { showWorker: true, compact: false })
const { info } = useTokens()
</script>
<template>
  <ol class="panel" aria-label="Work records">
    <li v-for="r in items" :key="r.id" class="record-row !p-0">
      <RouterLink :to="`/record/${r.id}`" class="record-row w-full" :aria-label="`${r.title || 'Untitled work'}, record ${r.id}`">
        <Hallmark kind="record" :id="r.id" :size="compact ? 34 : 40" :tone="r.voided ? 'faint' : 'verdigris'" :label="`Record ${r.id}`" />
        <span class="min-w-0 flex-1"><span :class="['block text-sm font-medium', r.voided && 'line-through text-ink-faint']">{{ r.title || 'Untitled work' }}</span><span class="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-soft mt-1"><span v-if="showWorker" class="figures">{{ shortAddr(r.worker) }}</span><span v-if="showWorker" aria-hidden="true">·</span><Amount :value="r.amount" v-bind="info(r.denom)" /><span class="text-ink-faint">{{ relative(r.at) }}</span></span></span>
        <span class="figures text-right text-sm font-semibold text-verdigris shrink-0">+{{ r.voided ? 0 : r.points }}<span class="block text-[10px] text-ink-faint font-normal">reputation</span></span>
      </RouterLink>
    </li>
  </ol>
</template>
