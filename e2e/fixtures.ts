import { test as base, expect, type Page } from '@playwright/test'
import type { Bounty, Campaign, Claim, WorkRecord, Profile, Standing, Token } from '../src/lib/types'

export const addresses = {
  poster: `g1${'a'.repeat(38)}`, worker: `g1${'c'.repeat(38)}`, reviewer: `g1${'d'.repeat(38)}`,
  council: `g1${'e'.repeat(38)}`, reviewer2: `g1${'f'.repeat(38)}`, visitor: `g1${'j'.repeat(38)}`,
  realm: `g1${'r'.repeat(38)}`,
}
export const realmRoot = 'gno.land/r/g1lnkytfqcjwllws63gvf0mv9yt04aswy4y9amhm/guildhall'
export const token: Token = { key: `${realmRoot}/testing/gld20.GLD`, name: 'Guild token', symbol: 'GLD', decimals: 2 }
export type Message = { type: string; value: { caller: string; pkg_path: string; func: string; args: string[]; send: string; max_deposit: string } }
export type Transaction = { messages: Message[]; gasFee: number; gasWanted: number; memo: string }
const at = '2026-10-06T10:00:00Z'
export function bounty(id: number, status: Bounty['status'] = 'open'): Bounty {
  return { id, title: ({1: 'Build a better realm explorer', 2: 'Write the interrealm guide', 3: 'Design the community toolkit', 4: 'Ship the GRC20 indexer', 5: 'Improve the faucet experience', 6: 'Translate the onboarding docs', 7: 'Polish the wallet integration'} as Record<number,string>)[id] ?? `Community contribution ${id}`,
    description: '## The opportunity\nBuild a thoughtful **open-source** tool for the gno.land community.\n\n- Make it accessible\n- Document your work',
    link: 'https://github.com/gnolang/gno/issues/42', tags: id % 2 ? ['development', 'gno'] : ['docs'], status, poster: addresses.poster,
    assignee: status === 'open' || status === 'cancelled' ? '' : addresses.worker,
    denom: 'ugnot', symbol: 'GNOT', decimals: 6, isGRC20: false, total: 150_000_000,
    escrowed: status === 'completed' || status === 'cancelled' ? 0 : 150_000_000,
    paidOut: status === 'completed' ? 150_000_000 : 0, applications: id === 1 ? 1 : 0, createdAt: at,
    reviewers: [addresses.reviewer], quorum: 1, arbiter: '', councilArbitrated: true, council: addresses.council,
    workWindowDays: 30, assignedAt: status === 'active' ? at : null, closedAt: status === 'completed' ? at : null,
    applicationList: id === 1 ? [{ applicant: addresses.visitor, pitch: 'I have shipped two realm explorers.', at }] : [],
    milestones: [{title: 'Design & prototype', amount: 50_000_000, status: status === 'completed' ? 'paid' : status === 'cancelled' ? 'refunded' : 'pending', approvals: [], worker: '', paidOut: 0, refunded: 0},
      {title: 'Implementation & docs', amount: 100_000_000, status: status === 'completed' ? 'paid' : status === 'cancelled' ? 'refunded' : 'pending', approvals: [], worker: '', paidOut: 0, refunded: 0}],
  }
}
export function record(id: number): WorkRecord {
  return { id, worker: addresses.worker, poster: addresses.poster, reviewers: [addresses.reviewer], reviewerTrustBps: [10000], points: 100, shareBps: 10000,
    amount: 50_000_000, denom: 'ugnot', title: id === 1 ? 'Explorer accessibility improvements' : 'Legacy toolkit implementation', link: 'https://github.com/gnolang/gno/pull/12',
    ref: '5/1', source: `${realmRoot}/bounties`, signedBy: addresses.reviewer, arbitrated: false, height: 1234, at, voided: id === 2, voidReason: id === 2 ? 'Duplicate contribution' : '', }
}

