<script setup lang="ts">
import { computed, ref } from 'vue'
import Hallmark from '../components/Hallmark.vue'
import BountyLedger from '../components/BountyLedger.vue'
import RecordList from '../components/RecordList.vue'
import Amount from '../components/Amount.vue'
import QueryState from '../components/QueryState.vue'
import Icon from '../components/Icon.vue'
import Pager from '../components/Pager.vue'
import { board, govdao, rep } from '../lib/api'
import { date, isAddress } from '../lib/format'
import { useQuery } from '../composables/useQuery'
import { useTokens } from '../composables/tokens'
import { useWallet } from '../composables/wallet'

const props = defineProps<{ address: string }>()
const valid = isAddress(props.address)
const { wallet } = useWallet()
const { info } = useTokens()
const isMe = computed(() => wallet.address === props.address)

const profile = useQuery(() => (valid ? rep.profile(props.address) : Promise.reject(new Error('That is not a g1 address.'))))
const candidate = useQuery(() => (valid ? govdao.candidate(props.address) : Promise.resolve(null)))

const tab = ref<'work' | 'reviews' | 'bounties'>('work')
const page = ref(1)
const records = useQuery(
  () => (!valid || tab.value === 'bounties' ? Promise.resolve(null) : rep.records({ addr: props.address, kind: tab.value, page: page.value, limit: 20 })),
  [tab, page],
)
const bounties = useQuery(() => (valid && tab.value === 'bounties' ? board.user(props.address, page.value) : Promise.resolve(null)), [tab, page])
const roles = computed(() => Object.fromEntries((bounties.data.value?.items ?? []).map((u) => [u.bounty.id, u.roles])))

const copied = ref(false)
const copyError = ref('')
async function copy() {
  try {
    copyError.value = ''
    copied.value = false
    await navigator.clipboard.writeText(props.address)
    copied.value = true
    setTimeout(() => (copied.value = false), 1500)
  } catch {
    copyError.value = 'Could not copy. Select the address to copy it manually.'
  }
}
function select(t: typeof tab.value) {
  tab.value = t
  page.value = 1
}
</script>

<template>
  <RouterLink to="/contributors" class="breadcrumb"><Icon name="back" :size="14" />Contributors</RouterLink>
  <QueryState v-if="profile.error.value" :error="profile.error.value" @retry="profile.reload" />
  <QueryState v-else-if="!profile.data.value" loading />
  <template v-else>
    <header class="detail-summary !items-center">
      <div class="flex items-center gap-5 min-w-0 w-full"><Hallmark :address="address" :size="76" :tone="profile.data.value.score > 0 ? 'verdigris' : 'ink'" :label="`Mark of ${address}`" /><div class="min-w-0"><p class="eyebrow mb-2">{{ isMe ? 'Your profile' : 'Contributor profile' }}</p><h1 class="!text-3xl">{{ isMe ? 'Your record' : profile.data.value.level }}</h1><p class="mt-2 flex flex-wrap items-center gap-2"><span class="figures break-all text-xs sm:text-sm text-ink-soft">{{ address }}</span><button class="icon-button !h-7 !min-w-7" :aria-label="copied ? 'Address copied' : 'Copy address'" @click="copy"><Icon :name="copied ? 'check' : 'copy'" :size="14" /></button></p><p v-if="copied" class="text-xs text-verdigris mt-1" role="status">Address copied</p><p v-if="copyError" class="text-xs text-wax mt-1" role="alert">{{ copyError }}</p><p v-if="profile.data.value.seed" class="inline-flex items-center gap-1.5 mt-2 text-xs text-verdigris"><Icon name="shield" :size="13" />Seed reviewer · Full trust</p></div></div>
      <div class="sm:text-right shrink-0"><p class="font-display text-5xl font-semibold figures tracking-tight text-woad">{{ profile.data.value.score }}</p><p class="text-sm text-ink-soft mt-1">Reputation{{ profile.data.value.rank ? ` · Rank #${profile.data.value.rank}` : '' }}</p></div>
    </header>
    <dl class="grid grid-cols-2 xl:grid-cols-4 gap-4 mt-5 mb-6"><div class="metric"><dt>Paid contributions</dt><dd class="figures">{{ profile.data.value.completed }}</dd></div><div class="metric"><dt>Reviews given</dt><dd class="figures">{{ profile.data.value.reviews }}</dd></div><div class="metric"><dt>Total earned</dt><dd class="!text-xl"><p v-for="e in profile.data.value.earned" :key="e.denom"><Amount :value="e.amount" v-bind="info(e.denom)" /></p><p v-if="!profile.data.value.earned.length" class="text-ink-faint">Nothing yet</p></dd></div><div class="metric"><dt>Active since</dt><dd class="!text-lg !mt-4">{{ date(profile.data.value.firstAt) || '—' }}</dd></div></dl>
    <div v-if="candidate.data.value" class="panel px-5 py-4 mb-8 flex flex-wrap items-center gap-3 text-xs"><span class="font-semibold flex items-center gap-1.5"><Icon name="shield" :size="15" />GovDAO eligibility</span><span v-for="t in candidate.data.value.tiers" :key="t.tier" class="tag" :class="t.eligible && '!text-verdigris'">{{ t.tier }} · {{ t.eligible ? 'Eligible' : `${t.min} points needed` }}</span><span class="text-ink-faint">Membership is decided by GovDAO votes.</span></div>
    <section>
      <nav class="tabs self-start w-fit max-w-full mb-5" aria-label="Profile sections"><button v-for="t in [{ k: 'work', l: 'Work' }, { k: 'reviews', l: 'Reviews' }, { k: 'bounties', l: 'Bounties' }] as const" :key="t.k" class="tab" :aria-current="tab === t.k ? 'page' : undefined" @click="select(t.k)">{{ t.l }}</button></nav>
      <div v-if="tab === 'bounties'" :aria-busy="bounties.loading.value"><QueryState v-if="bounties.error.value" :error="bounties.error.value" @retry="bounties.reload" /><QueryState v-else-if="bounties.loading.value" loading /><template v-else-if="bounties.data.value?.items.length"><BountyLedger :items="bounties.data.value.items.map(u => u.bounty)" :roles="roles" show-status /><Pager :page="page" :more="bounties.data.value.more" @go="p => page = p" /></template><QueryState v-else title="No bounties yet" description="The next contribution could be the start of something good."><RouterLink to="/bounties" class="btn-quiet">Find a bounty<Icon name="arrow" :size="16" /></RouterLink></QueryState></div>
      <div v-else :aria-busy="records.loading.value"><QueryState v-if="records.error.value" :error="records.error.value" @retry="records.reload" /><QueryState v-else-if="records.loading.value" loading /><template v-else-if="records.data.value?.items.length"><RecordList :items="records.data.value.items" :show-worker="tab === 'reviews'" /><Pager :page="page" :more="records.data.value.more" @go="p => page = p" /></template><QueryState v-else :title="tab === 'work' ? 'No paid work on record yet' : 'No reviews on record yet'" description="Completed milestones and reviews will appear here." /></div>
    </section>
  </template>
</template>
