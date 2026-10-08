// The page name shown in the document title and the top bar.
const fixed: Record<string, string> = {
  '/': 'Overview',
  '/bounties': 'Bounties',
  '/campaigns': 'Campaigns',
  '/contributors': 'Contributors',
  '/post': 'Post a bounty',
  '/campaigns/new': 'Post a campaign',
  '/how': 'How it works',
  '/admin': 'Guild settings',
}

export function pageTitle(path: string): string {
  if (fixed[path]) return fixed[path]
  if (path.startsWith('/bounty/')) return 'Bounty details'
  if (path.startsWith('/campaign/')) return 'Campaign details'
  if (path.startsWith('/u/')) return 'Contributor profile'
  if (path.startsWith('/record/')) return 'Work record'
  return 'Page not found'
}
