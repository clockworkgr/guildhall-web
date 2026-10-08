// Shapes returned by the realms' Render("api/...") endpoints.

export type BountyStatus = 'open' | 'active' | 'completed' | 'cancelled'
export type MilestoneStatus =
  | 'pending'
  | 'submitted'
  | 'changes requested'
  | 'disputed'
  | 'paid'
  | 'split'
  | 'refunded'

export interface Denom {
  denom: string
  isGRC20: boolean
  symbol: string
  decimals: number
}

export interface Dispute {
  openedBy: string
  reason: string
  openedAt: string | null
  resolved: boolean
  resolvedAt: string | null
  workerBps: number
  ruling: string
}

export interface Milestone {
  title: string
  amount: number
  status: MilestoneStatus
  // Present on the detail endpoint only.
  submission?: string
  submittedAt?: string | null
  approvals?: string[]
  feedback?: string
  worker?: string
  paidOut?: number
  refunded?: number
  settledAt?: string | null
  dispute?: Dispute | null
}

export interface Application {
  applicant: string
  pitch: string
  at: string | null
}

export interface BountySummary extends Denom {
  id: number
  title: string
  tags: string[]
  status: BountyStatus
  poster: string
  assignee: string
  total: number
  escrowed: number
  paidOut: number
  applications: number
  createdAt: string | null
  milestones: Milestone[]
}

export interface Bounty extends BountySummary {
  description: string
  link: string
  reviewers: string[]
  quorum: number
  arbiter: string
  councilArbitrated: boolean
  council: string
  workWindowDays: number
  assignedAt: string | null
  closedAt: string | null
  applicationList: Application[]
}

export interface Page<T> {
  items: T[]
  more: boolean
  total?: number
}

export interface BoardStats {
  total: number
  open: number
  active: number
  completed: number
  cancelled: number
  escrow: (Denom & { amount: number })[]
  council: string
  paused: boolean
  realmAddress: string
}

export interface UserBounty {
  bounty: BountySummary
  roles: string[]
}

export interface Token {
  key: string
  name: string
  symbol: string
  decimals: number
}

export interface RepStats {
  records: number
  contributors: number
  seeds: number
  admin: string
  params: { base: number; trustThreshold: number; trustFloorBps: number; selfFundedFactorBps: number }
  writers: string[]
}

export interface Standing {
  rank: number
  address: string
  score: number
  level: string
  completed: number
  reviews: number
  seed: boolean
}

export interface Profile {
  address: string
  score: number
  level: string
  rank: number
  seed: boolean
  completed: number
  reviews: number
  earned: { denom: string; amount: number }[]
  firstAt: string | null
  lastAt: string | null
}

export interface WorkRecord {
  id: number
  worker: string
  poster: string
  reviewers: string[]
  reviewerTrustBps: number[]
  points: number
  shareBps: number
  amount: number
  denom: string
  title: string
  link: string
  ref: string
  source: string
  signedBy: string
  arbitrated: boolean
  height: number
  at: string | null
  voided: boolean
  voidReason: string
}

export type CampaignStatus = 'open' | 'closed'
export type ClaimStatus = 'pending' | 'approved' | 'rejected'

export interface CampaignSummary extends Denom {
  id: number
  title: string
  tags: string[]
  status: CampaignStatus
  poster: string
  reward: number
  slots: number
  paid: number
  pending: number
  rejected: number
  refunded: number
  freeSlots: number
  claims: number
  total: number
  escrowed: number
  paidOut: number
  deadline: string | null
  createdAt: string | null
}

export interface Campaign extends CampaignSummary {
  description: string
  link: string
  reviewers: string[]
  closedAt: string | null
  claimShareBps: number
}

export interface Claim {
  number: number
  claimant: string
  proof: string
  status: ClaimStatus
  at: string | null
  reviewedBy: string
  reviewedAt: string | null
  reason: string
}

export interface CampaignStats {
  total: number
  open: number
  closed: number
  escrow: (Denom & { amount: number })[]
  council: string
  paused: boolean
  realmAddress: string
  claimShareBps: number
  maxSlots: number
}

export interface UserCampaign {
  campaign: CampaignSummary
  roles: string[]
  claim: Claim | null
}

export interface Candidate {
  address: string
  score: number
  tiers: { tier: string; min: number; eligible: boolean }[]
}
