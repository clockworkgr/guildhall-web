// Minimal JSON-RPC client for a gno.land node: abci_query and status.
import { getNetwork } from './config'

let rpcId = 0

async function rpc<T>(method: string, params: Record<string, unknown>): Promise<T> {
  const res = await fetch(getNetwork().rpcUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: String(++rpcId), method, params }),
  })
  if (!res.ok) throw new Error(`The node answered ${method} with HTTP ${res.status}.`)
  const body = await res.json()
  if (body.error) throw new Error(body.error.data || body.error.message || `RPC ${method} failed.`)
  return body.result as T
}

const enc = new TextEncoder()
const dec = new TextDecoder()

function b64encode(s: string): string {
  let bin = ''
  for (const b of enc.encode(s)) bin += String.fromCharCode(b)
  return btoa(bin)
}

function b64decode(s: string): string {
  const bin = atob(s)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return dec.decode(bytes)
}

interface AbciResponse {
  response: {
    ResponseBase: { Error: null | { '@type': string; value: string }; Data: string | null; Log: string }
  }
}

export async function abciQuery(path: string, data: string): Promise<string> {
  const r = await rpc<AbciResponse>('abci_query', { path, data: b64encode(data) })
  const base = r.response.ResponseBase
  if (base.Error) {
    const m = /VM panic: ([^\n]*)/.exec(base.Log ?? '')
    throw new Error(m ? m[1] : base.Error.value || 'The query failed.')
  }
  return base.Data ? b64decode(base.Data) : ''
}

/** Calls a realm's Render(path) and returns the raw output. */
export function qrender(pkgPath: string, path: string): Promise<string> {
  return abciQuery('vm/qrender', `${pkgPath}:${path}`)
}

/** Calls a realm's Render("api/...") endpoint and parses its JSON. */
export async function api<T>(pkgPath: string, path: string): Promise<T> {
  const raw = await qrender(pkgPath, path)
  let out: unknown
  try {
    out = JSON.parse(raw)
  } catch {
    throw new Error(`The realm at ${pkgPath} did not return JSON. Is it deployed with the web API?`)
  }
  if (out && typeof out === 'object' && 'error' in out) {
    throw new ApiError(String((out as { error: unknown }).error))
  }
  return out as T
}

export class ApiError extends Error {}

export interface ChainStatus {
  chainId: string
  height: number
}

export async function status(): Promise<ChainStatus> {
  const r = await rpc<{ node_info: { network: string }; sync_info: { latest_block_height: string } }>('status', {})
  return { chainId: r.node_info.network, height: Number(r.sync_info.latest_block_height) }
}

export async function balance(addr: string, denom = 'ugnot'): Promise<bigint> {
  const raw = await abciQuery(`bank/balances/${addr}`, '')
  // e.g. "\"12345ugnot,9foo\""
  const text = raw.replace(/^"|"$/g, '')
  for (const c of text.split(',')) {
    const m = /^(\d+)(.+)$/.exec(c.trim())
    if (m && m[2] === denom) return BigInt(m[1])
  }
  return 0n
}
