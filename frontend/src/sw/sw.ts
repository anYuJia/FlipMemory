/// <reference lib="webworker" />
/**
 * FlipMemory Service Worker
 * 处理离线缓存和后台同步
 */
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'

declare let self: ServiceWorkerGlobalScope

// ===== 预缓存静态资源 =====
// Vite PWA 插件会自动注入需要预缓存的资源列表
precacheAndRoute(self.__WB_MANIFEST)

// 清理过期的缓存
cleanupOutdatedCaches()

// ===== 缓存名称常量 =====
const CACHE_NAMES = {
    API: 'api-cache-v1',
    IMAGES: 'image-cache-v1',
    STATIC: 'static-cache-v1',
}

// ===== API 请求缓存策略 =====
// Only cache GET requests with NetworkFirst; POST/PUT/DELETE pass through to network
registerRoute(
    ({ url, request }) => url.pathname.startsWith('/api/') && request.method === 'GET',
    new NetworkFirst({
        cacheName: CACHE_NAMES.API,
        networkTimeoutSeconds: 10, // 10秒超时后使用缓存
        plugins: [
            new CacheableResponsePlugin({
                statuses: [0, 200],
            }),
            new ExpirationPlugin({
                maxEntries: 100,
                maxAgeSeconds: 3 * 60 * 60, // 3 小时
                purgeOnQuotaError: true,
            }),
        ],
    })
)

// ===== 图片缓存策略 =====
// 使用 StaleWhileRevalidate 策略：优先从缓存加载保证秒开，同时后台静默更新
registerRoute(
    ({ request, url }) => {
        // 匹配图片请求，排除本地 Blob 或 data: 链接
        return (request.destination === 'image' ||
            url.pathname.match(/\.(png|jpg|jpeg|gif|webp|svg|ico)$/i)) &&
            !url.protocol.startsWith('blob:') &&
            !url.protocol.startsWith('data:')
    },
    new StaleWhileRevalidate({
        cacheName: CACHE_NAMES.IMAGES,
        plugins: [
            new CacheableResponsePlugin({
                statuses: [0, 200],
            }),
            new ExpirationPlugin({
                maxEntries: 300, // 增加图片缓存数量到 300
                maxAgeSeconds: 60 * 24 * 60 * 60, // 延长到 60 天
                purgeOnQuotaError: true,
            }),
        ],
    })
)

// ===== 静态资源缓存策略 (CSS/Fonts, 不含 JS) =====
// JS chunk 由 precacheAndRoute 管理，无需额外缓存，避免版本冲突
registerRoute(
    ({ request, url }) => {
        return (request.destination === 'style' ||
            request.destination === 'font' ||
            url.pathname.match(/\.(css|woff2?|ttf|eot)$/i)) &&
            !url.pathname.match(/\.[a-f0-9]{8,}\.js$/i)
    },
    new StaleWhileRevalidate({
        cacheName: CACHE_NAMES.STATIC,
        plugins: [
            new CacheableResponsePlugin({
                statuses: [0, 200],
            }),
            new ExpirationPlugin({
                maxEntries: 100,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 天
            }),
        ],
    })
)

// ===== 导航请求处理 =====
// SPA 导航请求优先网络，离线回退缓存，避免长期使用旧的 index.html
registerRoute(
    ({ request, url }) => request.mode === 'navigate' && !url.pathname.startsWith('/api/'),
    new NetworkFirst({
        cacheName: 'navigation-cache',
        networkTimeoutSeconds: 5,
        plugins: [
            new CacheableResponsePlugin({
                statuses: [0, 200],
            }),
        ],
    })
)

// ===== Service Worker 生命周期事件 =====

// 安装事件
self.addEventListener('install', (_event) => {
    console.log('[SW] Installing...')
    // 跳过等待，立即激活
    self.skipWaiting()
})

// 激活事件
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating...')
    // 立即接管所有客户端
    event.waitUntil(self.clients.claim())
})

// ===== 消息处理 =====
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting()
    }

    // 处理缓存清理请求
    if (event.data && event.data.type === 'CLEAR_CACHE') {
        event.waitUntil(
            Promise.all([
                caches.delete(CACHE_NAMES.API),
                caches.delete(CACHE_NAMES.IMAGES),
                caches.delete(CACHE_NAMES.STATIC),
            ]).then(() => {
                event.ports[0]?.postMessage({ success: true })
            })
        )
    }
})

// ===== 后台同步支持 =====
// 注册后台同步（如果浏览器支持）
self.addEventListener('sync', (event: any) => {
    if (event.tag === 'sync-memories') {
        console.log('[SW] Background sync triggered: sync-memories')
        // 后台同步逻辑将通过主线程的 offlineStore 处理
        // 这里只是注册同步事件的触发点
        event.waitUntil(
            self.clients.matchAll().then((clients) => {
                clients.forEach((client) => {
                    client.postMessage({ type: 'SYNC_TRIGGERED' })
                })
            })
        )
    }
})

console.log('[SW] Service Worker loaded')
