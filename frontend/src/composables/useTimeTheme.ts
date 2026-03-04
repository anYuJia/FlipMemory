import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useUserStore } from '@/stores'
import { StatusBar, Style } from '@capacitor/status-bar'
import { Capacitor } from '@capacitor/core'

export interface ThemePalette {
  id: string
  name: string
  primary: string
  accent: string
  bg: string
  isDark: boolean
}

// 亮度检测算法：判断 hex 颜色是否属于深色
const isColorDark = (hex: string): boolean => {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  // 使用感知亮度公式
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance < 0.5
}

export const useTimeTheme = () => {
  const userStore = useUserStore()
  const currentPalette = ref<ThemePalette | null>(null)

  type PhaseKey = 'dawn' | 'morning' | 'afternoon' | 'dusk' | 'midnight' | 'stellar'
  const timePhases: Record<PhaseKey, ThemePalette> = {
    dawn: { id: 'dawn', name: '黎明', primary: '#FFB7C5', accent: '#FF8C94', bg: '#FDF2F4', isDark: false },
    morning: { id: 'morning', name: '上午', primary: '#FF8C42', accent: '#F97316', bg: '#F9F8F6', isDark: false },
    afternoon: { id: 'afternoon', name: '正午', primary: '#F59E0B', accent: '#D97706', bg: '#FDFBEB', isDark: false },
    dusk: { id: 'dusk', name: '黄昏', primary: '#A855F7', accent: '#7C3AED', bg: '#0F0A1F', isDark: true },
    midnight: { id: 'midnight', name: '深夜', primary: '#3B82F6', accent: '#2563EB', bg: '#08080C', isDark: true },
    stellar: { id: 'stellar', name: '星空', primary: '#6366F1', accent: '#4F46E5', bg: '#050508', isDark: true },
  }

  const allPalettes: ThemePalette[] = [
    { id: 'oatmeal', name: '燕麦', primary: '#FF8C42', accent: '#F97316', bg: '#F9F8F6', isDark: false },
    { id: 'sakura', name: '樱花', primary: '#FFB7C5', accent: '#FF8C94', bg: '#FFF5F7', isDark: false },
    { id: 'mint', name: '薄荷', primary: '#10B981', accent: '#059669', bg: '#F0FDF4', isDark: false },
    { id: 'glacier', name: '冰川', primary: '#0EA5E9', accent: '#0284C7', bg: '#F0F9FF', isDark: false },
    { id: 'obsidian', name: '极夜', primary: '#3B82F6', accent: '#2563EB', bg: '#08080C', isDark: true },
    { id: 'nebula', name: '星云', primary: '#A855F7', accent: '#9333EA', bg: '#0F0A1F', isDark: true },
    { id: 'forest', name: '森海', primary: '#10B981', accent: '#059669', bg: '#05100F', isDark: true },
    { id: 'ember', name: '余烬', primary: '#EF4444', accent: '#DC2626', bg: '#100505', isDark: true },
  ]

  const applyPalette = (p: ThemePalette) => {
    currentPalette.value = p
    const root = document.documentElement
    
    // 设置核心 CSS 变量
    root.style.setProperty('--color-primary', p.primary)
    root.style.setProperty('--color-accent', p.accent)
    
    /**
     * 核心增强：背景色彩渗透 (Color Infusion)
     * 使用 color-mix 将 5%~10% 的主色混入底色，使背景不再是死板的单色，而是带有主色调的质感。
     */
    root.style.setProperty('--bg-primary', `color-mix(in srgb, ${p.bg}, ${p.primary} 8%)`)
    
    // 核心：基于亮度自适应系统模式
    const isDark = p.isDark
    root.classList.toggle('dark', isDark)
    
    // ===== Capacitor 状态栏动态适配 =====
    if (Capacitor.isNativePlatform()) {
      // 延迟或包装在 try-catch 中以防初始化竞争
      setTimeout(() => {
        try {
          StatusBar.setStyle({
            style: isDark ? Style.Dark : Style.Light
          }).catch(e => console.warn('StatusBar.setStyle error', e))
          
          StatusBar.setOverlaysWebView({ overlay: true })
            .catch(e => console.warn('StatusBar.setOverlaysWebView error', e))
        } catch (err) {
          console.warn('Capacitor StatusBar control failed gracefully', err)
        }
      }, 100)
    }
    
    if (isDark) {
      root.style.setProperty('--text-primary', '#F5F5F7')
      root.style.setProperty('--text-secondary', 'rgba(255,255,255,0.7)')
      // 深色模式下，卡片背景也渗入一点主色
      root.style.setProperty('--card-bg', `color-mix(in srgb, rgba(25, 25, 35, 0.75), ${p.primary} 5%)`)
      root.style.setProperty('--card-border', 'rgba(255, 255, 255, 0.08)')
      root.style.setProperty('--border-primary', 'rgba(255, 255, 255, 0.1)')
      root.style.setProperty('--glow-dynamic', `${p.primary}20`)
    } else {
      root.style.setProperty('--text-primary', '#1A1D26')
      root.style.setProperty('--text-secondary', '#5C6478')
      // 浅色模式下，卡片背景保持纯净或极微量混合
      root.style.setProperty('--card-bg', 'rgba(255, 255, 255, 0.65)')
      root.style.setProperty('--card-border', 'rgba(255, 255, 255, 0.8)')
      root.style.setProperty('--border-primary', 'rgba(0, 0, 0, 0.05)')
      root.style.setProperty('--glow-dynamic', `${p.primary}40`)
    }
  }

  const update = () => {
    const colorId = userStore.themeColor
    
    if (colorId === 'auto') {
      const hour = new Date().getHours()
      let phase: PhaseKey = 'morning'
      if (hour >= 5 && hour < 8) phase = 'dawn'
      else if (hour >= 8 && hour < 11) phase = 'morning'
      else if (hour >= 11 && hour < 16) phase = 'afternoon'
      else if (hour >= 16 && hour < 19) phase = 'dusk'
      else if (hour >= 19 && hour < 23) phase = 'midnight'
      else phase = 'stellar'
      applyPalette(timePhases[phase])
    } else if (colorId === 'custom') {
      // 处理自定义调色盘 - 使用 store 中的响应式数据
      const { primary, bg } = userStore.customColors
      applyPalette({
        id: 'custom',
        name: '自定义',
        primary: primary,
        accent: primary, 
        bg: bg,
        isDark: isColorDark(bg)
      })
    } else {
      const fallback = allPalettes[0]
      const palette = allPalettes.find(p => p.id === colorId)
      if (palette) {
        applyPalette(palette)
      } else if (fallback) {
        applyPalette(fallback)
      }
    }
  }

  let timer: number
  onMounted(() => {
    update()
    timer = window.setInterval(update, 60000)
  })

  watch(() => [userStore.themeColor, userStore.customColors], update, { deep: true })
  onUnmounted(() => clearInterval(timer))

  return { currentPalette, allPalettes }
}
