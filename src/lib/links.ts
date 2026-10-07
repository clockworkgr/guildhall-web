import { GNOWEB_URL } from './config'
/** Only render navigable web or realm links from on-chain content. */
export function workUrl(value: string): string | undefined {
  const text = value.trim()
  if (/^gno\.land\/(r|p)\//.test(text)) return `${GNOWEB_URL}/${text.slice('gno.land/'.length)}`
  if (/^\/(r|p)\//.test(text)) return `${GNOWEB_URL}${text}`
  try { const url = new URL(text); return ['https:', 'http:'].includes(url.protocol) ? url.href : undefined } catch { return undefined }
}
