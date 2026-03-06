import { createRouter, createWebHashHistory } from 'vue-router'
import { getToken } from '@/services/tokenManager'
import i18n from '@/i18n'

/**
 * 带自动重载的动态导入包装器
 * 当 chunk 文件因版本更新不存在时，清除 SW 缓存并刷新页面
 */
function lazyLoad(importFn: () => Promise<any>) {
    return () =>
        importFn().catch((err: Error) => {
            const msg = err?.message || ''
            // 扩展匹配逻辑，涵盖 Chrome, Safari, Firefox 等不同浏览器的报错
            const isDynamicImportError =
                msg.includes('Failed to fetch dynamically imported module') ||
                msg.includes('Importing a module script failed') ||
                msg.includes('error loading dynamically imported module') ||
                msg.includes('Unable to preload CSS') ||
                err.name === 'ChunkLoadError' ||
                err.name === 'TypeError' && (msg.includes('fetch') || msg.includes('import'))

            if (!isDynamicImportError) throw err

            console.error('检测到资源加载失败，尝试清除缓存并刷新页面:', msg)

            // 用 sessionStorage 防止无限刷新循环
            const key = 'dynamic-import-reload'
            const lastReload = sessionStorage.getItem(key)
            const now = Date.now()

            if (lastReload && now - Number(lastReload) < 10000) {
                console.error('10秒内已尝试过刷新，放弃重试以防止循环')
                throw err
            }

            sessionStorage.setItem(key, String(now))

            // 彻底清除缓存并刷新
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                // 通知 SW 跳过等待并清理缓存
                navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' })
            }

            if ('caches' in window) {
                caches.keys().then((names) => {
                    Promise.all(names.map((name) => caches.delete(name))).then(() => {
                        location.reload()
                    })
                }).catch(() => {
                    location.reload()
                })
            } else {
                location.reload()
            }

            return new Promise(() => {})
        })
}

// 路由预加载函数
function preloadRoute(importFn: () => Promise<any>) {
    // 使用 requestIdleCallback 在空闲时预加载，静默忽略错误
    const safeImport = () => importFn().catch(() => {})
    if ('requestIdleCallback' in window) {
        requestIdleCallback(() => safeImport())
    } else {
        setTimeout(() => safeImport(), 100)
    }
}

// 核心路由（首屏需要）
const coreRoutes = [
    {
        path: '/',
        name: 'home',
        component: lazyLoad(() => import('@/views/HomeView.vue')),
        meta: { titleKey: 'route.home', requiresAuth: true },
    },
    {
        path: '/calendar',
        name: 'calendar',
        component: lazyLoad(() => import('@/views/CalendarView.vue')),
        meta: { titleKey: 'route.calendar', requiresAuth: true },
    },
    {
        path: '/auth',
        name: 'auth',
        component: lazyLoad(() => import('@/views/AuthView.vue')),
        meta: { titleKey: 'route.auth', requiresAuth: false },
    },
    {
        path: '/forgot-password',
        name: 'forgot-password',
        component: lazyLoad(() => import('@/views/ForgotPasswordView.vue')),
        meta: { titleKey: 'route.forgot_password', requiresAuth: false },
    },
]

// 记忆相关路由
const memoryRoutes = [
    {
        path: '/memory/:date',
        name: 'memory-detail',
        component: lazyLoad(() => import('@/views/MemoryDetailView.vue')),
        meta: { titleKey: 'route.memory_detail', requiresAuth: true },
    },
    {
        path: '/memory/edit/:date',
        name: 'edit-memory',
        component: lazyLoad(() => import('@/views/EditMemoryView.vue')),
        meta: { titleKey: 'route.edit_memory', requiresAuth: true },
    },
    {
        path: '/create',
        name: 'create-memory',
        component: lazyLoad(() => import('@/views/CreateMemoryView.vue')),
        meta: { titleKey: 'route.create_memory', requiresAuth: true },
    },
    {
        path: '/flashback',
        name: 'flashback',
        component: lazyLoad(() => import('@/views/FlashbackView.vue')),
        meta: { titleKey: 'route.flashback', requiresAuth: true },
    },
]

// 功能路由
const featureRoutes = [
    {
        path: '/stats',
        name: 'stats',
        component: lazyLoad(() => import('@/views/StatsView.vue')),
        meta: { titleKey: 'route.stats', requiresAuth: true },
    },
    {
        path: '/search',
        name: 'search',
        component: lazyLoad(() => import('@/views/SearchView.vue')),
        meta: { titleKey: 'route.search', requiresAuth: true },
    },
]

// 设置路由
const settingsRoutes = [
    {
        path: '/settings',
        name: 'settings',
        component: lazyLoad(() => import('@/views/SettingsView.vue')),
        meta: { titleKey: 'route.settings', requiresAuth: true },
    },
    {
        path: '/settings/theme',
        name: 'settings-theme',
        component: lazyLoad(() => import('@/views/settings/ThemeSettingsView.vue')),
        meta: { titleKey: 'route.settings_theme', requiresAuth: true },
    },
    {
        path: '/settings/language',
        name: 'settings-language',
        component: lazyLoad(() => import('@/views/settings/LanguageSettingsView.vue')),
        meta: { titleKey: 'route.settings_language', requiresAuth: true },
    },
    {
        path: '/settings/week-start',
        name: 'settings-week-start',
        component: lazyLoad(() => import('@/views/settings/WeekStartSettingsView.vue')),
        meta: { titleKey: 'route.settings_week_start', requiresAuth: true },
    },
    {
        path: '/settings/privacy-lock',
        name: 'settings-privacy-lock',
        component: lazyLoad(() => import('@/views/settings/PrivacyLockSettingsView.vue')),
        meta: { titleKey: 'route.settings_privacy_lock', requiresAuth: true },
    },
    {
        path: '/settings/data',
        name: 'settings-data',
        component: lazyLoad(() => import('@/views/settings/DataManagementView.vue')),
        meta: { titleKey: 'route.settings_data', requiresAuth: true },
    },
    {
        path: '/settings/profile',
        name: 'settings-profile',
        component: lazyLoad(() => import('@/views/settings/ProfileSettingsView.vue')),
        meta: { titleKey: 'route.settings_profile', requiresAuth: true },
    },
    {
        path: '/settings/feedback',
        name: 'settings-feedback',
        component: lazyLoad(() => import('@/views/settings/FeedbackView.vue')),
        meta: { titleKey: 'route.settings_feedback', requiresAuth: true },
    },
    {
        path: '/settings/change-password',
        name: 'settings-change-password',
        component: lazyLoad(() => import('@/views/settings/ChangePasswordView.vue')),
        meta: { titleKey: 'route.change_password', requiresAuth: true },
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

/**
 * 安全返回：如果历史记录为空则返回首页
 */
export function safeBack() {
    if (window.history.length <= 1) {
        router.push({ name: 'home' })
    } else {
        router.back()
    }
}

// 路由守卫：检查登录状态
router.beforeEach((to, _from, next) => {
    // 设置页面标题
    const titleKey = to.meta.titleKey as string | undefined
    const title = titleKey ? i18n.global.t(titleKey) : 'FlipMemory'
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
