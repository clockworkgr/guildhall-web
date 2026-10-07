// Deterministic hallmarks. Like an assay office stamp, each mark is a small
// cartouche with a few characters; its shape and tilt come from a hash of
// the thing it marks, so the same bounty or contributor always gets the same
// mark.

export type Shape = 'shield' | 'oval' | 'octagon' | 'lozenge' | 'cushion'
const shapes: Shape[] = ['shield', 'oval', 'octagon', 'lozenge', 'cushion']

export function hash(s: string): number {
  // FNV-1a, 32 bit.
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

export interface Mark {
  shape: Shape
  rotation: number
  text: string
}

/** A contributor's mark: two letters from their address. */
export function markForAddress(addr: string): Mark {
  const h = hash(addr)
  const body = addr.startsWith('g1') ? addr.slice(2) : addr
  return {
    shape: shapes[h % shapes.length],
    rotation: ((h >> 8) % 13) - 6,
    text: (body.slice(0, 2) || '?').toUpperCase(),
  }
}

/** A bounty's or record's mark: its number. */
export function markForId(kind: string, id: number | string): Mark {
  const h = hash(`${kind}:${id}`)
  return {
    shape: shapes[h % shapes.length],
    rotation: ((h >> 8) % 9) - 4,
    text: String(id),
  }
}

/** SVG path for a shape inside a 0..100 box. */
export function shapePath(shape: Shape): string {
  switch (shape) {
    case 'shield':
      return 'M10 8 H90 V48 C90 74 70 88 50 96 C30 88 10 74 10 48 Z'
    case 'oval':
      return 'M50 6 C78 6 94 26 94 50 C94 74 78 94 50 94 C22 94 6 74 6 50 C6 26 22 6 50 6 Z'
    case 'octagon':
      return 'M32 6 H68 L94 32 V68 L68 94 H32 L6 68 V32 Z'
    case 'lozenge':
      return 'M50 4 L96 50 L50 96 L4 50 Z'
    case 'cushion':
      return 'M24 8 H76 C88 8 92 12 92 24 V76 C92 88 88 92 76 92 H24 C12 92 8 88 8 76 V24 C8 12 12 8 24 8 Z'
  }
}
