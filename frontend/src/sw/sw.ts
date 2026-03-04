/// <reference lib="webworker" />
/**
 * FlipMemory Service Worker
 * 处理离线缓存和后台同步
 */
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { registerRoute, NavigationRoute } from 'workbox-routing'
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies'
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
// 使用 NetworkFirst 策略：优先网络，网络失败时使用缓存
registerRoute(
    ({ url }) => url.pathname.startsWith('/api/'),
    new NetworkFirst({
        cacheName: CACHE_NAMES.API,
        networkTimeoutSeconds: 10, // 10秒超时后使用缓存
        plugins: [
            new CacheableResponsePlugin({
                statuses: [0, 200],
            }),
            new ExpirationPlugin({
                maxEntries: 100,
                maxAgeSeconds: 7 * 24 * 60 * 60, // 7 天
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

// ===== 静态资源缓存策略 (JS/CSS/Fonts) =====
registerRoute(
    ({ request, url }) => {
        return request.destination === 'script' ||
            request.destination === 'style' ||
            request.destination === 'font' ||
            url.pathname.match(/\.(js|css|woff2?|ttf|eot)$/i)
    },
    new CacheFirst({ // 静态代码和字体使用 CacheFirst，因为它们通常带有哈希后缀
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
// SPA 应用的导航请求都返回 index.html
const navigationHandler = async () => {
    const cache = await caches.open('navigation-cache')
    const cachedResponse = await cache.match('/index.html')

    if (cachedResponse) {
        return cachedResponse
    }

    try {
        const response = await fetch('/index.html')
        if (response.ok) {
            cache.put('/index.html', response.clone())
        }
        return response
    } catch {
        // 如果网络请求失败且没有缓存，返回一个基本的离线页面
        return new Response(
            `<!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>FlipMemory - 离线</title>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex; 
              justify-content: center; 
              align-items: center; 
              min-height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #fef3e2, #fde6d3);
              color: #333;
            }
            .container { 
              text-align: center; 
              padding: 2rem;
            }
            h1 { 
              font-size: 3rem; 
              margin-bottom: 1rem;
            }
            p { 
              color: #666; 
              margin-bottom: 2rem;
            }
            button {
              padding: 12px 24px;
              font-size: 1rem;
              background: linear-gradient(135deg, #fb923c, #f97316);
              color: white;
              border: none;
              border-radius: 12px;
              cursor: pointer;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🎴</h1>
            <h2>FlipMemory</h2>
            <p>当前处于离线状态，请检查网络连接</p>
            <button onclick="location.reload()">重试</button>
          </div>
        </body>
      </html>`,
            {
                headers: { 'Content-Type': 'text/html' },
            }
        )
    }
}

// 注册导航路由
const navigationRoute = new NavigationRoute(navigationHandler, {
    // 排除 API 请求
    denylist: [/^\/api\//],
})
registerRoute(navigationRoute)

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
