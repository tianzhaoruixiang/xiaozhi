import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory('/'),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('../xiaozhi/views/DeskGateView.vue'),
      meta: { title: '小智 · 选择工作台' },
    },
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
      path: '/team',
      name: 'team',
      component: () => import('../xiaozhi/views/TeamWorkbench.vue'),
      meta: { title: '小智 · 张处工作台' },
    },
    {
      // 高总工作台；/command/task 为「总结材料生成」交互页（参考 writing.html）
      path: '/command/:pathMatch(.*)*',
      name: 'command',
      component: () => import('../xiaozhi/views/CommandWorkbench.vue'),
      meta: { title: '小智 · 高总工作台' },
    },
    {
      // 知识体系档案馆（参考 library.html）
      path: '/library',
      name: 'library',
      component: () => import('../xiaozhi/views/LibraryWorkbench.vue'),
      meta: { title: '小智 · 知识体系档案馆' },
    },
    {
      // 原「安保协同指挥」；个人工作台的「进入会议」按路由名跳转，路径改名不影响调用
      path: '/meeting',
      name: 'meeting',
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
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  scrollBehavior: () => ({ top: 0 }),
})

router.afterEach((to) => {
  document.title = typeof to.meta.title === 'string' ? to.meta.title : '安保协同指挥'
  const xiaozhiDesk =
    to.name === 'home' ||
    to.name === 'leader' ||
    to.name === 'personal' ||
    to.name === 'team' ||
    to.name === 'command' ||
    to.name === 'library'
  document.documentElement.classList.toggle('xiaozhi-desk', xiaozhiDesk)
})

export default router
