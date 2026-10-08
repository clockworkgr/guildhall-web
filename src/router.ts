import { createRouter, createWebHistory } from 'vue-router'
import { pageTitle } from './lib/titles'

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior: (_to, _from, saved) => saved ?? { top: 0 },
  routes: [
    { path: '/', component: () => import('./pages/HomePage.vue') },
    { path: '/bounties', component: () => import('./pages/BoardPage.vue') },
    { path: '/bounty/:id', component: () => import('./pages/BountyPage.vue'), props: true },
    { path: '/post', component: () => import('./pages/PostPage.vue') },
    { path: '/campaigns', component: () => import('./pages/CampaignsPage.vue') },
    { path: '/campaigns/new', component: () => import('./pages/PostCampaignPage.vue') },
    { path: '/campaign/:id', component: () => import('./pages/CampaignPage.vue'), props: true },
    { path: '/contributors', component: () => import('./pages/ContributorsPage.vue') },
    { path: '/u/:address', component: () => import('./pages/ProfilePage.vue'), props: true },
    { path: '/record/:id', component: () => import('./pages/RecordPage.vue'), props: true },
    { path: '/how', component: () => import('./pages/HowPage.vue') },
    { path: '/admin', component: () => import('./pages/AdminPage.vue') },
    { path: '/:pathMatch(.*)*', component: () => import('./pages/NotFoundPage.vue') },
  ],
})

router.afterEach((to) => {
  document.title = `${pageTitle(to.path)} · Guildhall`
})
