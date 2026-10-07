// Where the app talks to. Build-time defaults come from .env.*; the RPC
// endpoint and chain ID can be overridden per browser from the settings menu.

const STORAGE_KEY = 'guildhall.network'

export const REALM_ROOT = import.meta.env.VITE_REALM_ROOT
export const BOUNTIES = `${REALM_ROOT}/bounties`
export const REPUTATION = `${REALM_ROOT}/reputation`
export const GOVDAO = `${REALM_ROOT}/govdao`
export const GNOWEB_URL = import.meta.env.VITE_GNOWEB_URL
export const REALMS_REPO_URL = 'https://github.com/clockworkgr/guildhall'

export interface Network {
  rpcUrl: string
  chainId: string
}

const defaults: Network = {
  rpcUrl: import.meta.env.VITE_RPC_URL,
  chainId: import.meta.env.VITE_CHAIN_ID,
}

export function getNetwork(): Network {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...defaults, ...JSON.parse(raw) }
  } catch {
    /* storage unavailable: use defaults */
  }
  return defaults
}

export function setNetwork(n: Network | null) {
  try {
    if (n) localStorage.setItem(STORAGE_KEY, JSON.stringify(n))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

export function defaultNetwork(): Network {
  return defaults
}

/** gnoweb URL for a realm path (e.g. to show the on-chain source). */
export function gnowebUrl(pkgPath: string, renderPath = ''): string {
  const p = pkgPath.replace(/^gno\.land/, '')
  return `${GNOWEB_URL}${p}${renderPath ? ':' + renderPath : ''}`
}
