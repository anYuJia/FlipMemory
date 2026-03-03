import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useUserStore } from '@/stores'

export interface ThemePalette {
  id: string
  name: string
  primary: string
  accent: string
  bg: string
  isDark: boolean // 关键：决定系统是进入 Dark 模式还是 Light 模式
}

export const useTimeTheme = () => {
  const userStore = useUserStore()
  const currentPalette = ref<ThemePalette | null>(null)

  // 1. 时光流转自动序列 (Auto Phases)
  const timePhases: Record<string, ThemePalette> = {
    dawn: { id: 'dawn', name: '黎明', primary: '#FFB7C5', accent: '#FF8C94', bg: '#FDF2F4', isDark: false },
    morning: { id: 'morning', name: '上午', primary: '#FF8C42', accent: '#F97316', bg: '#F9F8F6', isDark: false },
    afternoon: { id: 'afternoon', name: '正午', primary: '#F59E0B', accent: '#D97706', bg: '#FDFBEB', isDark: false },
    dusk: { id: 'dusk', name: '黄昏', primary: '#A855F7', accent: '#7C3AED', bg: '#0F0A1F', isDark: true },
    midnight: { id: 'midnight', name: '深夜', primary: '#3B82F6', accent: '#2563EB', bg: '#08080C', isDark: true },
    stellar: { id: 'stellar', name: '星空', primary: '#6366F1', accent: '#4F46E5', bg: '#050508', isDark: true },
  }

  // 2. 预设调色盘库 (User Selectable)
  const allPalettes: ThemePalette[] = [
    // 浅色基调
    { id: 'oatmeal', name: '燕麦', primary: '#FF8C42', accent: '#F97316', bg: '#F9F8F6', isDark: false },
    { id: 'sakura', name: '樱花', primary: '#FFB7C5', accent: '#FF8C94', bg: '#FFF5F7', isDark: false },
    { id: 'mint', name: '薄荷', primary: '#10B981', accent: '#059669', bg: '#F0FDF4', isDark: false },
    { id: 'glacier', name: '冰川', primary: '#0EA5E9', accent: '#0284C7', bg: '#F0F9FF', isDark: false },
    // 深色基调
    { id: 'obsidian', name: '极夜', primary: '#3B82F6', accent: '#2563EB', bg: '#08080C', isDark: true },
    { id: 'nebula', name: '星云', primary: '#A855F7', accent: '#9333EA', bg: '#0F0A1F', isDark: true },
    { id: 'forest', name: '森海', primary: '#10B981', accent: '#059669', bg: '#05100F', isDark: true },
    { id: 'ember', name: '余烬', primary: '#EF4444', accent: '#DC2626', bg: '#100505', isDark: true },
  ]

  const applyPalette = (p: ThemePalette) => {
    currentPalette.value = p
    const root = document.documentElement
    
    // 注入核心变量
    root.style.setProperty('--color-primary', p.primary)
    root.style.setProperty('--color-accent', p.accent)
    root.style.setProperty('--bg-primary', p.bg)
    
    // 根据调色盘亮度自动决定系统模式
    root.classList.toggle('dark', p.isDark)
    
    // 派生变量计算
    if (p.isDark) {
      root.style.setProperty('--text-primary', '#F5F5F7')
      root.style.setProperty('--text-secondary', 'rgba(255,255,255,0.7)')
      root.style.setProperty('--card-bg', 'rgba(255,255,255,0.05)')
      root.style.setProperty('--card-border', 'rgba(255,255,255,0.08)')
      root.style.setProperty('--glow-dynamic', `${p.primary}20`) // 20是透明度
    } else {
      root.style.setProperty('--text-primary', '#1A1D26')
      root.style.setProperty('--text-secondary', '#5C6478')
      root.style.setProperty('--card-bg', 'rgba(255,255,255,0.6)')
      root.style.setProperty('--card-border', 'rgba(255,255,255,0.8)')
      root.style.setProperty('--glow-dynamic', `${p.primary}40`)
    }
  }

  const update = () => {
    const colorId = userStore.themeColor // 'auto' 或者 具体的 id
    
    if (colorId === 'auto') {
      const hour = new Date().getHours()
      let phase = 'morning'
      if (hour >= 5 && hour < 8) phase = 'dawn'
      else if (hour >= 8 && hour < 11) phase = 'morning'
      else if (hour >= 11 && hour < 16) phase = 'afternoon'
      else if (hour >= 16 && hour < 19) phase = 'dusk'
      else if (hour >= 19 && hour < 23) phase = 'midnight'
      else phase = 'stellar'
      applyPalette(timePhases[phase])
    } else {
      const palette = allPalettes.find(p => p.id === colorId) || allPalettes[0]
      applyPalette(palette)
    }
  }

  let timer: number
  onMounted(() => {
    update()
    timer = window.setInterval(update, 60000)
  })

  watch(() => userStore.themeColor, update)
  onUnmounted(() => clearInterval(timer))

  return { currentPalette, allPalettes }
}
