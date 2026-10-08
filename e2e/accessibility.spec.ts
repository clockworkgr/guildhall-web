import AxeBuilder from '@axe-core/playwright'
import { test, expect, addresses } from './fixtures'

const views = [
  {route:'/', heading:/Build something good/},
  {route:'/bounties', heading:'Good work starts here.'},
  {route:'/bounty/1', heading:'Build a better realm explorer'},
  {route:'/bounty/4', heading:'Ship the GRC20 indexer'},
  {route:'/post', heading:'Turn an idea into a contribution.'},
  {route:'/campaigns', heading:'Many hands, one reward each.'},
  {route:'/campaign/1', heading:'Write about Guildhall'},
  {route:'/campaigns/new', heading:'Pay everyone who pitches in.'},
  {route:'/contributors', heading:'People who make things happen.'},
  {route:`/u/${addresses.worker}`, heading:'Artisan'},
  {route:'/record/1', heading:'Explorer accessibility improvements'},
  {route:'/how', heading:'Good work. Clear rules.'},
  {route:'/admin', heading:'Guild settings'},
  {route:'/not-found', heading:'Page not found'},
]
for (const view of views) test(`accessible responsive layout at ${view.route}`, async ({page,app}, testInfo) => {
  await page.goto(view.route)
  await expect(page.getByRole('heading',{name:view.heading,exact:typeof view.heading === 'string'})).toBeVisible()
  await expect(page.getByRole('status',{name:'Loading content'})).toHaveCount(0)
  const scan = await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()
  expect(scan.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) }))).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy()
  await expect(page).toHaveTitle(/Guildhall/)
  if (process.env.CAPTURE_UI) {
    const screenshot = testInfo.outputPath('view.png')
    await page.screenshot({path:screenshot,fullPage:true})
    await testInfo.attach('Design review',{path:screenshot,contentType:'image/png'})
  }
  expect(app.txs).toHaveLength(0)
})

test('keyboard users can skip navigation and operate the network dialog', async ({page,app}) => {
  await page.goto('/')
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link',{name:'Skip to content'})).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('#main')).toBeFocused()
  await page.getByRole('button',{name:'Network settings',exact:true}).click()
  const dialog = page.getByRole('dialog',{name:'Network settings'})
  await expect(dialog).toBeVisible()
  const scan = await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()
  expect(scan.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) }))).toEqual([])
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
  expect(app.txs).toHaveLength(0)
})

test('dark theme keeps the board readable and accessible', async ({page,app}) => {
  await page.goto('/bounties')
  await page.getByRole('button',{name:'Use dark theme'}).click()
  await expect(page.getByRole('list',{name:'Bounties'})).toBeVisible()
  const scan = await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()
  expect(scan.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) }))).toEqual([])
  expect(app.txs).toHaveLength(0)
})

test('mobile drawer is focus-contained, dismissible, and closes after navigation', async ({page,app,isMobile}) => {
  test.skip(!isMobile,'Mobile drawer only')
  await page.goto('/')
  const trigger = page.getByRole('button',{name:'Open navigation'})
  await trigger.click()
  const drawer = page.getByRole('dialog',{name:'Guildhall navigation'})
  await expect(drawer).toBeVisible()
  await expect(page.getByRole('button',{name:'Close navigation'})).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  expect(await drawer.evaluate((el) => el.contains(document.activeElement))).toBeTruthy()
  await page.keyboard.press('Escape')
  await expect(trigger).toBeFocused()
  await trigger.click()
  await drawer.getByRole('link',{name:'Bounties',exact:true}).click()
  await expect(page).toHaveURL(/\/bounties$/)
  await expect(page.locator('.app-sidebar')).toHaveAttribute('inert','')
  expect(app.txs).toHaveLength(0)
})
