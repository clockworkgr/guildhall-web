// Formatting and parsing for amounts, addresses and dates. Amounts are kept
// as integers in the smallest unit and converted with string arithmetic, so
// no value ever passes through a float.

export function formatUnits(amount: number | bigint | string, decimals: number): string {
  let s = BigInt(amount).toString()
  const neg = s.startsWith('-')
  if (neg) s = s.slice(1)
  if (decimals > 0) {
    s = s.padStart(decimals + 1, '0')
    const whole = s.slice(0, -decimals)
    const frac = s.slice(-decimals).replace(/0+$/, '')
    s = frac ? `${groupThousands(whole)}.${frac}` : groupThousands(whole)
  } else {
    s = groupThousands(s)
  }
  return neg ? `-${s}` : s
}

function groupThousands(s: string): string {
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

/** Parses a human amount ("2.5") into smallest units, or null if invalid. */
export function parseUnits(input: string, decimals: number): bigint | null {
  const s = input.trim().replace(/,/g, '')
  if (!/^\d+(\.\d+)?$/.test(s)) return null
  const [whole, frac = ''] = s.split('.')
  if (frac.length > decimals) return null
  return BigInt(whole + frac.padEnd(decimals, '0'))
}

export function amount(value: number | bigint, d: { symbol: string; decimals: number }): string {
  return `${formatUnits(value, d.decimals)} ${d.symbol}`
}

export function shortAddr(a: string): string {
  if (!a) return ''
  return a.length > 16 ? `${a.slice(0, 8)}…${a.slice(-4)}` : a
}

export function isAddress(a: string): boolean {
  return /^g1[02-9ac-hj-np-z]{38}$/.test(a.trim())
}

export function date(iso: string | null | undefined): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export function relative(iso: string | null | undefined): string {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const day = 86_400_000
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min ago`
  if (diff < day) return `${Math.floor(diff / 3_600_000)} h ago`
  if (diff < 30 * day) return `${Math.floor(diff / day)} d ago`
  return date(iso)
}

export function percent(bps: number): string {
  const v = bps / 100
  return `${Number.isInteger(v) ? v : v.toFixed(2)}%`
}

/** Display info for a native denom or a record's denom string. */
export function denomInfo(denom: string): { symbol: string; decimals: number } {
  if (denom === 'ugnot') return { symbol: 'GNOT', decimals: 6 }
  const dot = denom.lastIndexOf('.')
  return { symbol: dot >= 0 ? denom.slice(dot + 1) : denom, decimals: 0 }
}
