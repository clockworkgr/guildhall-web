<script setup lang="ts">
import Icon from './Icon.vue'
defineProps<{ page: number; more: boolean }>()
const emit = defineEmits<{ go: [page: number] }>()
</script>
<template>
  <nav v-if="page > 1 || more" class="flex items-center justify-between gap-4 pt-6 text-sm" aria-label="Pages"><button class="btn-quiet" :disabled="page <= 1" @click="emit('go', page - 1)"><Icon name="back" :size="15" />Newer</button><span class="text-ink-soft figures">Page {{ page }}</span><button class="btn-quiet" :disabled="!more" @click="emit('go', page + 1)">Older<Icon name="arrow" :size="15" /></button></nav>
</template>
