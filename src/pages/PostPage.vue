<script setup lang="ts">
import { computed, nextTick, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import Markdown from '../components/Markdown.vue'
import Notice from '../components/Notice.vue'
import PageHeading from '../components/PageHeading.vue'
import Icon from '../components/Icon.vue'
import { board } from '../lib/api'
import { BOUNTIES } from '../lib/config'
import { formatUnits, isAddress, parseUnits } from '../lib/format'
import { useQuery } from '../composables/useQuery'
import { useTx } from '../composables/useTx'
import { useWallet } from '../composables/wallet'
import type { Call } from '../lib/adena'

const router = useRouter()
const { wallet, connect, hasAdena } = useWallet()
const stats = useQuery(() => board.stats())
const tokens = useQuery(() => board.tokens())

const form = reactive({
  title: '',
  description: '',
  link: '',
  tags: '',
  funding: 'ugnot',
  milestones: [{ title: '', amount: '' }] as { title: string; amount: string }[],
  reviewers: [] as string[],
  quorum: 1,
  arbiter: 'council' as 'council' | 'address',
  arbiterAddress: '',
  workWindowDays: 30,
})
const reviewerInput = ref('')
const preview = ref(false)
const tried = ref(false)

const unit = computed(() => {
  if (form.funding === 'ugnot') return { symbol: 'GNOT', decimals: 6, denom: 'ugnot', isGRC20: false }
  const t = tokens.data.value?.find((x) => x.key === form.funding)
  return { symbol: t?.symbol ?? '?', decimals: t?.decimals ?? 0, denom: form.funding, isGRC20: true }
})

const amounts = computed(() => form.milestones.map((m) => parseUnits(m.amount, unit.value.decimals)))
const total = computed(() => amounts.value.reduce<bigint>((s, a) => s + (a ?? 0n), 0n))

const errors = computed(() => {
  const e: Record<string, string> = {}
  const title = form.title.trim()
  if (!title) e.title = 'Give the bounty a title.'
  else if (new TextEncoder().encode(title).length > 120) e.title = 'Keep the title under 120 bytes.'
  if (form.link && !/^https?:\/\//.test(form.link.trim())) e.link = 'Use a full link starting with https://.'
  const tags = form.tags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean)
  if (tags.length > 5) e.tags = 'Use at most five tags.'
  else if (tags.some((t) => !/^[a-z0-9-]{1,24}$/.test(t))) e.tags = 'Tags use a-z, 0-9 and hyphens, up to 24 characters.'
  form.milestones.forEach((m, i) => {
    if (!m.title.trim()) e[`m${i}`] = 'Name this milestone.'
    else if (new TextEncoder().encode(m.title.trim()).length > 120) e[`m${i}`] = 'Keep the milestone name under 120 bytes.'
    else if (m.title.includes(';')) e[`m${i}`] = 'Milestone names cannot contain a semicolon.'
    else if ((amounts.value[i] ?? 0n) > 9_223_372_036_854_775_807n) e[`m${i}`] = 'This amount exceeds the chain limit.'
    else if (!amounts.value[i] || amounts.value[i]! <= 0n) e[`m${i}`] = `Enter an amount in ${unit.value.symbol}, up to ${unit.value.decimals} decimals.`
  })
  if (total.value > 9_223_372_036_854_775_807n) e.total = 'The total reward exceeds the chain limit.'
  if (form.arbiter === 'address' && !isAddress(form.arbiterAddress)) e.arbiter = 'Enter the arbiter’s g1 address.'
  if (!Number.isInteger(form.workWindowDays) || form.workWindowDays < 1 || form.workWindowDays > 365) e.window = 'Choose between 1 and 365 days.'
  return e
})
const valid = computed(() => Object.keys(errors.value).length === 0)

function addReviewer() {
  const a = reviewerInput.value.trim()
  if (!isAddress(a) || form.reviewers.includes(a) || form.reviewers.length >= 9) return
  form.reviewers.push(a)
  reviewerInput.value = ''
  if (form.quorum < 1) form.quorum = 1
}
function removeReviewer(a: string) {
  form.reviewers = form.reviewers.filter((r) => r !== a)
  form.quorum = Math.min(form.quorum, Math.max(1, form.reviewers.length))
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
  const milestones = form.milestones.map((m, i) => `${m.title.trim()}=${amounts.value[i]}`).join(';')
  const args = [
    form.title.trim(),
    form.description,
    form.link.trim(),
    form.tags,
    form.reviewers.join(','),
    form.reviewers.length ? form.quorum : 0,
    milestones,
    form.arbiter === 'address' ? form.arbiterAddress.trim() : '',
    form.workWindowDays,
  ]
  const calls: Call[] = []
  if (unit.value.isGRC20) {
    const realm = stats.data.value?.realmAddress
    if (!realm) {
      tx.error.value = 'Could not read the bounty realm’s address. Reload and try again.'
      return
    }
    // The token realm's own Approve lets the bounty realm pull the total.
    const tokenRealm = form.funding.slice(0, form.funding.lastIndexOf('.'))
    calls.push({ pkgPath: tokenRealm, func: 'Approve', args: [realm, total.value.toString()] })
    calls.push({ pkgPath: BOUNTIES, func: 'PostBountyGRC20', args: [form.funding, ...args] })
  } else {
    calls.push({ pkgPath: BOUNTIES, func: 'PostBounty', args, send: `${total.value}ugnot` })
  }
  const ok = await tx.run(calls, { success: 'Bounty posted.' })
  if (!ok) return
  // The newest bounty involving us is the one just posted.
  try {
    const mine = await board.user(wallet.address)
    const id = mine.items[0]?.bounty.id
    router.push(id ? `/bounty/${id}` : '/bounties')
  } catch {
    router.push('/bounties')
  }
}
</script>

<template>
  <div>
    <PageHeading title="Turn an idea into a contribution." eyebrow="Post a bounty" description="Define the work, fund the reward, and let great contributors take it from here." />

    <Notice v-if="stats.error.value" tone="error" class="mb-5">{{ stats.error.value }} <button type="button" class="section-link ml-2" @click="stats.reload">Try again</button></Notice>
    <Notice v-if="tokens.error.value" tone="error" class="mb-5">Could not load available tokens: {{ tokens.error.value }} <button type="button" class="section-link ml-2" @click="tokens.reload">Try again</button></Notice>
    <Notice v-if="stats.data.value?.paused" tone="error" class="mb-5">Posting is paused by the Guildhall council right now.</Notice>

    <div class="grid gap-7 xl:grid-cols-[minmax(0,1fr)_290px]">
    <form id="post-form" class="space-y-5" novalidate @submit.prevent="submit">
      <fieldset class="form-section space-y-5">
        <legend><span class="step-number">1</span>The task</legend>
        <div>
          <label class="label" for="title">Title</label>
          <input id="title" v-model="form.title" class="field" :aria-invalid="tried && !!errors.title" :aria-describedby="tried && errors.title ? 'title-error' : undefined" maxlength="120" placeholder="Port r/faucet to interrealm v2" />
          <span id="title-error" v-if="tried && errors.title" class="hint !text-wax">{{ errors.title }}</span>
        </div>
        <div>
          <div class="flex items-baseline justify-between">
            <label class="label" for="desc">Description</label>
            <button type="button" class="tag !text-woad" :aria-pressed="preview" @click="preview = !preview">{{ preview ? 'Edit' : 'Preview' }}</button>
          </div>
          <div v-if="preview" class="field min-h-40"><Markdown :source="form.description || '_Nothing written yet._'" /></div>
          <textarea v-else id="desc" v-model="form.description" class="field min-h-40" maxlength="8000" placeholder="What needs doing, what done looks like, and anything a contributor should read first." />
          <span class="hint">Markdown works here.</span>
        </div>
        <div class="grid gap-5 sm:grid-cols-2">
          <div>
            <label class="label" for="link">Reference link</label>
            <input id="link" v-model="form.link" class="field" :aria-invalid="tried && !!errors.link" :aria-describedby="tried && errors.link ? 'link-error' : undefined" placeholder="https://github.com/gnolang/gno/issues/…" />
            <span id="link-error" v-if="tried && errors.link" class="hint !text-wax">{{ errors.link }}</span>
          </div>
          <div>
            <label class="label" for="tags">Tags</label>
            <input id="tags" v-model="form.tags" class="field" :aria-invalid="tried && !!errors.tags" aria-describedby="tags-hint" placeholder="realm, docs" />
            <span id="tags-hint" class="hint" :class="tried && errors.tags && '!text-wax'">{{ (tried && errors.tags) || 'Comma-separated, up to five.' }}</span>
          </div>
        </div>
      </fieldset>

      <fieldset class="form-section space-y-5">
        <legend><span class="step-number">2</span>Reward & milestones</legend>
        <div class="max-w-xs">
          <label class="label" for="funding">Pay in</label>
          <select id="funding" v-model="form.funding" class="field">
            <option value="ugnot">GNOT</option>
            <option v-for="t in tokens.data.value ?? []" :key="t.key" :value="t.key">{{ t.symbol }} ({{ t.name }})</option>
          </select>
          <span v-if="unit.isGRC20" class="hint">Your wallet approves the bounty realm for the total, then posts, in one transaction.</span>
        </div>

        <div>
          <p class="label">Milestones</p>
          <p class="hint !mt-0 mb-3">Split the work into parts that can be checked and paid one at a time.</p>
          <ol class="space-y-3">
            <li v-for="(m, i) in form.milestones" :key="i" class="grid grid-cols-[1.5rem_1fr_auto] sm:grid-cols-[1.5rem_1fr_9rem_auto] gap-3 items-start bg-stone rounded-lg p-3">
              <span class="pt-2 font-display font-bold text-ink-faint figures">{{ i + 1 }}</span>
              <div>
                <label class="sr-only" :for="`mt-${i}`">Milestone {{ i + 1 }} name</label>
                <input :id="`mt-${i}`" v-model="m.title" class="field" :aria-invalid="tried && !!errors[`m${i}`]" :aria-describedby="tried && errors[`m${i}`] ? `milestone-error-${i}` : undefined" maxlength="120" :placeholder="i === 0 ? 'Design notes' : 'Implementation'" />
                <span :id="`milestone-error-${i}`" v-if="tried && errors[`m${i}`]" class="hint !text-wax">{{ errors[`m${i}`] }}</span>
              </div>
              <div class="relative col-start-2 sm:col-start-auto">
                <label class="sr-only" :for="`ma-${i}`">Milestone {{ i + 1 }} amount</label>
                <input :id="`ma-${i}`" v-model="m.amount" :aria-invalid="tried && !!errors[`m${i}`]" class="field figures text-right !pr-14" inputmode="decimal" placeholder="0" />
                <span class="absolute right-2.5 top-1/2 -translate-y-1/2 text-sm text-ink-soft pointer-events-none">{{ unit.symbol }}</span>
              </div>
              <button
                type="button"
                class="btn-quiet !px-2.5 row-start-1 col-start-3 sm:row-start-auto sm:col-start-auto"
                :aria-label="`Remove milestone ${i + 1}`"
                :disabled="form.milestones.length === 1"
                @click="form.milestones.splice(i, 1)"
              ><Icon name="close" :size="16" /></button>
            </li>
          </ol>
          <div class="mt-4 flex flex-wrap gap-3 items-center justify-between">
            <button type="button" class="section-link" :disabled="form.milestones.length >= 20" @click="form.milestones.push({ title: '', amount: '' })"><Icon name="plus" :size="15" />Add a milestone</button>
            <p class="text-sm font-semibold figures">Total {{ formatUnits(total, unit.decimals) }} {{ unit.symbol }}</p>
          </div>
        </div>
      </fieldset>

      <fieldset class="form-section space-y-5">
        <legend><span class="step-number">3</span>Review & trust</legend>
        <div>
          <label class="label" for="rev">Reviewers</label>
          <div class="flex gap-2">
            <input id="rev" v-model="reviewerInput" class="field figures" placeholder="g1…" @keydown.enter.prevent="addReviewer" />
            <button type="button" class="btn-quiet" :disabled="!!reviewerError || !reviewerInput" @click="addReviewer">Add</button>
          </div>
          <span class="hint" :class="reviewerError && '!text-wax'">
            {{ reviewerError || 'Leave this empty to review the work yourself. Trusted reviewers make the work count for more reputation.' }}
          </span>
          <ul v-if="form.reviewers.length" class="mt-3 space-y-1.5">
            <li v-for="r in form.reviewers" :key="r" class="flex items-center gap-3">
              <span class="figures text-xs break-all min-w-0">{{ r }}</span>
              <button type="button" class="icon-button !h-7" :aria-label="`Remove reviewer ${r}`" @click="removeReviewer(r)"><Icon name="close" :size="14" /></button>
            </li>
          </ul>
        </div>
        <div v-if="form.reviewers.length > 1" class="max-w-xs">
          <label class="label" for="quorum">Approvals needed per milestone</label>
          <select id="quorum" v-model.number="form.quorum" class="field">
            <option v-for="n in form.reviewers.length" :key="n" :value="n">{{ n }} of {{ form.reviewers.length }}</option>
          </select>
        </div>
        <div>
          <p class="label">Disputes</p>
          <label class="flex items-center gap-2"><input v-model="form.arbiter" type="radio" value="council" /> The Guildhall council settles them</label>
          <label class="flex items-center gap-2 mt-1"><input v-model="form.arbiter" type="radio" value="address" /> Someone I choose</label>
          <input v-if="form.arbiter === 'address'" v-model="form.arbiterAddress" :aria-invalid="tried && !!errors.arbiter" class="field figures mt-2" placeholder="g1…" aria-label="Arbiter address" />
          <span v-if="tried && errors.arbiter" class="hint !text-wax">{{ errors.arbiter }}</span>
        </div>
        <div class="max-w-xs">
          <label class="label" for="window">Work window</label>
          <div class="flex items-center gap-2">
            <input id="window" v-model.number="form.workWindowDays" :aria-invalid="tried && !!errors.window" aria-describedby="window-hint" type="number" min="1" max="365" class="field figures !w-24" />
            <span>days</span>
          </div>
          <span id="window-hint" class="hint" :class="tried && errors.window && '!text-wax'">
            {{ (tried && errors.window) || 'After this, you can take the bounty back from a contributor who hasn’t delivered.' }}
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
        <span v-if="tried && errors.total" class="text-wax" role="alert">{{ errors.total }}</span>
        <span v-if="tx.error.value" class="text-wax" role="alert">{{ tx.error.value }}</span>
      </div>
    </form>
    <aside class="xl:sticky xl:top-7 self-start panel panel-pad space-y-5 xl:row-start-auto row-start-1">
      <div class="flex items-center gap-2 text-woad"><Icon name="shield" :size="19" /><h2 class="!text-lg text-ink">Bounty summary</h2></div>
      <div class="border-b border-rule pb-5"><p class="text-xs text-ink-soft">Total reward</p><p class="font-display text-3xl font-semibold figures mt-2" aria-live="polite">{{ formatUnits(total, unit.decimals) }} <span class="text-lg text-ink-soft">{{ unit.symbol }}</span></p></div>
      <dl class="space-y-3 text-sm hidden xl:block"><div class="flex justify-between"><dt class="text-ink-soft">Milestones</dt><dd class="figures font-medium">{{ form.milestones.length }}</dd></div><div class="flex justify-between"><dt class="text-ink-soft">Reviewers</dt><dd class="font-medium">{{ form.reviewers.length || 'You' }}</dd></div><div class="flex justify-between"><dt class="text-ink-soft">Work window</dt><dd class="figures font-medium">{{ form.workWindowDays }} days</dd></div></dl>
      <div class="bg-stone rounded-lg p-4 hidden xl:block text-xs text-ink-soft leading-relaxed"><p class="font-semibold text-ink mb-1">Funded from the start.</p>The reward is held on-chain and released as each milestone is approved. Cancel before assignment for a full refund.</div>
      <RouterLink to="/how" class="section-link hidden xl:flex">Learn how bounties work<Icon name="arrow" :size="14" /></RouterLink>
    </aside>
    </div>
  </div>
</template>
