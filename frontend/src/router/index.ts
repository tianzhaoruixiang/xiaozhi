import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory('/'),
  routes: [
    { path: '/', redirect: '/personal' },
    {
      path: '/personal/:pathMatch(.*)*',
      name: 'personal',
      component: () => import('../xiaozhi/views/PersonalWorkbench.vue'),
      meta: { title: '小智 · 个人工作台' },
    },
    {
      path: '/leader',
      name: 'leader',
      component: () => import('../xiaozhi/views/ChairmanWorkbench.vue'),
      meta: { title: '小智 · 领导工作台' },
    },
    {
      path: '/command',
      name: 'command',
      component: () => import('../App.vue'),
      meta: { title: '安保协同指挥' },
    },
    {
      path: '/group-operations',
      name: 'group-operations',
      component: () => import('../views/GroupOperationsPage.vue'),
      meta: { title: '小组协同作战' },
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('../views/DashboardView.vue'),
      meta: { title: '指挥态势大屏' },
    },
    { path: '/:pathMatch(.*)*', redirect: '/personal' },
  ],
  scrollBehavior: () => ({ top: 0 }),
})

router.afterEach((to) => {
  document.title = typeof to.meta.title === 'string' ? to.meta.title : '安保协同指挥'
})

export default router
