/**
 * 响应式设计 Composable
 */

import { ref, onMounted, onUnmounted } from 'vue'

export type ScreenSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'

export interface BreakPoints {
    xs: number
    sm: number
    md: number
    lg: number
    xl: number
    '2xl': number
}

const defaultBreakPoints: BreakPoints = {
    xs: 0,
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    '2xl': 1536,
}

/**
 * 使用响应式屏幕大小
 */
export function useResponsive(breakPoints: Partial<BreakPoints> = {}) {
    const bp = { ...defaultBreakPoints, ...breakPoints }

    const screenSize = ref<ScreenSize>('md')
    const width = ref(typeof window !== 'undefined' ? window.innerWidth : 0)
    const height = ref(typeof window !== 'undefined' ? window.innerHeight : 0)

    const isXs = ref(false)
    const isSm = ref(false)
    const isMd = ref(false)
    const isLg = ref(false)
    const isXl = ref(false)
    const is2xl = ref(false)

    const isMobile = ref(false)
    const isTablet = ref(false)
    const isDesktop = ref(false)

    function updateSize() {
        if (typeof window === 'undefined') return

        width.value = window.innerWidth
        height.value = window.innerHeight

        // 更新屏幕大小
        if (width.value < bp.sm) {
            screenSize.value = 'xs'
        } else if (width.value < bp.md) {
            screenSize.value = 'sm'
        } else if (width.value < bp.lg) {
            screenSize.value = 'md'
        } else if (width.value < bp.xl) {
            screenSize.value = 'lg'
        } else if (width.value < bp['2xl']) {
            screenSize.value = 'xl'
        } else {
            screenSize.value = '2xl'
        }

        // 更新布尔值
        isXs.value = width.value < bp.sm
        isSm.value = width.value >= bp.sm && width.value < bp.md
        isMd.value = width.value >= bp.md && width.value < bp.lg
        isLg.value = width.value >= bp.lg && width.value < bp.xl
        isXl.value = width.value >= bp.xl && width.value < bp['2xl']
        is2xl.value = width.value >= bp['2xl']

        // 更新设备类型
        isMobile.value = width.value < bp.md
        isTablet.value = width.value >= bp.md && width.value < bp.lg
        isDesktop.value = width.value >= bp.lg
    }

    onMounted(() => {
        updateSize()
        window.addEventListener('resize', updateSize)
    })

    onUnmounted(() => {
        window.removeEventListener('resize', updateSize)
    })

    return {
        screenSize,
        width,
        height,
        isXs,
        isSm,
        isMd,
        isLg,
        isXl,
        is2xl,
        isMobile,
        isTablet,
        isDesktop,
    }
}

/**
 * 使用媒体查询
 */
export function useMediaQuery(query: string): Ref<boolean> {
    const matches = ref(false)

    onMounted(() => {
        const mediaQuery = window.matchMedia(query)
        matches.value = mediaQuery.matches

        const handler = (e: MediaQueryListEvent) => {
            matches.value = e.matches
        }

        mediaQuery.addEventListener('change', handler)

        onUnmounted(() => {
            mediaQuery.removeEventListener('change', handler)
        })
    })

    return matches
}

/**
 * 使用方向（横屏/竖屏）
 */
export function useOrientation() {
    const isPortrait = ref(true)
    const isLandscape = ref(false)

    function updateOrientation() {
        if (typeof window === 'undefined') return

        isPortrait.value = window.innerHeight > window.innerWidth
        isLandscape.value = window.innerHeight <= window.innerWidth
    }

    onMounted(() => {
        updateOrientation()
        window.addEventListener('orientationchange', updateOrientation)
        window.addEventListener('resize', updateOrientation)
    })

    onUnmounted(() => {
        window.removeEventListener('orientationchange', updateOrientation)
        window.removeEventListener('resize', updateOrientation)
    })

    return {
        isPortrait,
        isLandscape,
    }
}

import type { Ref } from 'vue'
