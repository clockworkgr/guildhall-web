<script setup lang="ts">
import { onMounted } from 'vue'
import SiteHeader from './components/SiteHeader.vue'
import Icon from './components/Icon.vue'
import { useWallet } from './composables/wallet'
import { REALM_ROOT, REALMS_REPO_URL, gnowebUrl } from './lib/config'
const { restore } = useWallet()
onMounted(restore)
</script>
<template>
  <a href="#main" tabindex="0" class="skip-link btn">Skip to content</a>
  <SiteHeader />
  <main id="main" class="app-main" tabindex="-1">
    <div class="app-content">
      <RouterView v-slot="{ Component, route }"><component :is="Component" :key="route.path" /></RouterView>
    </div>
  </main>
  <footer class="app-footer">
    <div class="app-content flex flex-wrap items-center justify-between gap-3">
      <span class="inline-flex items-center gap-2"><Icon name="shield" :size="14" /> Funded on-chain. Built on trust.</span>
      <span class="inline-flex flex-wrap items-center gap-x-5 gap-y-2">
        <a :href="REALMS_REPO_URL" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 text-ink-soft">Realm source on GitHub <Icon name="external" :size="12" /></a>
        <a :href="gnowebUrl(REALM_ROOT)" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 text-ink-soft">Guildhall on gno.land <Icon name="external" :size="12" /></a>
      </span>
    </div>
  </footer>
</template>
