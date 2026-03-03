import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useUserStore } from '@/stores'

export interface ThemePhase {
  id: string
  primary: string
  accent: string
  glow: string
  isDark: boolean
}

export const useTimeTheme = () => {
  const userStore = useUserStore()
  const currentPhase = ref<ThemePhase | null>(null)

  // 时光流动预设 (Auto)
  const timePhases: Record<string, ThemePhase> = {
    dawn: { id: 'dawn', primary: '#FFB7C5', accent: '#FF8C94', glow: 'rgba(255, 183, 197, 0.3)', isDark: false },
    morning: { id: 'morning', primary: '#FF8C42', accent: '#F97316', glow: 'rgba(255, 140, 66, 0.3)', isDark: false },
    afternoon: { id: 'afternoon', primary: '#F59E0B', accent: '#D97706', glow: 'rgba(245, 158, 11, 0.25)', isDark: false },
    dusk: { id: 'dusk', primary: '#8B5CF6', accent: '#7C3AED', glow: 'rgba(139, 92, 246, 0.3)', isDark: true },
    midnight: { id: 'midnight', primary: '#3B82F6', accent: '#2563EB', glow: 'rgba(59, 130, 246, 0.2)', isDark: true },
    stellar: { id: 'stellar', primary: '#6366F1', accent: '#4F46E5', glow: 'rgba(99, 102, 241, 0.15)', isDark: true },
  }

  // 手动亮色预设 (Manual Light)
  const lightPresets: Record<string, ThemePhase> = {
    default: { id: 'default', primary: '#FF8C42', accent: '#F97316', glow: 'rgba(255, 140, 66, 0.25)', isDark: false },
    sakura: { id: 'sakura', primary: '#FFB7C5', accent: '#FF8C94', glow: 'rgba(255, 183, 197, 0.3)', isDark: false },
    mint: { id: 'mint', primary: '#10B981', accent: '#059669', glow: 'rgba(16, 185, 129, 0.25)', isDark: false },
    ocean: { id: 'ocean', primary: '#0EA5E9', accent: '#0284C7', glow: 'rgba(14, 165, 233, 0.25)', isDark: false },
  }

  // 手动暗色预设 (Manual Dark)
  const darkPresets: Record<string, ThemePhase> = {
    default: { id: 'default', primary: '#3B82F6', accent: '#2563EB', glow: 'rgba(59, 130, 246, 0.2)', isDark: true },
    amethyst: { id: 'amethyst', primary: '#A855F7', accent: '#9333EA', glow: 'rgba(168, 85, 247, 0.2)', isDark: true },
    emerald: { id: 'emerald', primary: '#10B981', accent: '#059669', glow: 'rgba(16, 185, 129, 0.15)', isDark: true },
    crimson: { id: 'crimson', primary: '#EF4444', accent: '#DC2626', glow: 'rgba(239, 68, 68, 0.15)', isDark: true },
  }

  const applyColors = (phase: ThemePhase) => {
    currentPhase.value = phase
    const root = document.documentElement
    root.style.setProperty('--color-primary', phase.primary)
    root.style.setProperty('--color-accent', phase.accent)
    root.style.setProperty('--glow-dynamic', phase.glow)
    root.classList.toggle('dark', phase.isDark)
  }

  const updateTheme = () => {
    const mode = userStore.settings.theme // 'light' | 'dark' | 'system'(auto)
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
