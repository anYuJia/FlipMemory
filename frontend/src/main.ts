import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import i18n from './i18n'
import './style.css'

// 性能监控与错误追踪
import { performanceMonitor } from './services/performanceMonitor'
import { initSentry } from './services/sentry'
import { logger, LogLevel } from './services/logger'

// Capacitor 插件
import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import { Keyboard } from '@capacitor/keyboard'
import { SplashScreen } from '@capacitor/splash-screen'
import { App as CapApp } from '@capacitor/app'

// 生产环境设置日志级别
if (import.meta.env.PROD) {
    logger.setMinLevel(LogLevel.WARN)
}

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(i18n)

// 初始化 Sentry (Task 2)
initSentry(app, router)

// 初始化性能监控 (Task 1)
performanceMonitor.init()

// 初始化用户设置
import { useUserStore } from './stores'
const userStore = useUserStore(pinia)
userStore.init()

// Capacitor 原生适配逻辑
async function initCapacitor() {
    if (!Capacitor.isNativePlatform()) return

    const platform = Capacitor.getPlatform()
    document.documentElement.classList.add(`platform-${platform}`)

    try {
        // 状态栏初始化
        if (Capacitor.isPluginAvailable('StatusBar')) {
            // 注意：具体颜色会在 useTimeTheme 中动态改变
            await StatusBar.setStyle({ style: Style.Light })
        }

        // 键盘监听
        if (Capacitor.isPluginAvailable('Keyboard')) {
            Keyboard.addListener('keyboardWillShow', () => document.body.classList.add('keyboard-visible'))
            Keyboard.addListener('keyboardWillHide', () => document.body.classList.remove('keyboard-visible'))
        }

        // 启动图处理
        if (Capacitor.isPluginAvailable('SplashScreen')) {
            setTimeout(() => {
                SplashScreen.hide({ fadeOutDuration: 400 })
            }, 1000)
        }

        // 硬件返回键
        CapApp.addListener('backButton', () => {
            const currentName = router.currentRoute.value.name
            if (currentName === 'home' || currentName === 'auth') {
                CapApp.minimizeApp()
            } else {
                router.back()
            }
        })
    } catch (err) {
        logger.error('Capacitor init failed', 'Main', err)
    }
}

app.mount('#app')
initCapacitor()
