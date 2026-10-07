<script setup lang="ts">
import { computed } from 'vue'
import Hallmark from './Hallmark.vue'
import { shortAddr } from '../lib/format'
import { useWallet } from '../composables/wallet'

const props = withDefaults(defineProps<{ address: string; mark?: boolean; full?: boolean }>(), { mark: true, full: false })
const { wallet } = useWallet()
const isYou = computed(() => !!wallet.address && wallet.address === props.address)
</script>

<template>
  <span v-if="!address" class="text-ink-faint">nobody</span>
  <RouterLink
    v-else
    :to="`/u/${address}`"
    class="inline-flex items-center gap-1.5 text-ink no-underline hover:underline align-middle"
    :title="address"
  >
    <Hallmark v-if="mark" :address="address" :size="18" tone="faint" :label="`Mark of ${address}`" />
    <span class="figures">{{ full ? address : shortAddr(address) }}</span>
    <span v-if="isYou" class="text-xs text-woad">(you)</span>
  </RouterLink>
</template>
