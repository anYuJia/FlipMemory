import { createRouter, createWebHashHistory } from 'vue-router'
import { getToken } from '@/services/tokenManager'

// 路由预加载函数
function preloadRoute(importFn: () => Promise<any>) {
    // 使用 requestIdleCallback 在空闲时预加载
    if ('requestIdleCallback' in window) {
        requestIdleCallback(() => importFn())
    } else {
        setTimeout(() => importFn(), 100)
    }
}

// 核心路由（首屏需要）
const coreRoutes = [
    {
        path: '/',
        name: 'home',
        component: () => import(/* webpackChunkName: "home" */ '@/views/HomeView.vue'),
        meta: { title: '首页', requiresAuth: true },
    },
    {
        path: '/calendar',
        name: 'calendar',
        component: () => import(/* webpackChunkName: "calendar" */ '@/views/CalendarView.vue'),
        meta: { title: '日历', requiresAuth: true },
    },
    {
        path: '/auth',
        name: 'auth',
        component: () => import(/* webpackChunkName: "auth" */ '@/views/AuthView.vue'),
        meta: { title: '登录', requiresAuth: false },
    },
]

// 记忆相关路由
const memoryRoutes = [
    {
        path: '/memory/:date',
        name: 'memory-detail',
        component: () => import(/* webpackChunkName: "memory" */ '@/views/MemoryDetailView.vue'),
        meta: { title: '记忆详情', requiresAuth: true },
    },
    {
        path: '/create',
        name: 'create-memory',
        component: () => import(/* webpackChunkName: "memory" */ '@/views/CreateMemoryView.vue'),
        meta: { title: '记录新记忆', requiresAuth: true },
    },
    {
        path: '/flashback',
        name: 'flashback',
        component: () => import(/* webpackChunkName: "flashback" */ '@/views/FlashbackView.vue'),
        meta: { title: '记忆回顾', requiresAuth: true },
    },
]

// 功能路由
const featureRoutes = [
    {
        path: '/stats',
        name: 'stats',
        component: () => import(/* webpackChunkName: "stats" */ '@/views/StatsView.vue'),
        meta: { title: '统计', requiresAuth: true },
    },
    {
        path: '/search',
        name: 'search',
        component: () => import(/* webpackChunkName: "search" */ '@/views/SearchView.vue'),
        meta: { title: '搜索', requiresAuth: true },
    },
]

// 设置路由
const settingsRoutes = [
    {
        path: '/settings',
        name: 'settings',
        component: () => import(/* webpackChunkName: "settings" */ '@/views/SettingsView.vue'),
        meta: { title: '设置', requiresAuth: true },
    },
    {
        path: '/settings/theme',
        name: 'settings-theme',
        component: () => import(/* webpackChunkName: "settings" */ '@/views/settings/ThemeSettingsView.vue'),
        meta: { title: '主题外观', requiresAuth: true },
    },
    {
        path: '/settings/language',
        name: 'settings-language',
        component: () => import(/* webpackChunkName: "settings" */ '@/views/settings/LanguageSettingsView.vue'),
        meta: { title: '语言设置', requiresAuth: true },
    },
    {
        path: '/settings/week-start',
        name: 'settings-week-start',
        component: () => import(/* webpackChunkName: "settings" */ '@/views/settings/WeekStartSettingsView.vue'),
        meta: { title: '周起始日', requiresAuth: true },
    },
    {
        path: '/settings/privacy-lock',
        name: 'settings-privacy-lock',
        component: () => import(/* webpackChunkName: "settings" */ '@/views/settings/PrivacyLockSettingsView.vue'),
        meta: { title: '隐私锁', requiresAuth: true },
    },
    {
        path: '/settings/data',
        name: 'settings-data',
        component: () => import(/* webpackChunkName: "settings" */ '@/views/settings/DataManagementView.vue'),
        meta: { title: '数据管理', requiresAuth: true },
    },
    {
        path: '/settings/profile',
        name: 'settings-profile',
        component: () => import(/* webpackChunkName: "settings" */ '@/views/settings/ProfileSettingsView.vue'),
        meta: { title: '个人资料', requiresAuth: true },
    },
    {
        path: '/settings/feedback',
        name: 'settings-feedback',
        component: () => import(/* webpackChunkName: "settings" */ '@/views/settings/FeedbackView.vue'),
        meta: { title: '反馈与建议', requiresAuth: true },
    },
]

// 合并所有路由
const routes = [
    ...coreRoutes,
    ...memoryRoutes,
    ...featureRoutes,
    ...settingsRoutes,
]

const router = createRouter({
    history: createWebHashHistory(),
    routes,
    scrollBehavior(_to, _from, savedPosition) {
        if (savedPosition) {
            return savedPosition
        } else {
            return { top: 0 }
        }
    },
})

// 路由守卫：检查登录状态
router.beforeEach((to, _from, next) => {
    // 设置页面标题
    const title = to.meta.title as string || 'FlipMemory'
    document.title = `${title} - FlipMemory`

    // 检查是否需要登录
    const requiresAuth = to.meta.requiresAuth !== false
    const token = getToken()

    if (requiresAuth && !token) {
        // 需要登录但没有 token，重定向到登录页
        next({ name: 'auth', query: { redirect: to.fullPath } })
    } else if (to.name === 'auth' && token) {
        // 已登录但访问登录页，重定向到首页
        next({ name: 'home' })
    } else {
        next()
    }
})

// 路由加载后预加载相邻路由
router.afterEach((to) => {
    // 根据当前路由预加载相关路由
    switch (to.name) {
        case 'home':
            preloadRoute(() => import('@/views/CalendarView.vue'))
            preloadRoute(() => import('@/views/CreateMemoryView.vue'))
            preloadRoute(() => import('@/views/StatsView.vue'))
            break
        case 'calendar':
            preloadRoute(() => import('@/views/MemoryDetailView.vue'))
            preloadRoute(() => import('@/views/HomeView.vue'))
            preloadRoute(() => import('@/views/SearchView.vue'))
            break
        case 'settings':
            preloadRoute(() => import('@/views/settings/ThemeSettingsView.vue'))
            preloadRoute(() => import('@/views/settings/ProfileSettingsView.vue'))
            preloadRoute(() => import('@/views/settings/DataManagementView.vue'))
            break
        case 'memory-detail':
            preloadRoute(() => import('@/views/CreateMemoryView.vue'))
            preloadRoute(() => import('@/views/CalendarView.vue'))
            break
        case 'search':
            preloadRoute(() => import('@/views/MemoryDetailView.vue'))
            break
        case 'auth':
            // 登录页预加载首页
            preloadRoute(() => import('@/views/HomeView.vue'))
            break
    }
})

export default router
