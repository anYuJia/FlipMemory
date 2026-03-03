import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useUserStore } from '@/stores'

export interface ThemePhase {
  id: string
  primary: string
  accent: string
  glow: string
  isDark: boolean
  // 新增：完整的背景色系
  bgPrimary: string
  bgSecondary: string
  bgTertiary: string
  bgElevated: string
  textPrimary: string
  textSecondary: string
}

export const useTimeTheme = () => {
  const userStore = useUserStore()
  const currentPhase = ref<ThemePhase | null>(null)

  // 时光流动预设 (Auto)
  const timePhases: Record<string, ThemePhase> = {
    dawn: { id: 'dawn', primary: '#FFB7C5', accent: '#FF8C94', glow: 'rgba(255, 183, 197, 0.3)', isDark: false, bgPrimary: '#FFF5F7', bgSecondary: '#FEEAF0', bgTertiary: '#FDE0E9', bgElevated: '#FFFFFF', textPrimary: '#1A1D26', textSecondary: '#5C6478' },
    morning: { id: 'morning', primary: '#FF8C42', accent: '#F97316', glow: 'rgba(255, 140, 66, 0.3)', isDark: false, bgPrimary: '#F9F8F6', bgSecondary: '#F2F1EE', bgTertiary: '#EBEAE6', bgElevated: '#FFFFFF', textPrimary: '#1A1D26', textSecondary: '#5C6478' },
    afternoon: { id: 'afternoon', primary: '#F59E0B', accent: '#D97706', glow: 'rgba(245, 158, 11, 0.25)', isDark: false, bgPrimary: '#FDFBEB', bgSecondary: '#FBF7D5', bgTertiary: '#F9F2C1', bgElevated: '#FFFFFF', textPrimary: '#1A1D26', textSecondary: '#5C6478' },
    dusk: { id: 'dusk', primary: '#8B5CF6', accent: '#7C3AED', glow: 'rgba(139, 92, 246, 0.3)', isDark: true, bgPrimary: '#0F0A1F', bgSecondary: '#161129', bgTertiary: '#1D1833', bgElevated: '#241E3D', textPrimary: '#F5F5F7', textSecondary: 'rgba(255,255,255,0.7)' },
    midnight: { id: 'midnight', primary: '#3B82F6', accent: '#2563EB', glow: 'rgba(59, 130, 246, 0.2)', isDark: true, bgPrimary: '#08080C', bgSecondary: '#0F0F15', bgTertiary: '#161620', bgElevated: '#1C1C28', textPrimary: '#F5F5F7', textSecondary: 'rgba(255,255,255,0.7)' },
    stellar: { id: 'stellar', primary: '#6366F1', accent: '#4F46E5', glow: 'rgba(99, 102, 241, 0.15)', isDark: true, bgPrimary: '#050508', bgSecondary: '#0A0A0F', bgTertiary: '#101016', bgElevated: '#15151C', textPrimary: '#F5F5F7', textSecondary: 'rgba(255,255,255,0.7)' },
  }

  // 手动亮色预设 (Manual Light)
  const lightPresets: Record<string, ThemePhase> = {
    default: timePhases.morning,
    sakura: timePhases.dawn,
    mint: { id: 'mint', primary: '#10B981', accent: '#059669', glow: 'rgba(16, 185, 129, 0.25)', isDark: false, bgPrimary: '#F0FDF4', bgSecondary: '#DCFCE7', bgTertiary: '#BBF7D0', bgElevated: '#FFFFFF', textPrimary: '#064E3B', textSecondary: '#065F46' },
    ocean: { id: 'ocean', primary: '#0EA5E9', accent: '#0284C7', glow: 'rgba(14, 165, 233, 0.25)', isDark: false, bgPrimary: '#F0F9FF', bgSecondary: '#E0F2FE', bgTertiary: '#BAE6FD', bgElevated: '#FFFFFF', textPrimary: '#0C4A6E', textSecondary: '#075985' },
  }

  // 手动暗色预设 (Manual Dark)
  const darkPresets: Record<string, ThemePhase> = {
    default: timePhases.midnight,
    amethyst: timePhases.dusk,
    emerald: { id: 'emerald', primary: '#10B981', accent: '#059669', glow: 'rgba(16, 185, 129, 0.15)', isDark: true, bgPrimary: '#05100F', bgSecondary: '#0A1A1E', bgTertiary: '#102528', bgElevated: '#153032', textPrimary: '#F5F5F7', textSecondary: 'rgba(255,255,255,0.7)' },
    crimson: { id: 'crimson', primary: '#EF4444', accent: '#DC2626', glow: 'rgba(239, 68, 68, 0.15)', isDark: true, bgPrimary: '#100505', bgSecondary: '#1A0A0A', bgTertiary: '#251010', bgElevated: '#301515', textPrimary: '#F5F5F7', textSecondary: 'rgba(255,255,255,0.7)' },
  }

  const applyColors = (phase: ThemePhase) => {
    currentPhase.value = phase
    const root = document.documentElement
    
    // 注入全量色彩变量
    root.style.setProperty('--color-primary', phase.primary)
    root.style.setProperty('--color-accent', phase.accent)
    root.style.setProperty('--glow-dynamic', phase.glow)
    root.style.setProperty('--bg-primary', phase.bgPrimary)
    root.style.setProperty('--bg-secondary', phase.bgSecondary)
    root.style.setProperty('--bg-tertiary', phase.bgTertiary)
    root.style.setProperty('--bg-elevated', phase.bgElevated)
    root.style.setProperty('--text-primary', phase.textPrimary)
    root.style.setProperty('--text-secondary', phase.textSecondary)
    
    // 材质变量联动
    if (phase.isDark) {
      root.style.setProperty('--card-bg', 'rgba(25, 25, 35, 0.75)')
      root.style.setProperty('--card-border', 'rgba(255, 255, 255, 0.08)')
      root.style.setProperty('--border-primary', 'rgba(255, 255, 255, 0.1)')
    } else {
      root.style.setProperty('--card-bg', 'rgba(255, 255, 255, 0.6)')
      root.style.setProperty('--card-border', 'rgba(255, 255, 255, 0.8)')
      root.style.setProperty('--border-primary', 'rgba(0, 0, 0, 0.05)')
    }

    root.classList.toggle('dark', phase.isDark)
  }

  const updateTheme = () => {
    const mode = userStore.settings.theme
    const colorKey = userStore.themeColor

    if (mode === 'system') {
      const hour = new Date().getHours()
      let phaseId = 'morning'
      if (hour >= 5 && hour < 8) phaseId = 'dawn'
      else if (hour >= 8 && hour < 11) phaseId = 'morning'
      else if (hour >= 11 && hour < 16) phaseId = 'afternoon'
      else if (hour >= 16 && hour < 19) phaseId = 'dusk'
      else if (hour >= 19 && hour < 23) phaseId = 'midnight'
      else phaseId = 'stellar'
      applyColors(timePhases[phaseId])
    } else if (mode === 'light') {
      applyColors(lightPresets[colorKey] || lightPresets.default)
    } else {
      applyColors(darkPresets[colorKey] || darkPresets.default)
    }
  }

  let timer: number
  onMounted(() => {
    updateTheme()
    timer = window.setInterval(updateTheme, 60000)
  })

  watch(() => [userStore.settings.theme, userStore.themeColor], updateTheme, { deep: true })

  onUnmounted(() => clearInterval(timer))

  return { currentPhase }
}
