<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useWallet } from '../composables/wallet'
import { shortAddr } from '../lib/format'
import { REALMS_REPO_URL, defaultNetwork, getNetwork, setNetwork } from '../lib/config'
import Hallmark from './Hallmark.vue'
import Icon from './Icon.vue'

const { wallet, connect, disconnect, hasAdena } = useWallet()
const route = useRoute()
const open = ref(false)
const mobileOpen = ref(false)
const mobile = ref(window.matchMedia('(max-width: 767px)').matches)
const net = ref({ ...getNetwork() })
const networkError = ref('')
const networkDialog = ref<HTMLDialogElement>()
const networkButton = ref<HTMLButtonElement>()
const sidebar = ref<HTMLElement>()
const walletMenu = ref<HTMLElement>()
const walletButton = ref<HTMLButtonElement>()
const menuButton = ref<HTMLButtonElement>()
const dark = ref(document.documentElement.classList.contains('dark'))
const section = computed(() => route.path === '/' ? 'Overview' : route.path.startsWith('/bounty/') ? 'Bounty details' : route.path.startsWith('/u/') ? 'Contributor profile' : route.path.startsWith('/record/') ? 'Work record' : ({ '/bounties': 'Bounties', '/contributors': 'Contributors', '/post': 'Post a bounty', '/how': 'How it works', '/admin': 'Guild settings' }[route.path] ?? 'Page not found'))
const links = [
  { to: '/', label: 'Overview', icon: 'grid' },
  { to: '/bounties', label: 'Bounties', icon: 'bounty' },
  { to: '/contributors', label: 'Contributors', icon: 'users' },
]
function activeNav(to: string) {
  return route.path === to || (to === '/bounties' && route.path.startsWith('/bounty/')) || (to === '/contributors' && (route.path.startsWith('/u/') || route.path.startsWith('/record/')))
}
function toggleTheme() {
  dark.value = !dark.value
  document.documentElement.classList.toggle('dark', dark.value)
  try { localStorage.setItem('guildhall.theme', dark.value ? 'dark' : 'light') } catch { /* storage unavailable */ }
}
function showNetwork() { net.value = { ...getNetwork() }; networkError.value = ''; networkDialog.value?.showModal() }
function saveNetwork() {
  try {
    const url = new URL(net.value.rpcUrl.trim())
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error()
    if (!net.value.chainId.trim()) throw new Error()
  } catch { networkError.value = 'Enter an HTTP or HTTPS endpoint and a chain ID.'; return }
  setNetwork({ rpcUrl: net.value.rpcUrl.trim(), chainId: net.value.chainId.trim() })
  location.reload()
}
function resetNetwork() { setNetwork(null); net.value = { ...defaultNetwork() }; location.reload() }
async function closeMobile() { mobileOpen.value = false; await nextTick(); menuButton.value?.focus() }
async function showMobile() { mobileOpen.value = true; await nextTick(); sidebar.value?.querySelector<HTMLButtonElement>('.mobile-close')?.focus() }
function clickOutside(e: MouseEvent) { if (open.value && !walletMenu.value?.contains(e.target as Node)) open.value = false }
function keydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    if (open.value) { open.value = false; walletButton.value?.focus() }
    if (mobileOpen.value) closeMobile()
  }
  if (e.key === 'Tab' && mobileOpen.value && sidebar.value) {
    const nodes = [...sidebar.value.querySelectorAll<HTMLElement>('a[href], button:not(:disabled)')].filter(n => n.offsetParent !== null)
    const first = nodes[0], last = nodes[nodes.length - 1]
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus() }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus() }
  }
}
const media = window.matchMedia('(max-width: 767px)')
function resize() { mobile.value = media.matches; if (!mobile.value) mobileOpen.value = false }
watch(() => route.path, () => { mobileOpen.value = false; open.value = false })
watch(mobileOpen, v => { document.body.style.overflow = v ? 'hidden' : '' })
onMounted(() => { document.addEventListener('click', clickOutside); document.addEventListener('keydown', keydown); media.addEventListener('change', resize) })
onBeforeUnmount(() => { document.removeEventListener('click', clickOutside); document.removeEventListener('keydown', keydown); media.removeEventListener('change', resize); document.body.style.overflow = '' })
</script>
<template>
  <div v-if="mobileOpen" class="fixed inset-0 bg-ink/30 z-30 md:hidden" @click="closeMobile" aria-hidden="true" />
  <aside id="guild-navigation" ref="sidebar" :class="['app-sidebar', mobileOpen && 'is-open']" :inert="mobile && !mobileOpen" :role="mobileOpen ? 'dialog' : undefined" :aria-modal="mobileOpen ? true : undefined" aria-label="Guildhall navigation">
    <div class="flex items-center justify-between px-3">
      <RouterLink to="/" class="brand" aria-label="Guildhall home">
        <svg class="brand-mark" viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M4 27V14a12 12 0 0 1 24 0v13h-7V14a5 5 0 0 0-10 0v13H4Z" fill="currentColor" /><path d="M14 19h4v8h-4z" fill="currentColor" /></svg>
        Guildhall
      </RouterLink>
      <button class="icon-button mobile-close md:hidden" aria-label="Close navigation" @click="closeMobile"><Icon name="close" /></button>
    </div>
    <p class="eyebrow mt-12 mb-3 px-3">Workspace</p>
    <nav aria-label="Main" class="space-y-1">
      <RouterLink v-for="l in links" :key="l.to" :to="l.to" :class="['sidebar-link', activeNav(l.to) && 'router-link-active']" :aria-current="activeNav(l.to) ? 'page' : undefined" :exact-active-class="l.to === '/' ? 'router-link-active' : ''" :active-class="l.to === '/' ? '' : 'router-link-active'"><Icon :name="l.icon" :size="19" />{{ l.label }}</RouterLink>
    </nav>
    <RouterLink to="/post" class="btn mt-6 mx-3"><Icon name="plus" :size="17" /> Post a bounty</RouterLink>
    <div class="mt-auto pt-10">
      <RouterLink to="/how" class="sidebar-link"><Icon name="book" :size="19" />How it works</RouterLink>
      <RouterLink to="/admin" class="sidebar-link"><Icon name="settings" :size="19" />Guild settings</RouterLink>
      <a :href="REALMS_REPO_URL" target="_blank" rel="noopener noreferrer" class="sidebar-link"><Icon name="code" :size="19" />Realm source</a>
      <div class="mt-5 mx-3 pt-5 border-t border-rule">
        <p class="text-xs font-medium text-ink-soft flex items-center gap-2"><span class="network-dot" /> Built on gno.land</p>
        <p class="text-[11px] text-ink-faint mt-1.5">Good work leaves a mark.</p>
      </div>
    </div>
  </aside>
  <header class="app-topbar">
    <div class="flex items-center gap-2 min-w-0">
      <button ref="menuButton" class="icon-button md:hidden" aria-label="Open navigation" :aria-expanded="mobileOpen" aria-controls="guild-navigation" @click="showMobile"><Icon name="menu" /></button>
      <span class="text-sm text-ink-soft hidden sm:inline">Workspace</span><Icon name="chevron" :size="13" class="text-ink-faint hidden sm:block" /><span class="text-sm font-medium truncate hidden sm:inline">{{ section }}</span>
      <RouterLink to="/" class="font-display font-semibold text-ink sm:hidden text-lg">Guildhall</RouterLink>
    </div>
    <div class="flex items-center gap-1.5 sm:gap-3">
      <button ref="networkButton" class="network-pill" aria-label="Network settings" @click="showNetwork"><span class="network-dot hidden sm:block" /><span class="hidden lg:block max-w-40 truncate">{{ net.chainId }}</span><Icon name="globe" :size="16" /></button>
      <button class="icon-button" :aria-label="dark ? 'Use light theme' : 'Use dark theme'" @click="toggleTheme"><Icon :name="dark ? 'sun' : 'moon'" :size="18" /></button>
      <div v-if="wallet.address" ref="walletMenu" class="relative">
        <button ref="walletButton" class="btn-quiet !px-2.5 sm:!px-3" aria-label="Wallet menu" :aria-expanded="open" aria-controls="wallet-menu" @click="open = !open"><Hallmark :address="wallet.address" :size="22" tone="verdigris" label="Your mark" /><span class="figures hidden sm:inline">{{ shortAddr(wallet.address) }}</span><Icon name="down" :size="13" /></button>
        <div v-if="open" id="wallet-menu" class="dropdown w-56" @click="open = false">
          <RouterLink :to="`/u/${wallet.address}`" class="dropdown-link"><Icon name="users" :size="16" />Your profile</RouterLink>
          <RouterLink to="/admin" class="dropdown-link"><Icon name="settings" :size="16" />Guild settings</RouterLink>
          <div class="border-t border-rule mt-1 pt-1"><button class="dropdown-link" @click="disconnect"><Icon name="logout" :size="16" />Disconnect</button></div>
        </div>
      </div>
      <a v-else-if="!hasAdena()" class="btn !px-3" href="https://adena.app" target="_blank" rel="noopener noreferrer"><Icon name="wallet" :size="16" /><span class="hidden sm:inline">Install Adena</span><span class="sm:hidden">Wallet</span></a>
      <button v-else class="btn !px-3" :disabled="wallet.connecting" @click="connect"><Icon name="wallet" :size="16" /><span>{{ wallet.connecting ? 'Connecting…' : 'Connect' }}<span v-if="!wallet.connecting" class="hidden sm:inline"> wallet</span></span></button>
    </div>
  </header>
  <div v-if="wallet.error" class="md:ml-56 px-6 py-3 bg-wax/5 text-wax text-sm" role="alert">{{ wallet.error }}</div>
  <dialog ref="networkDialog" class="network-dialog" aria-labelledby="network-heading" @close="networkButton?.focus()" @click="(e) => { if (e.target === networkDialog) networkDialog?.close() }">
    <form class="p-6 space-y-5" @submit.prevent="saveNetwork">
      <div class="flex items-center justify-between gap-4"><h2 id="network-heading">Network settings</h2><button type="button" class="icon-button" aria-label="Close network settings" @click="networkDialog?.close()"><Icon name="close" /></button></div>
      <p class="text-sm text-ink-soft">Choose the gno.land node Guildhall reads from. Your wallet will use the same chain.</p>
      <label class="block"><span class="label">RPC endpoint</span><input v-model="net.rpcUrl" type="url" class="field" required placeholder="https://rpc.gno.land" /></label>
      <label class="block"><span class="label">Chain ID</span><input v-model="net.chainId" class="field" required /></label>
      <p v-if="networkError" class="text-sm text-wax" role="alert">{{ networkError }}</p>
      <div class="flex flex-wrap gap-2 pt-2"><button class="btn" type="submit">Use this network</button><button class="btn-quiet" type="button" @click="resetNetwork">Reset defaults</button></div>
      <p class="text-xs text-ink-faint">Saved in this browser. Applying a network reloads the app.</p>
    </form>
  </dialog>
</template>
<style scoped>
.network-dialog { margin: auto; width: min(460px,calc(100% - 32px)); max-height: calc(100dvh - 32px); overflow-y: auto; padding: 0; background: var(--color-paper); color: var(--color-ink); border: 1px solid var(--color-rule); border-radius: 14px; box-shadow: 0 20px 70px #0002; }
.network-dialog::backdrop { background: #10231b60; backdrop-filter: blur(3px); }
</style>
