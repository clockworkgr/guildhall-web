<script setup lang="ts">
import BountyLedger from '../components/BountyLedger.vue'
import CampaignLedger from '../components/CampaignLedger.vue'
import RecordList from '../components/RecordList.vue'
import Addr from '../components/Addr.vue'
import Icon from '../components/Icon.vue'
import QueryState from '../components/QueryState.vue'
import { board, campaigns, rep } from '../lib/api'
import { formatUnits } from '../lib/format'
import { useQuery } from '../composables/useQuery'
const stats = useQuery(() => board.stats())
const repStats = useQuery(() => rep.stats())
const open = useQuery(() => board.list({ status: 'open', limit: 5 }))
const openCampaigns = useQuery(() => campaigns.list({ status: 'open', limit: 3 }))
const recent = useQuery(() => rep.records({ limit: 4 }))
const top = useQuery(() => rep.top(4))
</script>
<template>
  <section class="hero flex items-center justify-between gap-8">
    <div class="relative z-10">
      <p class="eyebrow !text-woad mb-4 flex items-center gap-2"><span class="network-dot" /> A home for meaningful work</p>
      <h1>Build something good.<br /><span class="text-woad">Leave your mark.</span></h1>
      <p class="text-ink-soft mt-5 max-w-lg text-base leading-relaxed">Find funded work, collaborate with trusted people, and build a reputation that belongs to you. All on gno.land.</p>
      <div class="flex flex-wrap gap-3 mt-7"><RouterLink to="/bounties" class="btn">Explore bounties<Icon name="arrow" :size="17" /></RouterLink><RouterLink to="/post" class="btn-quiet">Post a bounty</RouterLink></div>
    </div>
    <div class="hero-art mr-5" aria-hidden="true"><div class="orbit" /><div class="orbit" /><div class="orbit" /><div class="hero-seal"><Icon name="shield" :size="42" class="text-woad" /></div><div class="floating-label"><Icon name="check" :size="15" /> Good work. Verified.</div></div>
  </section>
  <dl class="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mt-6 mb-9" aria-label="Guildhall activity">
    <div class="metric"><dt><Icon name="bounty" :size="16" />Open bounties</dt><dd class="figures">{{ stats.data.value?.open ?? '—' }}</dd></div>
    <div class="metric"><dt><Icon name="shield" :size="16" />Held in escrow</dt><dd class="figures !text-xl !mt-3"><template v-if="stats.data.value"><span v-for="(e, i) in stats.data.value.escrow" :key="e.denom" class="block" :class="i > 0 && 'text-sm mt-1'">{{ formatUnits(e.amount, e.decimals) }} <span class="text-xs text-ink-soft font-sans tracking-normal">{{ e.symbol }}</span></span><span v-if="!stats.data.value.escrow.length">0</span></template><span v-else>—</span></dd></div>
    <div class="metric"><dt><Icon name="check" :size="16" />Work completed</dt><dd class="figures">{{ stats.data.value?.completed ?? '—' }}</dd></div>
    <div class="metric"><dt><Icon name="users" :size="16" />Contributors</dt><dd class="figures">{{ repStats.data.value?.contributors ?? '—' }}</dd></div>
  </dl>
  <div class="grid gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
    <section aria-labelledby="open-h">
      <div class="section-heading"><div><h2 id="open-h">Find your next contribution</h2><p class="text-sm text-ink-soft mt-1.5">Open opportunities. Rewards already funded.</p></div><RouterLink to="/bounties" class="section-link shrink-0">View all<Icon name="arrow" :size="15" /></RouterLink></div>
      <QueryState v-if="open.loading.value && !open.data.value" loading />
      <QueryState v-else-if="open.error.value" :error="open.error.value" @retry="open.reload" />
      <BountyLedger v-else-if="open.data.value?.items.length" :items="open.data.value.items" />
      <QueryState v-else title="The next opportunity starts with you" description="Fund a task and invite the community to build it."><RouterLink to="/post" class="btn">Post the first bounty<Icon name="plus" :size="16" /></RouterLink></QueryState>
      <div class="mt-6 flex items-center gap-3 text-xs text-ink-soft"><Icon name="shield" :size="16" class="text-verdigris" /><span>Rewards stay in escrow until the work is approved.</span></div>
      <section v-if="openCampaigns.data.value?.items.length" class="mt-10" aria-labelledby="campaigns-h">
        <div class="section-heading"><div><h2 id="campaigns-h">Quick tasks, many hands</h2><p class="text-sm text-ink-soft mt-1.5">Paid per person, for anyone who does the task.</p></div><RouterLink to="/campaigns" class="section-link shrink-0">View all<Icon name="arrow" :size="15" /></RouterLink></div>
        <CampaignLedger :items="openCampaigns.data.value.items" />
      </section>
      <QueryState v-if="stats.error.value" class="mt-6" :error="stats.error.value" compact @retry="stats.reload" />
      <QueryState v-if="repStats.error.value" class="mt-6" :error="repStats.error.value" compact @retry="repStats.reload" />
    </section>
    <aside class="space-y-7">
      <section aria-labelledby="stamped-h"><div class="section-heading"><h2 id="stamped-h" class="!text-lg">Recent work</h2><span class="eyebrow !text-[9px]">On the record</span></div><QueryState v-if="recent.loading.value && !recent.data.value" loading compact /><QueryState v-else-if="recent.error.value" :error="recent.error.value" compact @retry="recent.reload" /><RecordList v-else-if="recent.data.value?.items.length" :items="recent.data.value.items" compact /><QueryState v-else title="Good work will appear here" description="Approved milestones become a public record." compact /></section>
      <section aria-labelledby="top-h"><div class="section-heading"><h2 id="top-h" class="!text-lg">Community leaders</h2><RouterLink to="/contributors" class="section-link">All<Icon name="arrow" :size="14" /></RouterLink></div><QueryState v-if="top.loading.value && !top.data.value" loading compact /><QueryState v-else-if="top.error.value" :error="top.error.value" compact @retry="top.reload" /><ol v-else-if="top.data.value?.length" class="panel px-4"><li v-for="s in top.data.value" :key="s.address" class="flex items-center gap-3 py-3.5 not-first:border-t border-rule"><span class="figures text-xs text-ink-faint w-3">{{ s.rank }}</span><div class="flex-1 min-w-0"><Addr :address="s.address" /><span class="block ml-6 text-[11px] text-ink-faint mt-1">{{ s.level }}</span></div><span class="figures font-semibold text-sm">{{ s.score }}</span></li></ol><QueryState v-else title="A community in the making" description="Reputation grows with reviewed, paid work." compact /></section>
    </aside>
  </div>
</template>
