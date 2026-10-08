<script setup lang="ts">
import PageHeading from '../components/PageHeading.vue'
import Icon from '../components/Icon.vue'
import { rep } from '../lib/api'
import { percent } from '../lib/format'
import { useQuery } from '../composables/useQuery'

const stats = useQuery(() => rep.stats())
const levels = [
  ['Newcomer', '0'],
  ['Apprentice', '1+'],
  ['Journeyman', '300+'],
  ['Artisan', '800+'],
  ['Master', '2000+'],
  ['Grandmaster', '5000+'],
]
</script>

<template>
  <div class="max-w-4xl mx-auto">
    <PageHeading title="Good work. Clear rules." eyebrow="How Guildhall works" description="Fund a task, approve the results, and build a public record of contribution. Here’s how it all comes together." />

    <section class="panel panel-pad">
      <h2 class="text-2xl mb-4">A bounty, start to finish</h2>
      <ol class="space-y-5 list-decimal pl-6 marker:font-display marker:font-semibold marker:text-woad text-ink-soft leading-relaxed">
        <li><strong>Post.</strong> Describe the task, split it into milestones and send the reward. The realm holds it; you can cancel for a full refund until someone is assigned.</li>
        <li><strong>Assign.</strong> Contributors apply with a short pitch. You pick one, and can see each applicant’s reputation as you choose.</li>
        <li><strong>Deliver.</strong> The contributor submits each milestone with a link to the work, usually a pull request or a realm path.</li>
        <li><strong>Review.</strong> Once enough reviewers approve, that milestone is paid straight from escrow and a record of the work is written.</li>
        <li><strong>Dispute, if needed.</strong> If poster and contributor disagree, the arbiter decides how that milestone’s escrow is shared.</li>
      </ol>
    </section>

    <section class="panel panel-pad mt-6">
      <h2 class="text-2xl mb-4">Campaigns: one task, many people</h2>
      <div class="space-y-4 leading-relaxed text-ink-soft">
        <p>Some tasks are worth paying many people for, like writing about a release or translating a page. A campaign sets a reward per person and how many people can earn it, and holds the whole amount in escrow: 10 GNOT each for 100 people holds 1,000 GNOT.</p>
        <p>Anyone except the poster and reviewers can claim once with a link to their work. A claim reserves a slot until any one reviewer approves it, which pays it straight away, or rejects it, which frees the slot. The poster can close the campaign at any time and get the unclaimed slots back.</p>
        <p>Each paid claim is written as a work record worth 5% of a bounty milestone, so small repeatable tasks count without outweighing reviewed work.</p>
      </div>
    </section>

    <section class="panel panel-pad mt-6">
      <h2 class="text-2xl mb-4">How reputation is scored</h2>
      <div class="space-y-4 leading-relaxed text-ink-soft">
        <p>
          Reputation only comes from paid work. Each record is worth up to
          <strong class="figures">{{ stats.data.value?.params.base ?? 100 }}</strong> points, scaled by how trusted its
          reviewers are.
        </p>
        <p>
          Seed reviewers, chosen by the Guildhall admin, carry full trust. Everyone else carries trust in proportion to
          their own score, reaching full trust at
          <strong class="figures">{{ stats.data.value?.params.trustThreshold ?? 500 }}</strong> points.
        </p>
        <p>
          Reviewers with no reputation carry
          <strong class="figures">{{ percent(stats.data.value?.params.trustFloorBps ?? 0) }}</strong> trust, so accounts
          approving each other’s work earn nothing until someone trusted vouches for them. Nobody can vouch for their own
          work, and work you fund yourself is scaled to
          <strong class="figures">{{ percent(stats.data.value?.params.selfFundedFactorBps ?? 0) }}</strong>.
        </p>
        <p>Points are fixed when the record is written. The admin can void a fraudulent record, which removes its points.</p>
      </div>

      <table class="mt-6 data-table">
        <caption class="sr-only">Levels by score</caption>
        <thead class="text-sm text-ink-soft border-b border-ink"><tr><th class="py-2 pr-10 font-medium">Level</th><th class="py-2 font-medium">Score</th></tr></thead>
        <tbody>
          <tr v-for="[name, score] in levels" :key="name" class="border-b border-rule">
            <td class="py-2 pr-10">{{ name }}</td><td class="py-2 figures">{{ score }}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="panel panel-pad mt-6">
      <h2 class="text-2xl mb-4">Use it in your own realm</h2>
      <p class="mb-3">Any realm can read Guildhall reputation with one import, for example to let only contributors with a track record post or vote.</p>
      <pre tabindex="0" role="region" aria-label="Realm integration code" class="bg-stone rounded-lg p-4 overflow-x-auto text-xs leading-relaxed"><code>import "{{ 'gno.land/r/g1lnkytfqcjwllws63gvf0mv9yt04aswy4y9amhm/guildhall/reputation' }}"

func Post(cur realm, body string) {
	reputation.AssertScore(cur.Previous().Address(), 100)
	// ...
}</code></pre>
    </section>
    <div class="flex flex-wrap items-center justify-between gap-4 mt-8"><p class="text-ink-soft">Ready to leave your mark?</p><RouterLink to="/bounties" class="btn">Explore bounties<Icon name="arrow" :size="16" /></RouterLink></div>
  </div>
</template>
