// Adena wallet (https://adena.app) integration. The extension injects
// `window.adena`; Guildhall only needs to connect, read the account and sign
// MsgCall transactions.

interface AdenaResponse<T = unknown> {
  code: number
  status: 'success' | 'failure'
  type: string
  message: string
  data: T
}

interface AdenaAccount {
  address: string
  chainId: string
  coins: string
  status: string
}

interface TxResult {
  hash?: string
  height?: string
  deliver_tx?: { ResponseBase?: { Error?: unknown; Log?: string } }
}

interface AdenaApi {
  AddEstablish(name: string): Promise<AdenaResponse>
  GetAccount(): Promise<AdenaResponse<AdenaAccount>>
  GetNetwork(): Promise<AdenaResponse<{ chainId: string; networkName: string; rpcUrl: string }>>
  AddNetwork(p: { chainId: string; chainName: string; rpcUrl: string }): Promise<AdenaResponse>
  SwitchNetwork(chainId: string): Promise<AdenaResponse<{ chainId: string }>>
  DoContract(
    params: { messages: { type: string; value: Record<string, unknown> }[]; memo?: string; gasFee?: number; gasWanted?: number },
    options?: { withNotification?: boolean; isVisibleResult?: boolean },
  ): Promise<AdenaResponse<TxResult>>
  On(event: 'changedAccount' | 'changedNetwork', cb: (data: string) => void): boolean
}

declare global {
  interface Window {
    adena?: AdenaApi
  }
}

export function hasAdena(): boolean {
  return typeof window !== 'undefined' && !!window.adena
}

function adena(): AdenaApi {
  if (!window.adena) throw new Error('Adena wallet not found. Install it from adena.app, then reload this page.')
  return window.adena
}

export interface Account {
  address: string
  chainId: string
}

export async function connect(chainId: string, rpcUrl: string): Promise<Account> {
  const a = adena()
  const est = await a.AddEstablish('Guildhall')
  if (est.code !== 0 && est.type !== 'ALREADY_CONNECTED') {
    throw new Error(est.message || 'The wallet refused the connection.')
  }
  await ensureNetwork(chainId, rpcUrl)
  return account()
}

export async function account(): Promise<Account> {
  const r = await adena().GetAccount()
  if (r.code !== 0) throw new Error(r.message || 'Could not read the wallet account.')
  return { address: r.data.address, chainId: r.data.chainId }
}

async function ensureNetwork(chainId: string, rpcUrl: string) {
  const a = adena()
  const net = await a.GetNetwork()
  if (net.code === 0 && net.data?.chainId === chainId) return
  const sw = await a.SwitchNetwork(chainId)
  if (sw.code === 0) return
  const add = await a.AddNetwork({ chainId, chainName: `gno.land (${chainId})`, rpcUrl })
  if (add.code !== 0) throw new Error(add.message || `Add the ${chainId} network to Adena, then try again.`)
  const again = await a.SwitchNetwork(chainId)
  if (again.code !== 0) throw new Error(again.message || `Switch Adena to ${chainId}, then try again.`)
}

export function onWalletChange(cb: () => void) {
  if (!window.adena) return
  window.adena.On('changedAccount', cb)
  window.adena.On('changedNetwork', cb)
}

export interface Call {
  pkgPath: string
  func: string
  args: (string | number | boolean)[]
  /** Coins to send with the call, e.g. "5000000ugnot". */
  send?: string
}

/**
 * Signs and broadcasts one transaction holding every call, in order. The
 * transaction succeeds or fails as a whole.
 */
export async function sign(caller: string, calls: Call[], gasWanted = 50_000_000): Promise<{ hash: string }> {
  const r = await adena().DoContract(
    {
      messages: calls.map((c) => ({
        type: '/vm.m_call',
        value: {
          caller,
          send: c.send ?? '',
          max_deposit: '',
          pkg_path: c.pkgPath,
          func: c.func,
          args: c.args.map(String),
        },
      })),
      memo: '',
      gasFee: 1_000_000,
      gasWanted,
    },
    { withNotification: true, isVisibleResult: false },
  )
  if (r.code !== 0) throw new Error(explain(r))
  return { hash: r.data?.hash ?? '' }
}

/** Turns a failed transaction into the realm's own panic message. */
function explain(r: AdenaResponse<TxResult>): string {
  if (r.type === 'TRANSACTION_REJECTED') return 'You rejected the transaction in Adena.'
  const log = r.data?.deliver_tx?.ResponseBase?.Log ?? ''
  const m = /VM panic: ([^\n]*)/.exec(log) || /panic: ([^\n]*)/.exec(log) || /msg:\d+,success:false,log:[^:]*: ([^\n]*)/.exec(log)
  if (m) return m[1].trim()
  return r.message || 'The transaction failed.'
}
