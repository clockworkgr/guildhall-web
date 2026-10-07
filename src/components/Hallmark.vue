<script setup lang="ts">
import { computed } from 'vue'
import { markForAddress, markForId } from '../lib/hallmark'
const props = withDefaults(defineProps<{ address?: string; kind?: string; id?: number | string; tone?: 'verdigris' | 'ink' | 'wax' | 'faint'; size?: number; strike?: boolean; label?: string }>(), { tone: 'ink', size: 40, strike: false })
const mark = computed(() => props.address ? markForAddress(props.address) : markForId(props.kind ?? 'bounty', props.id ?? '?'))
const color = computed(() => `var(--color-${props.tone === 'faint' ? 'ink-faint' : props.tone})`)
</script>
<template>
  <svg :width="size" :height="size" viewBox="0 0 100 100" :class="['shrink-0', strike && 'hallmark-strike']" :style="{ color }" role="img" :aria-label="label ?? `Mark ${mark.text}`">
    <rect x="1" y="1" width="98" height="98" rx="24" fill="currentColor" opacity=".09" />
    <text x="50" y="53" text-anchor="middle" dominant-baseline="middle" fill="currentColor" :font-size="mark.text.length > 3 ? 26 : 34" font-family="var(--font-display)" font-weight="600" letter-spacing="-1">{{ mark.text }}</text>
  </svg>
</template>
