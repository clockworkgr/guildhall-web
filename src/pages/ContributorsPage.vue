<script setup lang="ts">
import Addr from '../components/Addr.vue'
import PageHeading from '../components/PageHeading.vue'
import QueryState from '../components/QueryState.vue'
import Icon from '../components/Icon.vue'
import { rep } from '../lib/api'
import { useQuery } from '../composables/useQuery'
const top = useQuery(() => rep.top(50)), stats = useQuery(() => rep.stats())
</script>
<template>
  <PageHeading title="People who make things happen." eyebrow="The community" description="Reputation earned through real contributions. Every score is backed by paid work and trusted reviews."><RouterLink to="/how" class="btn-quiet"><Icon name="book" :size="16" />How reputation works</RouterLink></PageHeading>
  <dl class="grid sm:grid-cols-3 gap-4 mb-8"><div class="metric"><dt><Icon name="users" :size="16" />Contributors</dt><dd class="figures">{{ stats.data.value?.contributors ?? '—' }}</dd></div><div class="metric"><dt><Icon name="check" :size="16" />Work records</dt><dd class="figures">{{ stats.data.value?.records ?? '—' }}</dd></div><div class="metric"><dt><Icon name="shield" :size="16" />Seed reviewers</dt><dd class="figures">{{ stats.data.value?.seeds ?? '—' }}</dd></div></dl>
  <QueryState v-if="stats.error.value" :error="stats.error.value" compact class="mb-6" @retry="stats.reload" />
  <div class="section-heading"><h2>Contributor leaderboard</h2><span class="text-xs text-ink-soft">Ranked by reputation</span></div>
  <QueryState v-if="top.error.value" :error="top.error.value" @retry="top.reload" /><QueryState v-else-if="top.loading.value && !top.data.value" loading /><QueryState v-else-if="!top.data.value?.length" title="Meet the first contributors, soon" description="Reputation starts when trusted reviewers approve a paid milestone."><RouterLink to="/bounties" class="btn">Explore bounties<Icon name="arrow" :size="16" /></RouterLink></QueryState>
  <div v-else class="panel overflow-x-auto"><table class="data-table"><caption class="sr-only">Contributors ranked by reputation</caption><thead><tr><th scope="col">Rank</th><th scope="col">Contributor</th><th scope="col">Level</th><th scope="col" class="!text-right">Work</th><th scope="col" class="!text-right">Reviews</th><th scope="col" class="!text-right">Reputation</th></tr></thead><tbody><tr v-for="s in top.data.value" :key="s.address"><td class="figures text-ink-faint"><span :class="s.rank <= 3 && 'inline-flex items-center justify-center rounded-md bg-woad/10 text-woad w-7 h-7 font-semibold'">{{ s.rank }}</span></td><td><Addr :address="s.address" /><span v-if="s.seed" class="flex items-center gap-1 text-[11px] text-verdigris mt-1 ml-6"><Icon name="shield" :size="12" />Seed reviewer</span></td><td><span class="tag">{{ s.level }}</span></td><td class="figures text-right">{{ s.completed }}</td><td class="figures text-right">{{ s.reviews }}</td><td class="figures text-right font-semibold !text-lg">{{ s.score }}</td></tr></tbody></table></div>
</template>