export function campaign(id: number, status: Campaign['status'] = 'open'): Campaign {
  const slots = id === 1 ? 100 : 5, paid = status === 'closed' ? slots : id === 1 ? 1 : 0, pending = status === 'open' && id === 1 ? 1 : 0
  return { id, title: ({1: 'Write about Guildhall', 2: 'Translate the onboarding page'} as Record<number,string>)[id] ?? `Community campaign ${id}`,
    description: 'Post about **Guildhall** with a link to it.', link: 'https://guildhall.clockwork.gr', tags: ['social'], status, poster: addresses.poster,
    denom: 'ugnot', symbol: 'GNOT', decimals: 6, isGRC20: false, reward: 10_000_000, slots, paid, pending, rejected: id === 1 ? 1 : 0, refunded: 0,
    freeSlots: status === 'open' ? slots - paid - pending : 0, claims: id === 1 ? 3 : slots, total: slots * 10_000_000,
    escrowed: (slots - paid) * 10_000_000, paidOut: paid * 10_000_000, deadline: null, createdAt: at, closedAt: status === 'closed' ? at : null,
    reviewers: [addresses.reviewer], claimShareBps: 500 }
}
export function claim(number: number, claimant: string, status: Claim['status']): Claim {
  return { number, claimant, proof: `https://x.com/user/status/${number}`, status, at,
    reviewedBy: status === 'pending' ? '' : addresses.reviewer, reviewedAt: status === 'pending' ? null : at, reason: status === 'rejected' ? 'The post is not public.' : '' }
}

