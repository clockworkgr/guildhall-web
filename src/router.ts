import { createRouter, createWebHistory } from 'vue-router'

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior: (_to, _from, saved) => saved ?? { top: 0 },
  routes: [
    { path: '/', component: () => import('./pages/HomePage.vue') },
    { path: '/bounties', component: () => import('./pages/BoardPage.vue') },
    { path: '/bounty/:id', component: () => import('./pages/BountyPage.vue'), props: true },
    { path: '/post', component: () => import('./pages/PostPage.vue') },
    { path: '/contributors', component: () => import('./pages/ContributorsPage.vue') },
    { path: '/u/:address', component: () => import('./pages/ProfilePage.vue'), props: true },
    { path: '/record/:id', component: () => import('./pages/RecordPage.vue'), props: true },
    { path: '/how', component: () => import('./pages/HowPage.vue') },
    { path: '/admin', component: () => import('./pages/AdminPage.vue') },
    { path: '/:pathMatch(.*)*', component: () => import('./pages/NotFoundPage.vue') },
  ],
})

router.afterEach((to) => {
  const title = to.path === '/' ? 'Overview' : to.path.startsWith('/bounty/') ? 'Bounty details' : to.path.startsWith('/u/') ? 'Contributor profile' : to.path.startsWith('/record/') ? 'Work record' : ({ '/bounties': 'Bounties', '/contributors': 'Contributors', '/post': 'Post a bounty', '/how': 'How it works', '/admin': 'Guild settings' }[to.path] ?? 'Page not found')
  document.title = `${title} · Guildhall`
})
