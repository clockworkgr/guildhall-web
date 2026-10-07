<script setup lang="ts">
import { computed, ref } from 'vue'
import Addr from '../components/Addr.vue'
import Notice from '../components/Notice.vue'
import PageHeading from '../components/PageHeading.vue'
import QueryState from '../components/QueryState.vue'
import { board, rep } from '../lib/api'
import { BOUNTIES, REPUTATION } from '../lib/config'
import { isAddress } from '../lib/format'
import { useQuery } from '../composables/useQuery'
import { useTx } from '../composables/useTx'
import { useWallet } from '../composables/wallet'

const { wallet } = useWallet()
const repStats = useQuery(() => rep.stats())
const boardStats = useQuery(() => board.stats())
const seeds = useQuery(() => rep.seeds())

const isAdmin = computed(() => !!wallet.address && repStats.data.value?.admin === wallet.address)
const isCouncil = computed(() => !!wallet.address && boardStats.data.value?.council === wallet.address)

const seed = ref('')
const voidId = ref('')
const voidReason = ref('')
const council = ref('')
const tx = useTx()

function reload() {
  return Promise.all([repStats.reload(), boardStats.reload(), seeds.reload()])
}
function repCall(func: string, args: (string | number)[], success: string) {
  return tx.run([{ pkgPath: REPUTATION, func, args }], { success, then: reload })
}
function boardCall(func: string, args: (string | number | boolean)[], success: string) {
  return tx.run([{ pkgPath: BOUNTIES, func, args }], { success, then: reload })
}
</script>

<template>
  <div class="max-w-4xl mx-auto">
    <PageHeading title="Guild settings" eyebrow="Governance" description="The people and permissions that keep Guildhall running. All changes are signed with your wallet." />
    <QueryState v-if="repStats.error.value || boardStats.error.value || seeds.error.value" :error="repStats.error.value || boardStats.error.value || seeds.error.value" @retry="reload" class="mb-6" />

    <dl class="panel panel-pad grid sm:grid-cols-[10rem_1fr] gap-x-6 gap-y-3 text-sm">
      <dt class="text-ink-soft">Admin</dt><dd><Addr v-if="repStats.data.value" :address="repStats.data.value.admin" /><span v-else class="text-ink-faint">…</span></dd>
      <dt class="text-ink-soft">Council</dt><dd><Addr v-if="boardStats.data.value" :address="boardStats.data.value.council" /><span v-else class="text-ink-faint">…</span></dd>
      <dt class="text-ink-soft">Posting</dt><dd><span class="status-badge" :class="boardStats.data.value?.paused ? 'text-wax' : 'text-verdigris'">{{ boardStats.data.value ? boardStats.data.value.paused ? 'Paused' : 'Open' : 'Loading…' }}</span></dd>
    </dl>

    <Notice v-if="!wallet.address" class="mt-5">Connect your wallet to see the settings you can manage.</Notice>
    <Notice v-if="wallet.address && !isAdmin && !isCouncil" class="mt-8">
      You hold neither key, so this page is read-only for you.
    </Notice>
    <p v-if="tx.error.value" class="mt-6 text-wax" role="alert">{{ tx.error.value }}</p>
    <p v-if="tx.done.value" class="mt-6 text-verdigris" role="status">{{ tx.done.value }}</p>

    <section class="panel panel-pad mt-6">
      <h2 class="!text-xl mb-2">Seed reviewers</h2>
      <p class="text-ink-soft mb-4">Work a seed approves earns full reputation. Trust spreads outward from these people.</p>
      <ul class="border-t border-rule">
        <li v-for="s in seeds.data.value ?? []" :key="s" class="flex items-center justify-between border-b border-rule py-2.5">
          <Addr :address="s" />
          <button v-if="isAdmin" class="text-sm text-wax hover:underline" :disabled="tx.busy.value" @click="repCall('RemoveSeed', [s], 'Seed removed.')">Remove</button>
        </li>
        <li v-if="seeds.data.value && !seeds.data.value.length" class="py-3 text-ink-soft">No seeds yet, so nobody can earn reputation until the admin adds some.</li>
      </ul>
      <form v-if="isAdmin" class="mt-4 flex gap-2" @submit.prevent="repCall('AddSeed', [seed.trim()], 'Seed added.').then((ok) => ok && (seed = ''))">
        <label for="seed" class="sr-only">Seed address</label>
        <input id="seed" v-model="seed" class="field figures" placeholder="g1…" />
        <button class="btn" :disabled="tx.busy.value || !isAddress(seed)">Add seed</button>
      </form>
    </section>

    <section v-if="isAdmin" class="panel panel-pad mt-6">
      <h2 class="!text-xl mb-2">Void a record</h2>
      <p class="text-ink-soft mb-4">For fraud only. The record stays visible, struck through, and its points are removed.</p>
      <form class="space-y-3" @submit.prevent="repCall('VoidRecord', [voidId, voidReason], 'Record voided.')">
        <div class="max-w-40"><label class="label" for="vid">Record number</label><input id="vid" v-model="voidId" class="field figures" type="number" min="1" step="1" required /></div>
        <div><label class="label" for="vr">Reason</label><input id="vr" v-model="voidReason" class="field" maxlength="300" required /></div>
        <button class="btn btn-wax" :disabled="tx.busy.value">Void record</button>
      </form>
    </section>

    <section v-if="isCouncil" class="panel panel-pad mt-6">
      <h2 class="!text-xl mb-4">Council</h2>
      <div class="flex flex-wrap gap-3">
        <button v-if="!boardStats.data.value?.paused" class="btn-quiet" :disabled="tx.busy.value" @click="boardCall('SetPaused', [true], 'Posting paused.')">Pause new bounties</button>
        <button v-else class="btn" :disabled="tx.busy.value" @click="boardCall('SetPaused', [false], 'Posting resumed.')">Resume posting</button>
      </div>
      <form class="mt-6 space-y-2" @submit.prevent="boardCall('TransferCouncil', [council.trim()], 'Council seat handed over.')">
        <label class="label" for="council">Hand the council seat to</label>
        <input id="council" v-model="council" class="field figures" placeholder="g1… (a multisig is a good idea)" />
        <span class="hint">You lose the seat immediately. Bounties arbitrated by the council follow the new holder.</span>
        <button class="btn-quiet" :disabled="tx.busy.value || !isAddress(council)">Hand over</button>
      </form>
    </section>
  </div>
</template>
