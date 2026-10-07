// Typed reads from the Guildhall realms.
import { BOUNTIES, GOVDAO, REPUTATION } from './config'
import { api } from './rpc'
import type {
  BoardStats,
  Bounty,
  BountySummary,
  Candidate,
  Page,
  Profile,
  RepStats,
  Standing,
  Token,
  UserBounty,
  WorkRecord,
} from './types'

function qs(params: Record<string, string | number | undefined>): string {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') p.set(k, String(v))
  const s = p.toString()
  return s ? `?${s}` : ''
}

export const board = {
  stats: () => api<BoardStats>(BOUNTIES, 'api/stats'),
  list: (o: { status?: string; tag?: string; page?: number; limit?: number }) =>
    api<Page<BountySummary>>(BOUNTIES, `api/bounties${qs(o)}`),
  get: (id: number | string) => api<Bounty>(BOUNTIES, `api/bounty/${id}`),
  user: (addr: string, page = 1) => api<Page<UserBounty>>(BOUNTIES, `api/user/${addr}${qs({ page })}`),
  tokens: () => api<{ items: Token[] }>(BOUNTIES, 'api/tokens').then((r) => r.items),
}

export const rep = {
  stats: () => api<RepStats>(REPUTATION, 'api/stats'),
  top: (limit = 25) => api<{ items: Standing[] }>(REPUTATION, `api/top${qs({ limit })}`).then((r) => r.items),
  profile: (addr: string) => api<Profile>(REPUTATION, `api/profile/${addr}`),
  records: (o: { addr?: string; kind?: 'work' | 'reviews'; page?: number; limit?: number }) =>
    api<Page<WorkRecord>>(REPUTATION, `api/records${qs(o)}`),
  record: (id: number | string) => api<WorkRecord>(REPUTATION, `api/record/${id}`),
  seeds: () => api<{ items: string[] }>(REPUTATION, 'api/seeds').then((r) => r.items),
}

export const govdao = {
  candidate: (addr: string) => api<Candidate>(GOVDAO, `api/candidate/${addr}`),
}
