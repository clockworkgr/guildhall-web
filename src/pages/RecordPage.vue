<script setup lang="ts">
import { computed } from 'vue'
import Hallmark from '../components/Hallmark.vue'
import Addr from '../components/Addr.vue'
import Amount from '../components/Amount.vue'
import Notice from '../components/Notice.vue'
import QueryState from '../components/QueryState.vue'
import Icon from '../components/Icon.vue'
import { workUrl } from '../lib/links'
import { rep } from '../lib/api'
import { BOUNTIES, REPUTATION, gnowebUrl } from '../lib/config'
import { percent } from '../lib/format'
import { useQuery } from '../composables/useQuery'
import { useTokens } from '../composables/tokens'

const props = defineProps<{ id: string }>()
const q = useQuery(() => rep.record(props.id))
const r = computed(() => q.data.value)
const { info } = useTokens()

const bountyId = computed(() => (r.value?.source === BOUNTIES ? r.value.ref.split('/')[0] : ''))
const milestone = computed(() => r.value?.ref.split('/')[1] ?? '')
</script>

<template>
  <QueryState v-if="q.error.value" :error="q.error.value === 'not found' ? `There is no record #${id}.` : q.error.value" @retry="q.reload" />
  <QueryState v-else-if="!r" loading />
  <article v-else class="max-w-4xl mx-auto">
    <RouterLink to="/contributors" class="breadcrumb"><Icon name="back" :size="14" />Community</RouterLink>
    <header class="detail-summary !justify-start">
      <Hallmark kind="record" :id="r.id" :size="64" :tone="r.voided ? 'wax' : 'verdigris'" :label="`Record ${r.id}`" />
      <div class="min-w-0">
        <p class="eyebrow mb-3">Work record # {{ r.id }}</p>
        <h1 :class="['text-3xl font-bold', r.voided && 'line-through text-ink-faint']">{{ r.title || 'Untitled work' }}</h1>
        <p class="mt-3 font-display text-2xl font-semibold" :class="r.voided ? 'text-ink-faint' : 'text-verdigris'">
          +{{ r.voided ? 0 : r.points }} reputation
        </p>
      </div>
    </header>

    <Notice v-if="r.voided" tone="error" class="mt-6">The Guildhall admin voided this record: {{ r.voidReason }}</Notice>

    <dl class="panel panel-pad mt-6 grid sm:grid-cols-[12rem_1fr] gap-x-6 gap-y-4 text-sm">
      <dt class="text-ink-soft">Done by</dt><dd><Addr :address="r.worker" /></dd>
      <dt class="text-ink-soft">Funded by</dt><dd><Addr :address="r.poster" /></dd>
      <dt class="text-ink-soft">Paid</dt>
      <dd>
        <Amount :value="r.amount" v-bind="info(r.denom)" />
        <span v-if="r.shareBps < 10000" class="text-ink-soft"> ({{ percent(r.shareBps) }} of the milestone, set by the arbiter)</span>
      </dd>
      <template v-if="r.link">
        <dt class="text-ink-soft">The work</dt>
        <dd><a v-if="workUrl(r.link)" :href="workUrl(r.link)" target="_blank" rel="noopener noreferrer" class="break-all">{{ r.link }}</a><span v-else class="break-all">{{ r.link }}</span></dd>
      </template>
      <template v-if="bountyId">
        <dt class="text-ink-soft">From</dt>
        <dd><RouterLink :to="`/bounty/${bountyId}`" class="underline">Bounty {{ bountyId }}</RouterLink>, milestone {{ milestone }}</dd>
      </template>
      <template v-else>
        <dt class="text-ink-soft">Written by</dt><dd class="figures break-all">{{ r.source }}</dd>
      </template>
      <dt class="text-ink-soft">Payment released by</dt><dd><Addr :address="r.signedBy" /></dd>
      <dt class="text-ink-soft">On chain</dt>
      <dd class="figures">Block {{ r.height }}, {{ r.at ? new Date(r.at).toLocaleString() : '' }}</dd>
    </dl>

    <section class="panel panel-pad mt-6">
      <h2 class="text-xl mb-1">{{ r.arbitrated ? 'Settled by' : 'Vouched for by' }}</h2>
      <p class="text-sm text-ink-soft mb-4">Points scale with how trusted each reviewer was when they approved.</p>
      <ul class="border-t border-rule">
        <li v-for="(a, i) in r.reviewers" :key="a" class="flex items-center justify-between gap-4 border-b border-rule py-3">
          <Addr :address="a" />
          <span class="figures" :class="(r.reviewerTrustBps[i] ?? 0) > 0 ? 'text-verdigris' : 'text-ink-faint'">{{ percent(r.reviewerTrustBps[i] ?? 0) }} trust</span>
        </li>
      </ul>
    </section>

    <a :href="gnowebUrl(REPUTATION, `record/${r.id}`)" target="_blank" rel="noopener noreferrer" class="section-link mt-6">View on gno.land <Icon name="external" :size="14" /></a>
  </article>
</template>
