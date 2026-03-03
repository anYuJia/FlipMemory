import { ref, onMounted, onUnmounted } from 'vue'

export interface ThemePhase {
  id: string
  start: number
  end: number
  primary: string
  accent: string
  glow: string
  isDark: boolean
}

export const useTimeTheme = () => {
  const currentPhase = ref<ThemePhase | null>(null)

  const phases: ThemePhase[] = [
    { id: 'dawn', start: 5, end: 8, primary: '#FFB7C5', accent: '#FF8C94', glow: 'rgba(255, 183, 197, 0.3)', isDark: false },
    { id: 'morning', start: 8, end: 11, primary: '#FF8C42', accent: '#F97316', glow: 'rgba(255, 140, 66, 0.3)', isDark: false },
    { id: 'afternoon', start: 11, end: 16, primary: '#F59E0B', accent: '#D97706', glow: 'rgba(245, 158, 11, 0.25)', isDark: false },
    { id: 'dusk', start: 16, end: 19, primary: '#8B5CF6', accent: '#7C3AED', glow: 'rgba(139, 92, 246, 0.3)', isDark: true },
    { id: 'midnight', start: 19, end: 23, primary: '#3B82F6', accent: '#2563EB', glow: 'rgba(59, 130, 246, 0.2)', isDark: true },
    { id: 'stellar', start: 23, end: 5, primary: '#6366F1', accent: '#4F46E5', glow: 'rgba(99, 102, 241, 0.15)', isDark: true },
  ]

  const updateTheme = () => {
    const hour = new Date().getHours()
    const phase = phases.find(p => {
      if (p.start < p.end) return hour >= p.start && hour < p.end
      return hour >= p.start || hour < p.end // 处理跨零点 (23 - 5)
    }) || phases[1]

    currentPhase.value = phase
    
    // 注入动态变量
    const root = document.documentElement
    root.style.setProperty('--color-primary', phase.primary)
    root.style.setProperty('--color-accent', phase.accent)
    root.style.setProperty('--glow-dynamic', phase.glow)
    
    // 自动切换暗色模式（如果用户设置为 system）
    const userTheme = localStorage.getItem('userSettings') ? JSON.parse(localStorage.getItem('userSettings')!).theme : 'system'
    if (userTheme === 'system') {
      root.classList.toggle('dark', phase.isDark)
    }
  }

  let timer: number
  onMounted(() => {
    updateTheme()
    // 每分钟检查一次
    timer = window.setInterval(updateTheme, 60000)
  })

  onUnmounted(() => {
    clearInterval(timer)
  })

  return { currentPhase }
}
