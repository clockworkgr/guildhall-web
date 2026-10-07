// Display info for record and bounty denominations, cached for the session.
import { shallowRef } from 'vue'
import { board } from '../lib/api'
import { denomInfo } from '../lib/format'
import type { Token } from '../lib/types'

const tokens = shallowRef<Map<string, Token>>(new Map())
let loading: Promise<void> | null = null

export function useTokens() {
  if (!loading) {
    loading = board
      .tokens()
      .then((items) => {
        tokens.value = new Map(items.map((t) => [t.key, t]))
      })
      .catch(() => {
        loading = null
      })
  }
  function info(denom: string): { symbol: string; decimals: number } {
    const t = tokens.value.get(denom)
    return t ? { symbol: t.symbol, decimals: t.decimals } : denomInfo(denom)
  }
  return { tokens, info }
}