/** The actual RPC transport and Adena interface are intercepted; application code runs unchanged. */
export class AppHarness {
  bounties: Bounty[] = [bounty(1), bounty(2, 'active'), bounty(3, 'active'), bounty(4, 'active'), bounty(5, 'completed'), bounty(6, 'cancelled'), bounty(7, 'active')]
  records: WorkRecord[] = [record(1), record(2)]
  campaigns: Campaign[] = [campaign(1), campaign(2, 'closed')]
  claims: Record<number, Claim[]> = { 1: [claim(1, addresses.worker, 'approved'), claim(2, addresses.visitor, 'pending'), claim(3, addresses.reviewer2, 'rejected')], 2: [] }
  seeds = [addresses.reviewer]
  admin = addresses.council
  council = addresses.council
  paused = false
  txs: Transaction[] = []
  queries: string[] = []
  failures = new Map<string, string>()
  rawResponses = new Map<string, string>()
  httpFailure = false
  nextTxError = ''
  nextConnectError = ''
  walletCalls: string[] = []
  gate: Promise<void> | null = null
  txGate: Promise<void> | null = null
  constructor(readonly page: Page) {
    Object.assign(this.bounties[2]!.milestones[0]!, { status: 'submitted', worker: addresses.worker, submission: 'https://github.com/gnolang/gno/pull/20', approvals: [] })
    Object.assign(this.bounties[3]!.milestones[0]!, { status: 'disputed', worker: addresses.worker, submission: 'https://github.com/gnolang/gno/pull/21', dispute: { openedBy: addresses.worker, reason: 'The delivered scope is complete.', openedAt: at, resolved: false, resolvedAt: null, workerBps: 0, ruling: '' } })
    Object.assign(this.bounties[6]!.milestones[0]!, { status: 'changes requested', worker: addresses.worker, feedback: 'Please add keyboard navigation.', submission: 'https://github.com/gnolang/gno/pull/22' })
  }
  get(id: number) { return this.bounties.find(b => b.id === id)! }
  profile(address: string): Profile {
    return { address, score: address === addresses.worker ? 840 : address === addresses.reviewer ? 2100 : 0, level: address === addresses.worker ? 'Artisan' : address === addresses.reviewer ? 'Master' : 'Newcomer', rank: address === addresses.worker ? 2 : 1, seed: this.seeds.includes(address), completed: address === addresses.worker ? 8 : 2, reviews: address === addresses.reviewer ? 12 : 0, earned: [{ denom: 'ugnot', amount: 350_000_000 }], firstAt: at, lastAt: at }
  }
  standings(): Standing[] { return [addresses.reviewer, addresses.worker, addresses.visitor].map((address, i) => ({...this.profile(address), rank: i + 1})) }
  read(realm: string, path: string): unknown {
    const url = new URL(path, 'https://fixture.test/'), p = url.pathname, q = url.searchParams
    const page = Math.max(1, Number(q.get('page') || 1)), limit = Number(q.get('limit') || 20)
    const paginate = <T>(items: T[]) => ({ items: items.slice((page - 1) * limit, page * limit), more: page * limit < items.length, total: items.length })
    if (realm.endsWith('/bounties')) {
      if (p === '/api/stats') return { total: this.bounties.length, open: this.bounties.filter(b => b.status === 'open').length, active: 4, completed: 1, cancelled: 1, escrow: [{denom: 'ugnot', isGRC20: false, symbol: 'GNOT', decimals: 6, amount: 750_000_000}], council: this.council, paused: this.paused, realmAddress: addresses.realm }
      if (p === '/api/tokens') return { items: [token] }
      if (p === '/api/bounties') return paginate([...this.bounties].reverse().filter(b => (!q.get('status') || q.get('status') === 'all' || b.status === q.get('status')) && (!q.get('tag') || b.tags.includes(q.get('tag')!))))
      if (p.startsWith('/api/bounty/')) return this.bounties.find(b => b.id === Number(p.split('/').pop())) ?? { error: 'not found' }
      if (p.startsWith('/api/user/')) {
        const a = p.split('/').pop()!
        return paginate([...this.bounties].reverse().map(b => ({ bounty: b, roles: [b.poster === a ? 'poster' : '', b.assignee === a ? 'contributor' : '', b.reviewers.includes(a) ? 'reviewer' : '', b.applicationList.some(app => app.applicant === a) ? 'applicant' : ''].filter(Boolean) })).filter(b => b.roles.length))
      }
    }
    if (realm.endsWith('/campaigns')) {
      if (p === '/api/stats') return { total: this.campaigns.length, open: this.campaigns.filter(c => c.status === 'open').length, closed: this.campaigns.filter(c => c.status === 'closed').length, escrow: [], council: this.council, paused: this.paused, realmAddress: addresses.realm, claimShareBps: 500, maxSlots: 1000 }
      if (p === '/api/campaigns') return paginate([...this.campaigns].reverse().filter(c => (!q.get('status') || q.get('status') === 'all' || c.status === q.get('status')) && (!q.get('tag') || c.tags.includes(q.get('tag')!))))
      const m = /^\/api\/campaign\/(\d+)(?:\/(claims|claimant)(?:\/(\w+))?)?$/.exec(p)
      if (m) {
        const c = this.campaigns.find(x => x.id === Number(m[1]))
        if (!c) return { error: 'not found' }
        const claims = [...(this.claims[c.id] ?? [])].reverse()
        if (m[2] === 'claims') return paginate(claims.filter(cl => !q.get('status') || q.get('status') === 'all' || cl.status === q.get('status')))
        if (m[2] === 'claimant') return { claim: claims.find(cl => cl.claimant === m[3]) ?? null }
        return c
      }
      if (p.startsWith('/api/user/')) {
        const a = p.split('/').pop()!
        return paginate([...this.campaigns].reverse().map(c => ({ campaign: c, roles: [c.poster === a ? 'poster' : '', c.reviewers.includes(a) ? 'reviewer' : ''].filter(Boolean), claim: null })).filter(x => x.roles.length))
      }
    }
    if (realm.endsWith('/reputation')) {
      if (p === '/api/stats') return { records: this.records.length, contributors: 3, seeds: this.seeds.length, admin: this.admin, params: {base: 100, trustThreshold: 500, trustFloorBps: 0, selfFundedFactorBps: 0}, writers: [`${realmRoot}/bounties`] }
      if (p === '/api/seeds') return { items: this.seeds }
      if (p === '/api/top') return { items: this.standings().slice(0, limit) }
      if (p.startsWith('/api/profile/')) return this.profile(p.split('/').pop()!)
      if (p === '/api/records') return paginate(this.records.filter(r => !q.get('addr') || (q.get('kind') === 'reviews' ? r.reviewers.includes(q.get('addr')!) : r.worker === q.get('addr'))))
      if (p.startsWith('/api/record/')) return this.records.find(r => r.id === Number(p.split('/').pop())) ?? { error: 'not found' }
    }
    if (realm.endsWith('/govdao')) return {address: p.split('/').pop(), score: 840, tiers: [{ tier: 'member', min: 500, eligible: true }, {tier: 'council', min: 2000, eligible: false}]}
    throw new Error(`Unmocked realm query: ${realm}:${path}`)
  }
  apply(tx: Transaction) {
    for (const {value: v} of tx.messages) {
      if (v.pkg_path.endsWith('/campaigns')) { this.applyCampaign(v); continue }
      const args = v.args, id = Number(args[0]), b = this.get(id)
      if (v.func === 'PostBounty' || v.func === 'PostBountyGRC20') {
        const grc = v.func.endsWith('GRC20'), a = grc ? args.slice(1) : args, created = bounty(Math.max(...this.bounties.map(x => x.id), 0) + 1)
        Object.assign(created, {title: a[0], description: a[1], link: a[2], tags: a[3]!.split(',').map(t => t.trim()).filter(Boolean), poster: v.caller, applicationList: [], applications: 0, reviewers: a[4] ? a[4].split(',') : [v.caller], quorum: Number(a[5]) || 1, workWindowDays: Number(a[8]), arbiter: a[7], councilArbitrated: !a[7]})
        created.milestones = a[6]!.split(';').map(part => {const eq = part.lastIndexOf('='); return {title: part.slice(0,eq), amount: Number(part.slice(eq+1)), status: 'pending', approvals: []} })
        created.total = created.escrowed = created.milestones.reduce((sum,m) => sum + m.amount,0)
        if (grc) Object.assign(created, {denom: args[0], symbol: token.symbol, decimals: token.decimals, isGRC20: true})
        this.bounties.push(created); continue
      }
      if (v.func === 'AddSeed') { this.seeds.push(args[0]!); continue }
      if (v.func === 'RemoveSeed') { this.seeds = this.seeds.filter(a => a !== args[0]); continue }
      if (v.func === 'VoidRecord') { Object.assign(this.records.find(r => r.id === id)!, {voided: true, voidReason: args[1]}); continue }
      if (v.func === 'SetPaused') { this.paused = args[0] === 'true'; continue }
      if (v.func === 'TransferCouncil') { this.council = args[0]!; continue }
      if (!b) continue // Token approval is the other message in a GRC20 funding transaction.
      const m = b.milestones[Number(args[1]) - 1]
      if (v.func === 'Apply') { b.applicationList.push({ applicant: v.caller, pitch: args[1]!, at }); b.applications++ }
      if (v.func === 'Assign') { b.assignee = args[1]!; b.status = 'active'; b.assignedAt = at }
      if (v.func === 'Unassign') { b.assignee = ''; b.status = 'open'; b.assignedAt = null }
      if (v.func === 'Cancel') { b.status = 'cancelled'; b.escrowed = 0; b.milestones.forEach(m => m.status = 'refunded') }
      if (v.func === 'Submit') Object.assign(m!, {status: 'submitted', submission: args[2], worker: v.caller, approvals: []})
      if (v.func === 'RequestChanges') Object.assign(m!, {status: 'changes requested', feedback: args[2], approvals: []})
      if (v.func === 'OpenDispute') Object.assign(m!, {status: 'disputed', dispute: {openedBy: v.caller, reason: args[2], openedAt: at, resolved: false, workerBps: 0, ruling: ''}})
      if (v.func === 'Approve' || v.func === 'Resolve') {
        if (v.func === 'Approve') m!.approvals!.push(v.caller)
        if (v.func === 'Resolve' || m!.approvals!.length >= b.quorum) {
          const share = v.func === 'Approve' ? 10000 : Number(args[2]); m!.status = share === 10000 ? 'paid' : share === 0 ? 'refunded' : 'split'
          b.escrowed -= m!.amount; b.paidOut += m!.amount * share / 10000
          if (m!.dispute) Object.assign(m!.dispute, {resolved: true, workerBps: share, ruling: args[3]})
          if (b.milestones.every(m => ['paid','split','refunded'].includes(m.status))) b.status = 'completed'
        }
      }
    }
  }
  applyCampaign(v: Message['value']) {
    const args = v.args
    if (v.func === 'PostCampaign' || v.func === 'PostCampaignGRC20') {
      const grc = v.func.endsWith('GRC20'), a = grc ? args.slice(1) : args, created = campaign(Math.max(...this.campaigns.map(x => x.id), 0) + 1)
      const reward = Number(a[5]), slots = Number(a[6])
      Object.assign(created, {title: a[0], description: a[1], link: a[2], tags: a[3]!.split(',').map(t => t.trim()).filter(Boolean), poster: v.caller,
        reviewers: a[4] ? a[4].split(',') : [v.caller], reward, slots, paid: 0, pending: 0, rejected: 0, freeSlots: slots, claims: 0, total: reward * slots, escrowed: reward * slots, paidOut: 0,
        deadline: Number(a[7]) ? '2026-11-05T10:00:00Z' : null})
      if (grc) Object.assign(created, {denom: args[0], symbol: token.symbol, decimals: token.decimals, isGRC20: true})
      this.campaigns.push(created); this.claims[created.id] = []; return
    }
    const c = this.campaigns.find(x => x.id === Number(args[0]))!, claims = this.claims[c.id]!
    if (v.func === 'Claim') { claims.push(claim(claims.length + 1, v.caller, 'pending')); Object.assign(claims.at(-1)!, {proof: args[1]}); c.claims++; c.pending++; c.freeSlots-- }
    const cl = claims.find(x => x.number === Number(args[1]))
    if (v.func === 'ApproveClaim') { Object.assign(cl!, {status: 'approved', reviewedBy: v.caller, reviewedAt: at}); c.pending--; c.paid++; c.escrowed -= c.reward; c.paidOut += c.reward }
    if (v.func === 'RejectClaim') { Object.assign(cl!, {status: 'rejected', reviewedBy: v.caller, reviewedAt: at, reason: args[2]}); c.pending--; c.rejected++; c.freeSlots++ }
    if (v.func === 'Close') { c.refunded += c.freeSlots; c.escrowed -= c.freeSlots * c.reward; c.freeSlots = 0; c.status = 'closed'; c.closedAt = at }
  }
  async setWallet(address: string, chainId = 'guildhall-test') {
    await this.page.evaluate(({address, chainId}) => {
      const w = (window as any).__wallet; w.address = address; w.chainId = chainId
      sessionStorage.setItem('__test.wallet', JSON.stringify({address, chainId}))
      for (const cb of w.listeners.changedAccount ?? []) cb(address)
      for (const cb of w.listeners.changedNetwork ?? []) cb(chainId)
    }, {address, chainId})
  }
  async connect(address: string = addresses.worker) {
    await this.setWallet(address)
    await this.page.locator('.app-topbar').getByRole('button', {name: /^Connect( wallet)?$/}).click()
    await expect(this.page.getByRole('button', {name: 'Wallet menu'})).toBeVisible()
  }
  async install(walletAvailable: boolean) {
    const errors: string[] = []
    this.page.on('pageerror', err => errors.push(err.message))
    await this.page.route('**/*', async route => {
      const request = route.request()
      if (request.method() !== 'POST') { await route.continue(); return }
      let body: any
      try { body = request.postDataJSON() } catch { await route.abort(); return }
      if (!['abci_query', 'status'].includes(body?.method)) { await route.abort(); return }
      if (this.gate) await this.gate
      if (this.httpFailure) { await route.fulfill({ status: 503, body: 'Node unavailable' }); return }
      if (body.method === 'status') { await route.fulfill({json: {jsonrpc:'2.0',id:body.id,result:{node_info:{network:'guildhall-test'},sync_info:{latest_block_height:'1234'}}}}); return }
      const data = Buffer.from(body.params.data, 'base64').toString('utf8'), colon = data.indexOf(':'), realm = data.slice(0,colon), path = data.slice(colon+1)
      this.queries.push(data)
      const key = `${realm.split('/').pop()}:${path.split('?')[0]}`
      const failure = this.failures.get(key)
      const raw = this.rawResponses.get(key) ?? JSON.stringify(failure ? { error: failure } : this.read(realm,path))
      await route.fulfill({json:{jsonrpc:'2.0',id:body.id,result:{response:{ResponseBase:{Error:null,Log:'',Data:Buffer.from(raw).toString('base64')}}}}})
    })
    await this.page.exposeFunction('__guildhallSign', async (tx: Transaction) => {
      this.txs.push(tx)
      if (this.txGate) await this.txGate
      if (this.nextTxError) { const message = this.nextTxError; this.nextTxError = ''; return {code: 1, type: message === 'reject' ? 'TRANSACTION_REJECTED' : 'TRANSACTION_FAILED', message, data: {deliver_tx: {ResponseBase: {Log: `VM panic: ${message}`}}}} }
      this.apply(tx); return { code: 0, status: 'success', data: {hash: 'TEST_HASH'} }
    })
    await this.page.exposeFunction('__walletCall', (name: string) => {
      this.walletCalls.push(name)
      if (name === 'AddEstablish' && this.nextConnectError) return {code:1, message: this.nextConnectError}
      return {code:0}
    })
    await this.page.addInitScript(({walletAvailable, address}) => {
      const w = window as any
      w.__wallet = {address, chainId:'guildhall-test', ...JSON.parse(sessionStorage.getItem('__test.wallet') || '{}'), listeners: {}}
      if (!walletAvailable) return
      const success = (data: any = {}) => ({code:0,status:'success',data})
      w.adena = {
        AddEstablish: () => w.__walletCall('AddEstablish'),
        GetAccount: async () => success({address:w.__wallet.address,chainId:w.__wallet.chainId}),
        GetNetwork: async () => success({chainId:w.__wallet.chainId}),
        SwitchNetwork: async (chainId: string) => { await w.__walletCall('SwitchNetwork'); w.__wallet.chainId = chainId; return success({chainId}) },
        AddNetwork: async () => { await w.__walletCall('AddNetwork'); return success() },
        DoContract: (tx: Transaction) => w.__guildhallSign(tx),
        On: (event: string, callback: any) => { (w.__wallet.listeners[event] ??= []).push(callback); return true },
      }
    }, {walletAvailable, address: addresses.worker})
    return errors
  }
}
export const test = base.extend<{app: AppHarness; walletAvailable: boolean}>({
  walletAvailable: [true, {option:true}],
  app: async ({page,walletAvailable}, use) => {const app = new AppHarness(page), errors = await app.install(walletAvailable); await use(app); expect(errors, 'No uncaught browser errors').toEqual([])},
})
export {expect}
