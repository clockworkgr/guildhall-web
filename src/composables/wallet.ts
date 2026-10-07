// The connected wallet, shared app-wide.
import { reactive, readonly } from 'vue'
import { account, connect as adenaConnect, hasAdena, onWalletChange, sign, type Call } from '../lib/adena'
import { getNetwork } from '../lib/config'

const state = reactive({
  address: '',
  chainId: '',
  connecting: false,
  error: '',
})

let listening = false
const CONNECTED_KEY = 'guildhall.connected'

async function connect() {
  if (state.connecting) return
  state.connecting = true
  state.error = ''
  try {
    const net = getNetwork()
    const acc = await adenaConnect(net.chainId, net.rpcUrl)
    state.address = acc.address
    state.chainId = acc.chainId
    try {
      localStorage.setItem(CONNECTED_KEY, '1')
    } catch {
      /* ignore */
    }
    if (!listening) {
      listening = true
      onWalletChange(refresh)
    }
  } catch (e) {
    state.error = (e as Error).message
  } finally {
    state.connecting = false
  }
}

async function refresh() {
  let connected = false
  try { connected = localStorage.getItem(CONNECTED_KEY) === '1' } catch { connected = !!state.address }
  if (!connected) return
  try {
    const acc = await account()
    state.address = acc.address
    state.chainId = acc.chainId
  } catch {
    state.address = ''
  }
}

function disconnect() {
  state.address = ''
  state.chainId = ''
  state.error = ''
  try {
    localStorage.removeItem(CONNECTED_KEY)
  } catch {
    /* ignore */
  }
}

/** Reconnects silently if the user connected on a previous visit. */
function restore() {
  let was = false
  try {
    was = localStorage.getItem(CONNECTED_KEY) === '1'
  } catch {
    /* ignore */
  }
  if (!was) return
  // Adena injects asynchronously; give it a moment.
  setTimeout(() => {
    if (hasAdena()) connect()
  }, 300)
}

async function send(calls: Call[], gasWanted?: number) {
  if (!state.address) await connect()
  if (!state.address) throw new Error(state.error || 'Connect a wallet first.')
  if (state.chainId !== getNetwork().chainId) throw new Error(`Switch your wallet to ${getNetwork().chainId} before signing.`)
  return sign(state.address, calls, gasWanted)
}

export function useWallet() {
  return { wallet: readonly(state), connect, disconnect, restore, send, hasAdena }
}
