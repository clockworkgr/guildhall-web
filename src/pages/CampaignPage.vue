<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue'
import Addr from '../components/Addr.vue'
import Amount from '../components/Amount.vue'
import Markdown from '../components/Markdown.vue'
import Notice from '../components/Notice.vue'
import Pager from '../components/Pager.vue'
import QueryState from '../components/QueryState.vue'
import Icon from '../components/Icon.vue'
import StatusWord from '../components/StatusWord.vue'
import { workUrl } from '../lib/links'
import { campaigns } from '../lib/api'
import { CAMPAIGNS, gnowebUrl } from '../lib/config'
import { date, percent, relative } from '../lib/format'
import { useQuery } from '../composables/useQuery'
import { useTx } from '../composables/useTx'
import { useWallet } from '../composables/wallet'

const props = defineProps<{ id: string }>()
const { wallet, connect, hasAdena } = useWallet()
const me = computed(() => wallet.address)

const q = useQuery(() => campaigns.get(props.id))
const c = computed(() => q.data.value)

const tabs = [{ key: 'pending', label: 'In review' }, { key: 'approved', label: 'Paid' }, { key: 'rejected', label: 'Rejected' }, { key: 'all', label: 'All claims' }]
const filter = ref('all')
const page = ref(1)
const claims = useQuery(() => campaigns.claims(props.id, { status: filter.value, page: page.value, limit: 20 }), [filter, page])
const mine = useQuery(() => (me.value ? campaigns.claimOf(props.id, me.value) : Promise.resolve(null)), [me])
function show(key: string) {
  filter.value = key
  page.value = 1
}

const role = computed(() => {
  const x = c.value
  const a = me.value
  return { poster: !!x && x.poster === a, reviewer: !!x && !!a && x.reviewers.includes(a) }
})
// The deadline is compared with this page's clock; the chain has the final say.
const expired = computed(() => !!c.value?.deadline && new Date(c.value.deadline) <= new Date())
const canClaim = computed(() => {
  const x = c.value
  const m = mine.data.value
  return !!x && !!me.value && x.status === 'open' && !expired.value && x.freeSlots > 0 && !role.value.poster && !role.value.reviewer && (!m || m.status === 'rejected')
})
const refundOnClose = computed(() => (c.value ? c.value.freeSlots * c.value.reward : 0))

// When the reviewers' tab has work waiting, open it for them.
watch([c, role], ([x, r]) => {
  if (x && r.reviewer && x.pending > 0 && filter.value === 'all' && page.value === 1) filter.value = 'pending'
}, { immediate: true })

const proof = ref('')
const reasons = reactive<Record<number, string>>({})
const openForm = ref('')

const tx = useTx()
function reload() {
  q.reload()
  claims.reload()
  mine.reload()
}
function call(func: string, args: (string | number)[], success: string) {
  if (tx.busy.value) return Promise.resolve(false)
  return tx.run([{ pkgPath: CAMPAIGNS, func, args: [props.id, ...args] }], { success, then: reload }).then((ok) => {
    if (ok) {
      openForm.value = ''
      proof.value = ''
    }
    return ok
  })
}
async function toggle(key: string) {
  openForm.value = openForm.value === key ? '' : key
  tx.error.value = ''
  await nextTick()
  if (openForm.value.startsWith('reject-')) document.getElementById(`why-${openForm.value.slice(7)}`)?.focus()
}
</script>

