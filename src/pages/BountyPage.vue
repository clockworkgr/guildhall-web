<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue'
import Hallmark from '../components/Hallmark.vue'
import Addr from '../components/Addr.vue'
import Amount from '../components/Amount.vue'
import Markdown from '../components/Markdown.vue'
import Notice from '../components/Notice.vue'
import QueryState from '../components/QueryState.vue'
import Icon from '../components/Icon.vue'
import { workUrl } from '../lib/links'
import StatusWord from '../components/StatusWord.vue'
import { board, rep } from '../lib/api'
import { BOUNTIES, gnowebUrl } from '../lib/config'
import { date, isAddress, percent, relative } from '../lib/format'
import { useQuery } from '../composables/useQuery'
import { useTx } from '../composables/useTx'
import { useWallet } from '../composables/wallet'
import type { Bounty, Milestone } from '../lib/types'

const props = defineProps<{ id: string }>()
const { wallet, connect, hasAdena } = useWallet()
const q = useQuery(() => board.get(props.id))
const b = computed(() => q.data.value)
const me = computed(() => wallet.address)

// Milestones that turned paid since the page loaded get their hallmark struck.
const struck = ref(new Set<number>())
let lastStatuses: string[] = []
watch(b, (nb) => {
  if (!nb) return
  const now = nb.milestones.map((m) => m.status)
  if (lastStatuses.length) {
    now.forEach((s, i) => {
      if ((s === 'paid' || s === 'split') && lastStatuses[i] !== s) struck.value.add(i)
    })
  }
  lastStatuses = now
})

const role = computed(() => {
  const x = b.value
  const a = me.value
  if (!x || !a) return { poster: false, assignee: false, reviewer: false, arbiter: false, applied: false }
  const arb = x.councilArbitrated ? x.council : x.arbiter
  return {
    poster: x.poster === a,
    assignee: x.assignee === a,
    reviewer: x.reviewers.includes(a),
    arbiter: arb === a,
    applied: x.applicationList.some((p) => p.applicant === a),
  }
})

const canApply = computed(() => {
  const r = role.value
  return !!me.value && b.value?.status === 'open' && !r.poster && !r.reviewer && !r.arbiter && !r.applied
})

const reclaimAt = computed(() => {
  const x = b.value
  if (!x?.assignedAt) return null
  return new Date(new Date(x.assignedAt).getTime() + x.workWindowDays * 86_400_000)
})
const awaiting = computed(() => !!b.value?.milestones.some((m) => m.status === 'submitted' || m.status === 'disputed'))

// Reputation of applicants, for the poster choosing one.
const applicantScores = reactive<Record<string, number>>({})
watch(
  () => b.value?.applicationList,
  async (apps) => {
    if (!apps) return
    await Promise.all(
      apps.map(async (a) => {
        try {
          applicantScores[a.applicant] = (await rep.profile(a.applicant)).score
        } catch {
          /* leave unknown */
        }
      }),
    )
  },
)

// Form state.
const pitch = ref('')
const assignee = ref('')
const links = reactive<Record<number, string>>({})
const feedback = reactive<Record<number, string>>({})
const reasons = reactive<Record<number, string>>({})
const shares = reactive<Record<number, number>>({})
const rulings = reactive<Record<number, string>>({})
const openForm = ref('')

const tx = useTx()
function call(func: string, args: (string | number)[], success: string) {
  if (tx.busy.value) return Promise.resolve(false)
  return tx.run([{ pkgPath: BOUNTIES, func, args: [props.id, ...args] }], { success, then: q.reload }).then((ok) => {
    if (ok) openForm.value = ''
    return ok
  })
}

function approved(m: Milestone) {
  return !!me.value && !!m.approvals?.includes(me.value)
}
function canReview(m: Milestone) {
  return role.value.reviewer && m.status === 'submitted' && !approved(m) && m.worker !== me.value
}
function canDispute(m: Milestone) {
  return (m.status === 'submitted' || m.status === 'changes requested') && (role.value.poster || m.worker === me.value)
}
function canSubmit(m: Milestone, x: Bounty) {
  return role.value.assignee && x.status === 'active' && (m.status === 'pending' || m.status === 'changes requested')
}
async function toggle(key: string) {
  openForm.value = openForm.value === key ? '' : key
  tx.error.value = ''
  await nextTick()
  if (openForm.value) {
    const [kind, index] = key.split('-')
    const prefix = { submit: 'link', changes: 'fb', dispute: 'why', resolve: 'share' }[kind as string]
    if (prefix) document.getElementById(`${prefix}-${index}`)?.focus()
  }
}
</script>

