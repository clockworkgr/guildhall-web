<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BountyLedger from '../components/BountyLedger.vue'
import PageHeading from '../components/PageHeading.vue'
import QueryState from '../components/QueryState.vue'
import Icon from '../components/Icon.vue'
import Pager from '../components/Pager.vue'
import { board } from '../lib/api'
import { useQuery } from '../composables/useQuery'
const route = useRoute(), router = useRouter()
const tabs = [{ key: 'open', label: 'Open' }, { key: 'active', label: 'In progress' }, { key: 'completed', label: 'Completed' }, { key: 'cancelled', label: 'Cancelled' }, { key: 'all', label: 'All bounties' }]
const status = computed(() => tabs.some(t => t.key === route.query.status) ? String(route.query.status) : 'open')
const tag = computed(() => String(route.query.tag ?? ''))
const page = computed(() => { const p = Number(route.query.page); return Number.isSafeInteger(p) && p > 0 ? p : 1 })
const tagInput = ref(tag.value)
watch(tag, v => tagInput.value = v)
const list = useQuery(() => board.list({ status: status.value, tag: tag.value, page: page.value, limit: 20 }), [status, tag, page])
function go(q: Record<string, string | number | undefined>) { router.push({ query: { status: status.value, tag: tag.value || undefined, ...q } }) }
function applyTag() { go({ tag: tagInput.value.trim().toLowerCase().replace(/^#/, '') || undefined, page: undefined }) }
</script>
<template>
  <PageHeading title="Good work starts here." eyebrow="Bounty board" description="Discover funded opportunities in the gno.land ecosystem. Pick a task, deliver great work, and grow your reputation."><RouterLink to="/post" class="btn"><Icon name="plus" :size="17" />Post a bounty</RouterLink></PageHeading>
  <div class="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6">
    <nav class="tabs self-start max-w-full" aria-label="Filter by status"><button v-for="t in tabs" :key="t.key" class="tab" :aria-current="status === t.key ? 'page' : undefined" @click="go({ status: t.key, page: undefined })">{{ t.label }}</button></nav>
    <form class="flex items-center gap-2" role="search" @submit.prevent="applyTag"><div class="relative flex-1 xl:w-48"><Icon name="search" :size="16" class="absolute left-3 top-3.5 text-ink-faint" /><label for="tag" class="sr-only">Filter by tag</label><input id="tag" v-model="tagInput" class="field !pl-9" placeholder="Search a tag…" /></div><button class="btn-quiet" type="submit">Filter</button></form>
  </div>
  <div v-if="tag" class="flex items-center gap-3 mb-5 text-sm text-ink-soft"><span>Showing #{{ tag }}</span><button class="inline-flex items-center gap-1 text-woad" @click="tagInput = ''; applyTag()"><Icon name="close" :size="14" />Clear filter</button></div>
  <div :aria-busy="list.loading.value">
    <QueryState v-if="list.error.value" :error="list.error.value" @retry="list.reload" />
    <QueryState v-else-if="list.loading.value && !list.data.value" loading />
    <template v-else-if="list.data.value?.items.length"><p class="eyebrow mb-4">{{ list.data.value.total ?? list.data.value.items.length }} {{ status === 'all' ? '' : tabs.find(t => t.key === status)?.label.toLowerCase() }} bounties</p><BountyLedger :items="list.data.value.items" /><Pager :page="page" :more="list.data.value.more" @go="p => go({ page: p })" /></template>
    <QueryState v-else title="No bounties found" :description="tag ? `No ${status === 'all' ? '' : status} bounties match #${tag}. Try another tag or clear the filter.` : 'There are no opportunities in this view yet. Check another status or post a bounty.'"><RouterLink to="/post" class="btn-quiet"><Icon name="plus" :size="16" />Post a bounty</RouterLink></QueryState>
  </div>
</template>
