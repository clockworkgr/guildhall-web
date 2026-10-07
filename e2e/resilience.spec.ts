import { test, expect, addresses } from './fixtures'

const failures = [
  {route:'/bounties', key:'bounties:api/bounties', heading:'Good work starts here.'},
  {route:'/bounty/1', key:'bounties:api/bounty/1', heading:'Build a better realm explorer'},
  {route:'/contributors', key:'reputation:api/top', heading:'Contributor leaderboard'},
  {route:`/u/${addresses.worker}`, key:`reputation:api/profile/${addresses.worker}`, heading:'Artisan'},
  {route:'/record/1', key:'reputation:api/record/1', heading:'Explorer accessibility improvements'},
  {route:'/admin', key:'reputation:api/seeds', heading:'Seed reviewers'},
]
for (const f of failures) test(`RPC failure can be retried on ${f.route}`, async ({page,app}) => {
  app.failures.set(f.key, 'The realm is temporarily unavailable.')
  await page.goto(f.route)
  await expect(page.getByRole('alert')).toContainText('The realm is temporarily unavailable.')
  app.failures.delete(f.key)
  await page.getByRole('button',{name:'Try again'}).click()
  await expect(page.getByRole('alert')).toHaveCount(0)
  await expect(page.getByRole('heading',{name:f.heading,exact:true})).toBeVisible()
})

test('profile tab failures are shown and recover independently', async ({page,app}) => {
  app.failures.set('reputation:api/records','Records unavailable')
  await page.goto(`/u/${addresses.worker}`)
  await expect(page.getByRole('alert')).toContainText('Records unavailable')
  app.failures.delete('reputation:api/records')
  await page.getByRole('button',{name:'Try again'}).click()
  await expect(page.getByRole('list',{name:'Work records'})).toBeVisible()
  app.failures.set(`bounties:api/user/${addresses.worker}`,'Bounties unavailable')
  await page.getByRole('navigation',{name:'Profile sections'}).getByRole('button',{name:'Bounties'}).click()
  await expect(page.getByRole('alert')).toContainText('Bounties unavailable')
})

test('overview reports failed sections and can retry them', async ({page,app}) => {
  app.failures.set('bounties:api/bounties','Opportunities unavailable')
  app.failures.set('reputation:api/top','Leaderboard unavailable')
  await page.goto('/')
  await expect(page.getByRole('alert').filter({hasText:'Opportunities unavailable'})).toBeVisible()
  await expect(page.getByRole('alert').filter({hasText:'Leaderboard unavailable'})).toBeVisible()
  app.failures.clear()
  await page.getByRole('alert').filter({hasText:'Opportunities unavailable'}).getByRole('button',{name:'Try again'}).click()
  await expect(page.getByRole('list',{name:'Bounties'})).toBeVisible()
})

test('loading placeholders transition to real data', async ({page,app}) => {
  let release!: () => void
  app.gate = new Promise<void>(resolve => release = resolve)
  try {
    await page.goto('/bounties')
    await expect(page.getByRole('status',{name:'Loading content'})).toBeVisible()
  } finally { app.gate = null; release() }
  await expect(page.getByRole('list',{name:'Bounties'})).toBeVisible()
  await expect(page.getByRole('status',{name:'Loading content'})).toHaveCount(0)
})

test('empty states cover the overview, leaderboard and profile', async ({page,app}) => {
  app.bounties = []; app.records = []; app.standings = () => []
  await page.goto('/')
  await expect(page.getByRole('heading',{name:'The next opportunity starts with you'})).toBeVisible()
  await expect(page.getByRole('heading',{name:'Good work will appear here'})).toBeVisible()
  await expect(page.getByRole('heading',{name:'A community in the making'})).toBeVisible()
  await page.goto('/contributors')
  await expect(page.getByRole('heading',{name:'Meet the first contributors, soon'})).toBeVisible()
  await page.goto(`/u/${addresses.worker}`)
  await expect(page.getByRole('heading',{name:'No paid work on record yet'})).toBeVisible()
  await page.getByRole('button',{name:'Bounties',exact:true}).click()
  await expect(page.getByRole('heading',{name:'No bounties yet'})).toBeVisible()
})

test('malformed API data and HTTP errors produce readable errors', async ({page,app}) => {
  app.rawResponses.set('bounties:api/bounties','<html>wrong realm version</html>')
  await page.goto('/bounties')
  await expect(page.getByRole('alert')).toContainText('did not return JSON')
  app.rawResponses.clear(); app.httpFailure = true
  await page.getByRole('button',{name:'Try again'}).click()
  await expect(page.getByRole('alert')).toContainText('HTTP 503')
  app.httpFailure = false
  await page.getByRole('button',{name:'Try again'}).click()
  await expect(page.getByRole('list',{name:'Bounties'})).toBeVisible()
})

test('on-chain markdown and links cannot inject scripts or controls', async ({page,app}) => {
  app.get(1).description = '## Safe description\n<script>window.__injected=true</script><img src=x onerror="window.__injected=true"><style>body{display:none}</style><iframe src="https://example.com"></iframe><form><input></form>\n[Unsafe](javascript:alert(1))'
  app.get(1).link = 'javascript:alert(1)'
  await page.goto('/bounty/1')
  await expect(page.getByRole('heading',{name:'Safe description'})).toBeVisible()
  await expect(page.locator('.prose-guild script, .prose-guild img, .prose-guild style, .prose-guild iframe, .prose-guild form, .prose-guild input')).toHaveCount(0)
  await expect(page.locator('a[href^="javascript:"]')).toHaveCount(0)
  expect(await page.evaluate(() => (window as any).__injected)).toBeUndefined()
  app.records[0]!.link = 'data:text/html,<script>alert(1)</script>'
  await page.goto('/record/1')
  await expect(page.locator('a[href^="data:"]')).toHaveCount(0)
})