<template>
  <QueryState v-if="q.error.value" :error="q.error.value === 'not found' ? `There is no bounty #${id}.` : q.error.value" @retry="q.reload" />
  <QueryState v-else-if="!b" loading />

  <article v-else>
    <RouterLink to="/bounties" class="breadcrumb"><Icon name="back" :size="14" />All bounties</RouterLink>
    <header class="detail-summary">
      
      <div class="min-w-0 flex-1">
        <p class="eyebrow mb-3">Bounty #{{ b.id }}</p>
        <h1 class="!text-3xl sm:!text-4xl">{{ b.title }}</h1>
        <p class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-ink-soft">
          <StatusWord :status="b.status" />
          <span>Posted by <Addr :address="b.poster" /> {{ relative(b.createdAt) }}</span>
          <RouterLink v-for="t in b.tags" :key="t" :to="`/bounties?status=all&tag=${t}`" class="tag">{{ t }}</RouterLink>
        </p>
      </div>
      <div class="sm:text-right shrink-0">
        <p class="eyebrow mb-2">Total reward</p>
        <p class="font-display text-3xl font-bold"><Amount :value="b.total" :symbol="b.symbol" :decimals="b.decimals" /></p>
        <p class="text-sm text-ink-soft figures">
          <Amount :value="b.escrowed" :symbol="b.symbol" :decimals="b.decimals" /> held,
          <Amount :value="b.paidOut" :symbol="b.symbol" :decimals="b.decimals" /> paid
        </p>
      </div>
    </header>

    <div class="grid gap-7 xl:grid-cols-[minmax(0,1fr)_300px] pt-7">
      <div class="min-w-0 space-y-10">
        <section v-if="b.description || b.link" class="panel panel-pad">
          <h2 class="mb-4 !text-xl">About the work</h2>
          <Markdown v-if="b.description" :source="b.description" />
          <p v-if="b.link" class="mt-4">
            Reference: <a v-if="workUrl(b.link)" :href="workUrl(b.link)" target="_blank" rel="noopener noreferrer" class="break-all">{{ b.link }}</a><span v-else class="break-all">{{ b.link }}</span>
          </p>
        </section>

        <section aria-labelledby="ms-h">
          <h2 id="ms-h" class="text-2xl mb-1">Milestones</h2>
          <p class="text-sm text-ink-soft mb-4">
            Each one is paid on its own once {{ b.quorum }} of {{ b.reviewers.length }} reviewer{{ b.reviewers.length > 1 ? 's' : '' }} approve{{ b.quorum === 1 ? 's' : '' }} it.
          </p>
          <ol aria-label="Milestones">
            <li v-for="(m, i) in b.milestones" :key="i" class="milestone">
              <div class="grid grid-cols-[2rem_1fr] sm:grid-cols-[2rem_1fr_auto] gap-x-3 gap-y-2 items-start">
                <span class="milestone-index figures">{{ i + 1 }}</span>
                <div class="min-w-0">
                  <p class="font-semibold text-lg leading-snug">{{ m.title }}</p>
                  <p class="text-sm text-ink-soft flex flex-wrap gap-x-3">
                    <StatusWord :status="m.status" />
                    <span v-if="m.status === 'submitted'" class="figures">{{ m.approvals?.length ?? 0 }} of {{ b.quorum }} approvals</span>
                    <span v-if="m.worker && m.worker !== b.assignee">by <Addr :address="m.worker" /></span>
                    <span v-if="m.settledAt">{{ date(m.settledAt) }}</span>
                  </p>
                  <p v-if="m.submission" class="mt-1 text-sm break-all">
                    Work: <a v-if="workUrl(m.submission)" :href="workUrl(m.submission)" target="_blank" rel="noopener noreferrer">{{ m.submission }}</a><span v-else>{{ m.submission }}</span>
                  </p>
                </div>
                <div class="flex items-center gap-3 col-start-2 sm:col-start-auto">
                  <span class="font-display font-semibold"><Amount :value="m.amount" :symbol="b.symbol" :decimals="b.decimals" /></span>
                  <Hallmark
                    v-if="m.status === 'paid' || m.status === 'split'"
                    :kind="`paid-${b.id}`"
                    :id="i + 1"
                    :size="38"
                    tone="verdigris"
                    :strike="struck.has(i)"
                    :label="`Milestone ${i + 1} paid`"
                  />
                </div>
              </div>

              <div class="sm:pl-11 mt-3 space-y-3">
                <Notice v-if="m.status === 'changes requested' && m.feedback" tone="info">
                  <span class="font-semibold">Changes requested:</span> {{ m.feedback }}
                </Notice>
                <Notice v-if="m.dispute" :tone="m.dispute.resolved ? 'info' : 'error'">
                  <p><span class="font-semibold">Disputed by <Addr :address="m.dispute.openedBy" />:</span> {{ m.dispute.reason }}</p>
                  <p v-if="m.dispute.resolved" class="mt-2">
                    <span class="font-semibold">Ruling:</span> {{ percent(m.dispute.workerBps) }} to the contributor{{ m.dispute.ruling ? `. ${m.dispute.ruling}` : '' }}
                  </p>
                </Notice>

                <!-- Actions on this milestone, for whoever may take them. -->
                <div v-if="me && b.status === 'active'" class="flex flex-wrap gap-2">
                  <button v-if="canSubmit(m, b)" class="btn" :disabled="tx.busy.value" @click="toggle(`submit-${i}`)">
                    {{ m.status === 'changes requested' ? 'Resubmit work' : 'Submit work' }}
                  </button>
                  <button v-if="canReview(m)" class="btn" :disabled="tx.busy.value" @click="call('Approve', [i + 1], 'Approved.')">Approve</button>
                  <button v-if="canReview(m)" class="btn-quiet" :disabled="tx.busy.value" @click="toggle(`changes-${i}`)">Request changes</button>
                  <span v-if="role.reviewer && m.status === 'submitted' && approved(m)" class="text-sm text-ink-soft self-center">You approved this.</span>
                  <button v-if="canDispute(m)" class="btn-quiet text-wax" :disabled="tx.busy.value" @click="toggle(`dispute-${i}`)">Open a dispute</button>
                  <button v-if="role.arbiter && m.status === 'disputed'" class="btn" :disabled="tx.busy.value" @click="toggle(`resolve-${i}`)">Settle dispute</button>
                </div>

                <form v-if="openForm === `submit-${i}`" class="space-y-3 bg-stone rounded-lg p-4" @submit.prevent="call('Submit', [i + 1, links[i]], 'Submitted for review.')">
                  <label class="label" :for="`link-${i}`">Link to the work</label>
                  <input :id="`link-${i}`" v-model="links[i]" class="field" placeholder="https://github.com/gnolang/gno/pull/…" required maxlength="300" />
                  <span class="hint">A pull request, a realm path or anything reviewers can check.</span>
                  <button class="btn" :disabled="tx.busy.value">Submit for review</button>
                </form>
                <form v-if="openForm === `changes-${i}`" class="space-y-3 bg-stone rounded-lg p-4" @submit.prevent="call('RequestChanges', [i + 1, feedback[i] ?? ''], 'Changes requested.')">
                  <label class="label" :for="`fb-${i}`">What needs to change</label>
                  <textarea :id="`fb-${i}`" v-model="feedback[i]" class="field" rows="3" maxlength="1000" required />
                  <span class="hint">This discards approvals collected so far.</span>
                  <button class="btn" :disabled="tx.busy.value">Request changes</button>
                </form>
                <form v-if="openForm === `dispute-${i}`" class="space-y-3 bg-stone rounded-lg p-4" @submit.prevent="call('OpenDispute', [i + 1, reasons[i]], 'Dispute opened.')">
                  <label class="label" :for="`why-${i}`">Why this needs an arbiter</label>
                  <textarea :id="`why-${i}`" v-model="reasons[i]" class="field" rows="3" maxlength="1000" required />
                  <span class="hint">
                    The arbiter, {{ b.councilArbitrated ? 'the Guildhall council' : 'named by the poster' }}, decides how the milestone's escrow is shared.
                  </span>
                  <button class="btn btn-wax" :disabled="tx.busy.value">Open dispute</button>
                </form>
                <form
                  v-if="openForm === `resolve-${i}`"
                  class="space-y-3 bg-stone rounded-lg p-4"
                  @submit.prevent="call('Resolve', [i + 1, Math.round((shares[i] ?? 100) * 100), rulings[i] ?? ''], 'Dispute settled.')"
                >
                  <label class="label" :for="`share-${i}`">Contributor's share: {{ shares[i] ?? 100 }}%</label>
                  <input :id="`share-${i}`" :value="shares[i] ?? 100" @input="shares[i] = Number(($event.target as HTMLInputElement).value)" type="range" min="0" max="100" step="5" class="w-full accent-[var(--color-woad)]" />
                  <span class="hint">The rest goes back to the poster. Any share above zero is recorded as paid work.</span>
                  <label class="label" :for="`rule-${i}`">Ruling</label>
                  <textarea :id="`rule-${i}`" v-model="rulings[i]" class="field" rows="2" maxlength="1000" />
                  <button class="btn" :disabled="tx.busy.value">Settle and pay out</button>
                </form>
              </div>
            </li>
          </ol>
          <p v-if="tx.error.value" class="mt-3 text-wax" role="alert">{{ tx.error.value }}</p>
          <p v-if="tx.done.value" class="mt-3 text-verdigris" role="status">{{ tx.done.value }}</p>
        </section>

        <section v-if="b.status === 'open' && b.applicationList.length" aria-labelledby="apps-h">
          <h2 id="apps-h" class="text-2xl mb-3">Applications</h2>
          <ul class="border-t border-rule">
            <li v-for="a in b.applicationList" :key="a.applicant" class="border-b border-rule py-4 flex flex-col sm:flex-row gap-3 sm:items-start">
              <div class="min-w-0 flex-1">
                <p class="flex flex-wrap gap-x-3 items-center">
                  <Addr :address="a.applicant" />
                  <span v-if="applicantScores[a.applicant] !== undefined" class="text-sm text-ink-soft figures">reputation {{ applicantScores[a.applicant] }}</span>
                  <span class="text-sm text-ink-faint">{{ relative(a.at) }}</span>
                </p>
                <p v-if="a.pitch" class="mt-1 text-ink-soft whitespace-pre-line">{{ a.pitch }}</p>
              </div>
              <button v-if="role.poster" class="btn-quiet" :disabled="tx.busy.value" @click="call('Assign', [a.applicant], 'Assigned.')">Assign</button>
            </li>
          </ul>
        </section>
      </div>

      <aside class="space-y-8">
        <section class="panel panel-pad space-y-4" aria-labelledby="you-h">
          <h2 id="you-h" class="!text-xl">Your role</h2>

          <template v-if="!me">
            <p class="text-ink-soft">Connect a wallet to apply, deliver or review.</p>
            <button v-if="hasAdena()" class="btn" @click="connect">Connect wallet</button>
            <a v-else class="btn no-underline" href="https://adena.app" target="_blank" rel="noopener noreferrer">Install Adena</a>
          </template>

          <template v-else-if="b.status === 'open'">
            <form v-if="canApply" class="space-y-2" @submit.prevent="call('Apply', [pitch], 'Application sent.')">
              <label class="label" for="pitch">Why you</label>
              <textarea id="pitch" v-model="pitch" class="field" rows="4" maxlength="1000" placeholder="What you have built before, and how you would approach this." />
              <button class="btn w-full" :disabled="tx.busy.value">{{ tx.busy.value ? 'Sending application…' : 'Apply for this bounty' }}</button>
            </form>
            <p v-else-if="role.applied" class="text-ink-soft">You applied. The poster will assign someone.</p>

            <template v-if="role.poster">
              <p class="text-ink-soft">You posted this bounty. Pick an applicant, or assign someone directly.</p>
              <form class="space-y-2" @submit.prevent="call('Assign', [assignee.trim()], 'Assigned.')">
                <label class="label" for="assignee">Contributor's address</label>
                <input id="assignee" v-model="assignee" class="field figures" placeholder="g1…" required :aria-invalid="!!assignee && !isAddress(assignee)" />
                <button class="btn" :disabled="tx.busy.value || !isAddress(assignee)">Assign</button>
              </form>
              <button class="btn-quiet w-full justify-center" :disabled="tx.busy.value" @click="toggle('cancel')">
                Cancel and refund
              </button>
              <div v-if="openForm === 'cancel'" class="bg-wax/5 rounded-lg p-4 space-y-3"><p class="font-semibold">Cancel this bounty?</p><p class="text-sm text-ink-soft">All remaining escrow will be returned to your wallet.</p><div class="flex flex-wrap gap-2"><button class="btn btn-wax" :disabled="tx.busy.value" @click="call('Cancel', [], 'Cancelled. The escrow was refunded to you.')">Confirm cancellation</button><button class="btn-quiet" :disabled="tx.busy.value" @click="openForm = ''">Keep bounty</button></div></div>
            </template>
            <p v-if="role.arbiter && !role.poster && !role.reviewer" class="text-ink-soft">You settle disputes on this bounty, so you can’t apply for it.</p>
            <p v-if="role.reviewer && !role.poster" class="text-ink-soft">You review this bounty, so you can't apply for it.</p>
          </template>

          <template v-else-if="b.status === 'active'">
            <template v-if="role.assignee">
              <p class="text-ink-soft">You're working on this. Submit each milestone when it's ready.</p>
              <button class="btn-quiet w-full justify-center" :disabled="tx.busy.value || awaiting" @click="call('Unassign', [], 'You stepped back.')">Step back</button>
              <span v-if="awaiting" class="hint">Wait until work in review or in dispute is settled.</span>
            </template>
            <template v-else-if="role.poster">
              <p class="text-ink-soft">Assigned to <Addr :address="b.assignee" />.</p>
              <button
                class="btn-quiet w-full justify-center"
                :disabled="tx.busy.value || awaiting || (reclaimAt !== null && reclaimAt > new Date())"
                @click="call('Unassign', [], 'Bounty reopened.')"
              >Reopen for someone else</button>
              <span v-if="reclaimAt && reclaimAt > new Date()" class="hint">Possible from {{ date(reclaimAt.toISOString()) }}, if the contributor hasn't delivered.</span>
            </template>
            <p v-else-if="role.reviewer" class="text-ink-soft">You're a reviewer. Approve or send back each milestone when it's submitted.</p>
            <p v-else-if="role.arbiter" class="text-ink-soft">You're the arbiter. You'll settle any milestone that gets disputed.</p>
            <p v-else class="text-ink-soft">This bounty is being worked on by <Addr :address="b.assignee" />.</p>
          </template>

          <p v-else class="text-ink-soft">This bounty is {{ b.status }}. Nothing more can happen here.</p>
          
        </section>

        <section class="panel panel-pad" aria-labelledby="terms-h">
          <h2 id="terms-h" class="text-lg mb-3">Terms</h2>
          <dl class="text-sm space-y-3">
            <div><dt class="text-ink-soft">Reviewers</dt><dd class="space-y-1 mt-1"><p v-for="r in b.reviewers" :key="r"><Addr :address="r" /></p></dd></div>
            <div>
              <dt class="text-ink-soft">Disputes settled by</dt>
              <dd class="mt-1"><template v-if="b.councilArbitrated">The Guildhall council, <Addr :address="b.council" /></template><Addr v-else :address="b.arbiter" /></dd>
            </div>
            <div><dt class="text-ink-soft">Work window</dt><dd class="mt-1">{{ b.workWindowDays }} days after assignment</dd></div>
            <div v-if="b.assignee"><dt class="text-ink-soft">Assigned</dt><dd class="mt-1"><Addr :address="b.assignee" /> on {{ date(b.assignedAt) }}</dd></div>
          </dl>
          <a :href="gnowebUrl(BOUNTIES, String(b.id))" target="_blank" rel="noopener noreferrer" class="section-link mt-5">View on gno.land <Icon name="external" :size="13" /></a>
        </section>
      </aside>
    </div>
  </article>
</template>
