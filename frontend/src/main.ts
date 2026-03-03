import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import i18n from './i18n'
import './style.css'

// Capacitor 插件导入
import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import { Keyboard } from '@capacitor/keyboard'
import { SplashScreen } from '@capacitor/splash-screen'

// 性能监控和日志
import { performanceMonitor } from './services/performanceMonitor'
import { logger, LogLevel } from './services/logger'

// 生产环境设置日志级别为 WARN
if (import.meta.env.PROD) {
    logger.setMinLevel(LogLevel.WARN)
}

const app = createApp(App)

// 国际化
app.use(i18n)

// 状态管理
const pinia = createPinia()
app.use(pinia)

// 路由
app.use(router)

// 初始化用户设置
import { useUserStore } from './stores'
const userStore = useUserStore(pinia)
userStore.init()

// 初始化性能监控
performanceMonitor.init()

// Capacitor 原生功能初始化
async function initCapacitor() {
    if (!Capacitor.isNativePlatform()) {
        logger.info('Running in web mode', 'Capacitor')
        return
    }

    const platform = Capacitor.getPlatform()
    logger.info(`Running on ${platform}`, 'Capacitor')

    // 添加平台类名到 html 元素，用于 CSS 特定样式
    document.documentElement.classList.add(`platform-${platform}`)

    try {
        // 初始化状态栏
        if (Capacitor.isPluginAvailable('StatusBar')) {
            await StatusBar.setStyle({ style: Style.Light })
            await StatusBar.setBackgroundColor({ color: '#f97316' })
            await StatusBar.setOverlaysWebView({ overlay: false })
        }

        // 初始化键盘
        if (Capacitor.isPluginAvailable('Keyboard')) {
            Keyboard.addListener('keyboardWillShow', () => {
                document.body.classList.add('keyboard-visible')
            })
            Keyboard.addListener('keyboardWillHide', () => {
                document.body.classList.remove('keyboard-visible')
            })
        }

        // 隐藏启动画面
        if (Capacitor.isPluginAvailable('SplashScreen')) {
            await SplashScreen.hide({ fadeOutDuration: 300 })
        }
    } catch (error) {
        logger.error('Capacitor initialization error', 'Capacitor', error)
    }
}

// 应用挂载后初始化 Capacitor
app.mount('#app')
initCapacitor()
