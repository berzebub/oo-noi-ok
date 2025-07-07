import { route } from 'quasar/wrappers'
import { createRouter, createMemoryHistory, createWebHistory, createWebHashHistory } from 'vue-router'
import routes from './routes'

/*
 * If not building with SSR mode, you can
 * directly export the Router instantiation;
 *
 * The function below can be async too; either use
 * async/await or return a Promise which resolves
 * with the Router instance.
 */





export default route(function ({ store }) {
  const createHistory = process.env.SERVER
    ? createMemoryHistory
    : (process.env.VUE_ROUTER_MODE === 'history' ? createWebHistory : createWebHashHistory)

  const Router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,

    // Leave this as is and make changes in quasar.conf.js instead!
    // quasar.conf.js -> build -> vueRouterMode
    // quasar.conf.js -> build -> publicPath
    history: createHistory(process.env.VUE_ROUTER_BASE)
  })

  // Authentication guard
  Router.beforeEach(async (to, from, next) => {
    const { useAuthStore } = await import('src/stores/auth-store')
    const authStore = useAuthStore(store)

    // Initialize auth if not done
    if (authStore.isLoading) {
      await authStore.initializeAuth()
    }

    // Check if route requires authentication
    const requiresAuth = to.path !== '/login'

    if (requiresAuth && !authStore.isLoggedIn) {
      // Redirect to login if not authenticated
      next('/login')
    } else if (to.path === '/login' && authStore.isLoggedIn) {
      // Redirect to home if already authenticated and trying to access login
      next('/')
    } else {
      next()
    }
  })

  return Router
})
