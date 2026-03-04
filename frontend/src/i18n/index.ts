import { createI18n } from 'vue-i18n'
import en from '../locales/en.json'
import zhCN from '../locales/zh-CN.json'
import zhTW from '../locales/zh-TW.json'
import ja from '../locales/ja.json'

// 获取浏览器默认语言
const getBrowserLocale = () => {
  const locale = navigator.language || (navigator as any).userLanguage
  if (locale.startsWith('zh-TW') || locale.startsWith('zh-HK')) return 'zh-TW'
  if (locale.startsWith('zh')) return 'zh-CN'
  if (locale.startsWith('ja')) return 'ja'
  return 'en'
}

const i18n = createI18n({
  legacy: false, // 使用 Composition API
  locale: localStorage.getItem('locale') || getBrowserLocale(),
  fallbackLocale: 'en',
  messages: {
    'en': en,
    'zh-CN': zhCN,
    'zh-TW': zhTW,
    'ja': ja
  }
})

export default i18n
