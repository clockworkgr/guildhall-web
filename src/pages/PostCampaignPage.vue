<script setup lang="ts">
import { computed, nextTick, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import Markdown from '../components/Markdown.vue'
import Notice from '../components/Notice.vue'
import PageHeading from '../components/PageHeading.vue'
import Icon from '../components/Icon.vue'
import { board, campaigns } from '../lib/api'
import { CAMPAIGNS } from '../lib/config'
import { formatUnits, isAddress, parseUnits, percent } from '../lib/format'
import { useQuery } from '../composables/useQuery'
import { useTx } from '../composables/useTx'
import { useWallet } from '../composables/wallet'
import type { Call } from '../lib/adena'

const MAX_INT64 = 9_223_372_036_854_775_807n

const router = useRouter()
const { wallet, connect, hasAdena } = useWallet()
const stats = useQuery(() => campaigns.stats())
const tokens = useQuery(() => board.tokens())

const form = reactive({
  title: '',
  description: '',
  link: '',
  tags: '',
  funding: 'ugnot',
  reward: '',
  slots: 100,
  reviewers: [] as string[],
  deadline: true,
  deadlineDays: 30,
})
const reviewerInput = ref('')
const preview = ref(false)
const tried = ref(false)

const maxSlots = computed(() => stats.data.value?.maxSlots ?? 1000)
const unit = computed(() => {
  if (form.funding === 'ugnot') return { symbol: 'GNOT', decimals: 6, isGRC20: false }
  const t = tokens.data.value?.find((x) => x.key === form.funding)
  return { symbol: t?.symbol ?? '?', decimals: t?.decimals ?? 0, isGRC20: true }
})
const reward = computed(() => parseUnits(form.reward, unit.value.decimals))
const total = computed(() => (reward.value && Number.isInteger(form.slots) && form.slots > 0 ? reward.value * BigInt(form.slots) : 0n))

const errors = computed(() => {
  const e: Record<string, string> = {}
  const title = form.title.trim()
  if (!title) e.title = 'Give the campaign a title.'
  else if (new TextEncoder().encode(title).length > 120) e.title = 'Keep the title under 120 bytes.'
  if (form.link && !/^https?:\/\//.test(form.link.trim())) e.link = 'Use a full link starting with https://.'
  const tags = form.tags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean)
  if (tags.length > 5) e.tags = 'Use at most five tags.'
  else if (tags.some((t) => !/^[a-z0-9-]{1,24}$/.test(t))) e.tags = 'Tags use a-z, 0-9 and hyphens, up to 24 characters.'
  if (!reward.value || reward.value <= 0n) e.reward = `Enter an amount in ${unit.value.symbol}, up to ${unit.value.decimals} decimals.`
  if (!Number.isInteger(form.slots) || form.slots < 1 || form.slots > maxSlots.value) e.slots = `Choose between 1 and ${maxSlots.value} people.`
  if (total.value > MAX_INT64) e.reward = 'The total exceeds the chain limit.'
  if (form.deadline && (!Number.isInteger(form.deadlineDays) || form.deadlineDays < 1 || form.deadlineDays > 365)) e.deadline = 'Choose between 1 and 365 days.'
  return e
})
const valid = computed(() => Object.keys(errors.value).length === 0)

function addReviewer() {
  const a = reviewerInput.value.trim()
  if (!isAddress(a) || form.reviewers.includes(a) || form.reviewers.length >= 9) return
  form.reviewers.push(a)
  reviewerInput.value = ''
}
const reviewerError = computed(() => {
  const a = reviewerInput.value.trim()
  if (!a) return ''
  if (!isAddress(a)) return 'That is not a g1 address.'
  if (form.reviewers.includes(a)) return 'Already added.'
  if (form.reviewers.length >= 9) return 'You can add up to nine reviewers.'
  return ''
})

const tx = useTx()
async function submit() {
  tried.value = true
  if (!valid.value) {
    await nextTick()
    document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
    return
  }
  const args = [
    form.title.trim(),
    form.description,
    form.link.trim(),
    form.tags,
    form.reviewers.join(','),
    reward.value!.toString(),
    form.slots,
    form.deadline ? form.deadlineDays : 0,
  ]
  const calls: Call[] = []
  if (unit.value.isGRC20) {
    const realm = stats.data.value?.realmAddress
    if (!realm) {
      tx.error.value = 'Could not read the campaign realm’s address. Reload and try again.'
      return
    }
    // The token realm's own Approve lets the campaign realm pull the total.
    const tokenRealm = form.funding.slice(0, form.funding.lastIndexOf('.'))
    calls.push({ pkgPath: tokenRealm, func: 'Approve', args: [realm, total.value.toString()] })
    calls.push({ pkgPath: CAMPAIGNS, func: 'PostCampaignGRC20', args: [form.funding, ...args] })
  } else {
    calls.push({ pkgPath: CAMPAIGNS, func: 'PostCampaign', args, send: `${total.value}ugnot` })
  }
  const ok = await tx.run(calls, { success: 'Campaign posted.' })
  if (!ok) return
  // The newest campaign involving us is the one just posted.
  try {
    const mine = await campaigns.user(wallet.address)
    const id = mine.items[0]?.campaign.id
    router.push(id ? `/campaign/${id}` : '/campaigns')
  } catch {
    router.push('/campaigns')
  }
}
</script>

<template>
  <div>
    <PageHeading title="Pay everyone who pitches in." eyebrow="Post a campaign" description="Set a reward for one small task and how many people can earn it. The whole amount is held in escrow and paid out claim by claim." />

    <Notice v-if="stats.error.value" tone="error" class="mb-5">{{ stats.error.value }} <button type="button" class="section-link ml-2" @click="stats.reload">Try again</button></Notice>
    <Notice v-if="tokens.error.value" tone="error" class="mb-5">Could not load available tokens: {{ tokens.error.value }} <button type="button" class="section-link ml-2" @click="tokens.reload">Try again</button></Notice>
    <Notice v-if="stats.data.value?.paused" tone="error" class="mb-5">Posting is paused by the Guildhall council right now.</Notice>

    <div class="grid gap-7 xl:grid-cols-[minmax(0,1fr)_290px]">
    <form id="campaign-form" class="space-y-5" novalidate @submit.prevent="submit">
      <fieldset class="form-section space-y-5">
        <legend><span class="step-number">1</span>The task</legend>
        <div>
          <label class="label" for="title">Title</label>
          <input id="title" v-model="form.title" class="field" :aria-invalid="tried && !!errors.title" :aria-describedby="tried && errors.title ? 'title-error' : undefined" maxlength="120" placeholder="Write about Guildhall on X" />
          <span id="title-error" v-if="tried && errors.title" class="hint !text-wax">{{ errors.title }}</span>
        </div>
        <div>
          <div class="flex items-baseline justify-between">
            <label class="label" for="desc">What counts</label>
            <button type="button" class="tag !text-woad" :aria-pressed="preview" @click="preview = !preview">{{ preview ? 'Edit' : 'Preview' }}</button>
          </div>
          <div v-if="preview" class="field min-h-40"><Markdown :source="form.description || '_Nothing written yet._'" /></div>
          <textarea v-else id="desc" v-model="form.description" class="field min-h-40" maxlength="8000" placeholder="What to do, what a valid claim links to, and what will be rejected." />
          <span class="hint">Markdown works here. Reviewers judge claims against this.</span>
        </div>
        <div class="grid gap-5 sm:grid-cols-2">
          <div>
            <label class="label" for="link">Reference link</label>
            <input id="link" v-model="form.link" class="field" :aria-invalid="tried && !!errors.link" :aria-describedby="tried && errors.link ? 'link-error' : undefined" placeholder="https://…" />
            <span id="link-error" v-if="tried && errors.link" class="hint !text-wax">{{ errors.link }}</span>
          </div>
          <div>
            <label class="label" for="tags">Tags</label>
            <input id="tags" v-model="form.tags" class="field" :aria-invalid="tried && !!errors.tags" aria-describedby="tags-hint" placeholder="social, outreach" />
            <span id="tags-hint" class="hint" :class="tried && errors.tags && '!text-wax'">{{ (tried && errors.tags) || 'Comma-separated, up to five.' }}</span>
          </div>
        </div>
      </fieldset>

      <fieldset class="form-section space-y-5">
        <legend><span class="step-number">2</span>Reward & slots</legend>
        <div class="grid gap-5 sm:grid-cols-3">
          <div>
            <label class="label" for="funding">Pay in</label>
            <select id="funding" v-model="form.funding" class="field">
              <option value="ugnot">GNOT</option>
              <option v-for="t in tokens.data.value ?? []" :key="t.key" :value="t.key">{{ t.symbol }} ({{ t.name }})</option>
            </select>
          </div>
          <div>
            <label class="label" for="reward">Reward per person</label>
            <div class="relative">
              <input id="reward" v-model="form.reward" class="field figures text-right !pr-14" inputmode="decimal" placeholder="10" :aria-invalid="tried && !!errors.reward" :aria-describedby="tried && errors.reward ? 'reward-error' : undefined" />
              <span class="absolute right-2.5 top-1/2 -translate-y-1/2 text-sm text-ink-soft pointer-events-none">{{ unit.symbol }}</span>
            </div>
            <span id="reward-error" v-if="tried && errors.reward" class="hint !text-wax">{{ errors.reward }}</span>
          </div>
          <div>
            <label class="label" for="slots">People</label>
            <input id="slots" v-model.number="form.slots" type="number" min="1" :max="maxSlots" class="field figures" :aria-invalid="tried && !!errors.slots" aria-describedby="slots-hint" />
            <span id="slots-hint" class="hint" :class="tried && errors.slots && '!text-wax'">{{ (tried && errors.slots) || `Up to ${maxSlots}.` }}</span>
          </div>
        </div>
        <p class="text-sm font-semibold figures">Escrow {{ formatUnits(total, unit.decimals) }} {{ unit.symbol }}</p>
        <span v-if="unit.isGRC20" class="hint !mt-0">Your wallet approves the campaign realm for the total, then posts, in one transaction.</span>
      </fieldset>

      <fieldset class="form-section space-y-5">
        <legend><span class="step-number">3</span>Review & deadline</legend>
        <div>
          <label class="label" for="rev">Reviewers</label>
          <div class="flex gap-2">
            <input id="rev" v-model="reviewerInput" class="field figures" placeholder="g1…" @keydown.enter.prevent="addReviewer" />
            <button type="button" class="btn-quiet" :disabled="!!reviewerError || !reviewerInput" @click="addReviewer">Add</button>
          </div>
          <span class="hint" :class="reviewerError && '!text-wax'">
            {{ reviewerError || 'Any one reviewer can approve a claim. Leave this empty to review claims yourself.' }}
          </span>
          <ul v-if="form.reviewers.length" class="mt-3 space-y-1.5">
            <li v-for="r in form.reviewers" :key="r" class="flex items-center gap-3">
              <span class="figures text-xs break-all min-w-0">{{ r }}</span>
              <button type="button" class="icon-button !h-7" :aria-label="`Remove reviewer ${r}`" @click="form.reviewers = form.reviewers.filter((x) => x !== r)"><Icon name="close" :size="14" /></button>
            </li>
          </ul>
        </div>
        <div>
          <label class="flex items-center gap-2"><input v-model="form.deadline" type="checkbox" /> Stop taking claims after a deadline</label>
          <div v-if="form.deadline" class="flex items-center gap-2 mt-2">
            <label class="sr-only" for="deadline">Deadline in days</label>
            <input id="deadline" v-model.number="form.deadlineDays" type="number" min="1" max="365" class="field figures !w-24" :aria-invalid="tried && !!errors.deadline" aria-describedby="deadline-hint" />
            <span>days</span>
          </div>
          <span id="deadline-hint" class="hint" :class="tried && errors.deadline && '!text-wax'">
            {{ (tried && errors.deadline) || 'After the deadline anyone can close the campaign, which returns the unclaimed slots to you. You can close it yourself at any time.' }}
          </span>
        </div>
      </fieldset>

      <div class="panel panel-pad flex flex-wrap items-center gap-4">
        <button v-if="!wallet.address && hasAdena()" type="button" class="btn" @click="connect">Connect wallet to post</button>
        <a v-else-if="!wallet.address" class="btn no-underline" href="https://adena.app" target="_blank" rel="noopener">Install Adena to post</a>
        <button v-else type="submit" class="btn" :disabled="tx.busy.value || stats.data.value?.paused">
          {{ tx.busy.value ? 'Waiting for your wallet…' : `Post and fund ${formatUnits(total, unit.decimals)} ${unit.symbol}` }}
        </button>
        <span v-if="tried && !valid" class="text-wax" role="alert">Fix the highlighted fields first.</span>
        <span v-if="tx.error.value" class="text-wax" role="alert">{{ tx.error.value }}</span>
      </div>
    </form>
    <aside class="xl:sticky xl:top-7 self-start panel panel-pad space-y-5 xl:row-start-auto row-start-1">
      <div class="flex items-center gap-2 text-woad"><Icon name="megaphone" :size="19" /><h2 class="!text-lg text-ink">Campaign summary</h2></div>
      <div class="border-b border-rule pb-5"><p class="text-xs text-ink-soft">Held in escrow</p><p class="font-display text-3xl font-semibold figures mt-2" aria-live="polite">{{ formatUnits(total, unit.decimals) }} <span class="text-lg text-ink-soft">{{ unit.symbol }}</span></p></div>
      <dl class="space-y-3 text-sm hidden xl:block"><div class="flex justify-between"><dt class="text-ink-soft">Each person</dt><dd class="figures font-medium">{{ reward ? formatUnits(reward, unit.decimals) : '0' }} {{ unit.symbol }}</dd></div><div class="flex justify-between"><dt class="text-ink-soft">People</dt><dd class="figures font-medium">{{ form.slots || 0 }}</dd></div><div class="flex justify-between"><dt class="text-ink-soft">Reviewers</dt><dd class="font-medium">{{ form.reviewers.length || 'You' }}</dd></div></dl>
      <div class="bg-stone rounded-lg p-4 hidden xl:block text-xs text-ink-soft leading-relaxed"><p class="font-semibold text-ink mb-1">One claim per person.</p>Each address can hold one claim at a time. Paid claims count toward reputation at {{ percent(stats.data.value?.claimShareBps ?? 500) }} of a bounty milestone.</div>
      <RouterLink to="/post" class="section-link hidden xl:flex">Need one person for a bigger job? Post a bounty<Icon name="arrow" :size="14" /></RouterLink>
    </aside>
    </div>
  </div>
</template>
