/**
 * 图片懒加载 Composable
 */

import { ref, onMounted, onUnmounted } from 'vue'

export interface LazyImageOptions {
    threshold?: number
    rootMargin?: string
}

/**
 * 使用 Intersection Observer 实现图片懒加载
 */
export function useLazyImage(options: LazyImageOptions = {}) {
    const {
        threshold = 0.1,
        rootMargin = '50px',
    } = options

    const imageRef = ref<HTMLImageElement | null>(null)
    const isLoaded = ref(false)
    const isError = ref(false)

    let observer: IntersectionObserver | null = null

    onMounted(() => {
        if (!imageRef.value) return

        observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const img = entry.target as HTMLImageElement
                        const src = img.dataset.src

                        if (src) {
                            img.src = src
                            img.onload = () => {
                                isLoaded.value = true
                                img.classList.add('loaded')
                            }
                            img.onerror = () => {
                                isError.value = true
                                img.classList.add('error')
                            }
                            observer?.unobserve(img)
                        }
                    }
                })
            },
            {
                threshold,
                rootMargin,
            }
        )

        observer.observe(imageRef.value)
    })

    onUnmounted(() => {
        if (observer && imageRef.value) {
            observer.unobserve(imageRef.value)
            observer.disconnect()
        }
    })

    return {
        imageRef,
        isLoaded,
        isError,
    }
}

/**
 * 预加载图片
 */
export function preloadImage(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve()
        img.onerror = () => reject(new Error(`Failed to preload image: ${src}`))
        img.src = src
    })
}

/**
 * 批量预加载图片
 */
export async function preloadImages(srcs: string[]): Promise<void> {
    await Promise.all(srcs.map(src => preloadImage(src).catch(() => {
        // 忽略单个图片加载失败
    })))
}

/**
 * 获取图片的自然尺寸
 */
export function getImageDimensions(src: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => {
            resolve({ width: img.width, height: img.height })
        }
        img.onerror = () => {
            reject(new Error(`Failed to load image: ${src}`))
        }
        img.src = src
    })
}

/**
 * 计算图片的宽高比
 */
export function getImageAspectRatio(width: number, height: number): number {
    return width / height
}

/**
 * 根据容器宽度计算图片高度
 */
export function calculateImageHeight(
    containerWidth: number,
    imageWidth: number,
    imageHeight: number
): number {
    const aspectRatio = getImageAspectRatio(imageWidth, imageHeight)
    return containerWidth / aspectRatio
}
