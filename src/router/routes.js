const routes = [
  // Login route
  {
    path: '/login',
    component: () => import('pages/LoginPage.vue')
  },

  // Main app routes
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: '', component: () => import('pages/IndexPage.vue') },
      { path: '/players', component: () => import('pages/PlayersPage.vue') },
      { path: '/settings', component: () => import('pages/SettingsPage.vue') },
      { path: '/matching', component: () => import('pages/MatchingPage.vue') },
      { path: '/payment', component: () => import('pages/PaymentPage.vue') },
      { path: '/history', component: () => import('pages/HistoryPage.vue') }
    ]
  },

  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue')
  }
]

export default routes
