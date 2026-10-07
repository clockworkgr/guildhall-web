<script setup lang="ts">
import { formatUnits } from '../lib/format'

defineProps<{ value: number | bigint; symbol: string; decimals: number }>()
</script>

<template>
  <span class="figures whitespace-nowrap">{{ formatUnits(value, decimals) }}&nbsp;<span class="text-ink-soft">{{ symbol }}</span></span>
</template>