<template>
  <QueryState v-if="q.error.value" :error="q.error.value === 'not found' ? `There is no campaign #${id}.` : q.error.value" @retry="q.reload" />
  <QueryState v-else-if="!c" loading />

  <article v-else>
    <RouterLink to="/campaigns" class="breadcrumb"><Icon name="back" :size="14" />All campaigns</RouterLink>
    <header class="detail-summary">
      <div class="min-w-0 flex-1">
        <p class="eyebrow mb-3">Campaign #{{ c.id }}</p>
        <h1 class="!text-3xl sm:!text-4xl">{{ c.title }}</h1>
        <p class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-ink-soft">
          <StatusWord :status="c.status" />
          <span>Posted by <Addr :address="c.poster" /> {{ relative(c.createdAt) }}</span>
          <RouterLink v-for="t in c.tags" :key="t" :to="`/campaigns?status=all&tag=${t}`" class="tag">{{ t }}</RouterLink>
        </p>
      </div>
      <div class="sm:text-right shrink-0">
        <p class="eyebrow mb-2">Reward per claim</p>
        <p class="font-display text-3xl font-bold"><Amount :value="c.reward" :symbol="c.symbol" :decimals="c.decimals" /></p>
        <p class="text-sm text-ink-soft figures">{{ c.paid }} of {{ c.slots }} paid<template v-if="c.status === 'open'">, {{ c.freeSlots }} open</template></p>
        <span class="slot-meter mt-2 !ml-0 sm:!ml-auto" aria-hidden="true"><span class="slot-meter-paid" :style="{ width: `${(c.paid / c.slots) * 100}%` }" /><span class="slot-meter-pending" :style="{ width: `${(c.pending / c.slots) * 100}%` }" /></span>
      </div>
    </header>

    <div class="grid gap-7 xl:grid-cols-[minmax(0,1fr)_300px] pt-7">
      <div class="min-w-0 space-y-10">
        <section v-if="c.description || c.link" class="panel panel-pad">
          <h2 class="mb-4 !text-xl">The task</h2>
          <Markdown v-if="c.description" :source="c.description" />
          <p v-if="c.link" class="mt-4">
            Reference: <a v-if="workUrl(c.link)" :href="workUrl(c.link)" target="_blank" rel="noopener noreferrer" class="break-all">{{ c.link }}</a><span v-else class="break-all">{{ c.link }}</span>
          </p>
        </section>

        <section aria-labelledby="claims-h">
          <h2 id="claims-h" class="text-2xl mb-1">Claims</h2>
          <p class="text-sm text-ink-soft mb-4">
            {{ c.claims }} submitted. Any one reviewer can approve a claim, which pays it straight away.
          </p>
          <nav class="tabs self-start max-w-full mb-4" aria-label="Filter claims"><button v-for="t in tabs" :key="t.key" class="tab" :aria-current="filter === t.key ? 'page' : undefined" @click="show(t.key)">{{ t.label }}<template v-if="t.key === 'pending' && c.pending"> ({{ c.pending }})</template></button></nav>

          <QueryState v-if="claims.error.value" :error="claims.error.value" compact @retry="claims.reload" />
          <QueryState v-else-if="claims.loading.value && !claims.data.value" loading compact />
          <template v-else-if="claims.data.value?.items.length">
            <ol class="panel px-4" aria-label="Claims">
              <li v-for="cl in claims.data.value.items" :key="cl.number" class="py-4 not-first:border-t border-rule">
                <div class="flex flex-wrap sm:flex-nowrap gap-3 items-start">
                  <span class="milestone-index figures shrink-0">{{ cl.number }}</span>
                  <div class="min-w-0 flex-1">
                    <p class="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <Addr :address="cl.claimant" />
                      <StatusWord :status="cl.status" claim />
                      <span class="text-sm text-ink-faint">{{ relative(cl.at) }}</span>
                    </p>
                    <p class="mt-1 text-sm break-all">
                      Proof: <a v-if="workUrl(cl.proof)" :href="workUrl(cl.proof)" target="_blank" rel="noopener noreferrer">{{ cl.proof }}</a><span v-else>{{ cl.proof }}</span>
                    </p>
                    <p v-if="cl.status === 'rejected' && cl.reason" class="mt-1 text-sm text-ink-soft"><span class="font-semibold text-ink">Reason:</span> {{ cl.reason }}</p>
                    <p v-if="cl.reviewedBy" class="mt-1 text-xs text-ink-faint">Reviewed by <Addr :address="cl.reviewedBy" /> on {{ date(cl.reviewedAt) }}</p>
                  </div>
                  <div v-if="role.reviewer && cl.status === 'pending'" class="flex flex-wrap gap-2 shrink-0 basis-full sm:basis-auto pl-11 sm:pl-0">
                    <button class="btn" :disabled="tx.busy.value" :aria-label="`Approve claim ${cl.number}`" @click="call('ApproveClaim', [cl.number], `Claim ${cl.number} approved and paid.`)">Approve and pay</button>
                    <button class="btn-quiet" :disabled="tx.busy.value" :aria-label="`Reject claim ${cl.number}`" @click="toggle(`reject-${cl.number}`)">Reject</button>
                  </div>
                </div>
                <form v-if="openForm === `reject-${cl.number}`" class="space-y-3 bg-stone rounded-lg p-4 mt-3 sm:ml-11" @submit.prevent="call('RejectClaim', [cl.number, reasons[cl.number] ?? ''], `Claim ${cl.number} rejected.`)">
                  <label class="label" :for="`why-${cl.number}`">Why it doesn't qualify</label>
                  <textarea :id="`why-${cl.number}`" v-model="reasons[cl.number]" class="field" rows="2" maxlength="1000" />
                  <span class="hint">The claimant sees this. Their slot is freed and they can claim again while the campaign is open.</span>
                  <button class="btn btn-wax" :disabled="tx.busy.value">Reject claim</button>
                </form>
              </li>
            </ol>
            <Pager :page="page" :more="claims.data.value.more" @go="p => page = p" />
          </template>
          <QueryState v-else compact :title="filter === 'pending' ? 'Nothing waiting for review' : 'No claims here yet'" :description="c.status === 'open' ? 'Claims appear here as people submit their proof.' : 'This campaign is closed to new claims.'" />
          <p v-if="tx.error.value" class="mt-3 text-wax" role="alert">{{ tx.error.value }}</p>
          <p v-if="tx.done.value" class="mt-3 text-verdigris" role="status">{{ tx.done.value }}</p>
        </section>
      </div>

      <aside class="space-y-8">
        <section class="panel panel-pad space-y-4" aria-labelledby="you-h">
          <h2 id="you-h" class="!text-xl">Your part</h2>

          <template v-if="!me">
            <p class="text-ink-soft">Connect a wallet to claim a reward or review claims.</p>
            <button v-if="hasAdena()" class="btn" @click="connect">Connect wallet</button>
            <a v-else class="btn no-underline" href="https://adena.app" target="_blank" rel="noopener noreferrer">Install Adena</a>
          </template>

          <template v-else>
            <Notice v-if="mine.data.value && mine.data.value.status === 'pending'" tone="info">Your claim #{{ mine.data.value.number }} is waiting for a reviewer.</Notice>
            <Notice v-else-if="mine.data.value && mine.data.value.status === 'approved'" tone="info">Your claim #{{ mine.data.value.number }} was approved and paid.</Notice>
            <Notice v-else-if="mine.data.value && mine.data.value.status === 'rejected'" tone="error">
              Your claim #{{ mine.data.value.number }} was rejected{{ mine.data.value.reason ? `: ${mine.data.value.reason}` : '.' }}
            </Notice>

            <form v-if="canClaim" class="space-y-2" @submit.prevent="call('Claim', [proof.trim()], 'Claim sent for review.')">
              <label class="label" for="proof">Link to your work</label>
              <input id="proof" v-model="proof" class="field" placeholder="https://x.com/you/status/…" required maxlength="300" />
              <span class="hint">Reviewers open this link to check the task was done.</span>
              <button class="btn w-full" :disabled="tx.busy.value || !proof.trim()">
                {{ tx.busy.value ? 'Waiting for your wallet…' : 'Claim' }} <Amount v-if="!tx.busy.value" :value="c.reward" :symbol="c.symbol" :decimals="c.decimals" />
              </button>
            </form>

            <template v-if="role.poster">
              <p class="text-ink-soft">You posted this campaign.<template v-if="!role.reviewer"> Your reviewers approve the claims.</template></p>
              <template v-if="c.status === 'open'">
                <button class="btn-quiet w-full justify-center" :disabled="tx.busy.value" @click="toggle('close')">Close and refund</button>
                <div v-if="openForm === 'close'" class="bg-wax/5 rounded-lg p-4 space-y-3">
                  <p class="font-semibold">Close this campaign?</p>
                  <p class="text-sm text-ink-soft">No new claims will be accepted. <Amount :value="refundOnClose" :symbol="c.symbol" :decimals="c.decimals" /> for the open slots comes back to you now. Claims in review can still be approved or rejected.</p>
                  <div class="flex flex-wrap gap-2"><button class="btn btn-wax" :disabled="tx.busy.value" @click="call('Close', [], 'Closed. The open slots were refunded to you.')">Confirm</button><button class="btn-quiet" :disabled="tx.busy.value" @click="openForm = ''">Keep it open</button></div>
                </div>
              </template>
            </template>
            <p v-if="role.reviewer" class="text-ink-soft">You review this campaign. {{ c.pending ? `${c.pending} claim${c.pending === 1 ? ' is' : 's are'} waiting.` : 'Nothing is waiting right now.' }}</p>
            <template v-if="c.status === 'open' && expired && !role.poster">
              <p class="text-ink-soft">The deadline has passed. Anyone can close the campaign, which returns the open slots to the poster.</p>
              <button class="btn-quiet w-full justify-center" :disabled="tx.busy.value" @click="call('Close', [], 'Closed. The open slots went back to the poster.')">Close campaign</button>
            </template>
            <p v-else-if="c.status === 'open' && !canClaim && !role.poster && !role.reviewer && !mine.data.value" class="text-ink-soft">Every slot is taken or waiting for review. Check back if a claim is rejected.</p>
            <p v-if="c.status === 'closed' && !role.poster && !role.reviewer && !mine.data.value" class="text-ink-soft">This campaign is closed to new claims.</p>
          </template>
        </section>

        <section class="panel panel-pad" aria-labelledby="terms-h">
          <h2 id="terms-h" class="text-lg mb-3">Terms</h2>
          <dl class="text-sm space-y-3">
            <div><dt class="text-ink-soft">Reviewers, any one approves</dt><dd class="space-y-1 mt-1"><p v-for="r in c.reviewers" :key="r"><Addr :address="r" /></p></dd></div>
            <div><dt class="text-ink-soft">Slots</dt><dd class="mt-1 figures">{{ c.paid }} paid, {{ c.pending }} in review, {{ c.freeSlots }} open<template v-if="c.refunded">, {{ c.refunded }} refunded</template></dd></div>
            <div><dt class="text-ink-soft">Claims close</dt><dd class="mt-1">{{ c.status === 'closed' ? `Closed ${date(c.closedAt)}` : c.deadline ? date(c.deadline) : 'When the poster closes it or every slot is paid' }}</dd></div>
            <div><dt class="text-ink-soft">Escrow</dt><dd class="mt-1"><Amount :value="c.escrowed" :symbol="c.symbol" :decimals="c.decimals" /> held, <Amount :value="c.paidOut" :symbol="c.symbol" :decimals="c.decimals" /> paid</dd></div>
            <div><dt class="text-ink-soft">Reputation</dt><dd class="mt-1">Each paid claim is a work record worth {{ percent(c.claimShareBps) }} of a bounty milestone.</dd></div>
          </dl>
          <a :href="gnowebUrl(CAMPAIGNS, String(c.id))" target="_blank" rel="noopener noreferrer" class="section-link mt-5">View on gno.land <Icon name="external" :size="13" /></a>
        </section>
      </aside>
    </div>
  </article>
</template>
