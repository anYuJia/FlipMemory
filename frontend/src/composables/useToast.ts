import { ref } from 'vue'

export interface Toast {
    id: number
    type: 'success' | 'error' | 'warning' | 'info'
    message: string
    duration?: number
}

const MAX_TOASTS = 5
const toasts = ref<Toast[]>([])
const timerMap = new Map<number, ReturnType<typeof setTimeout>>()
let toastId = 0

const show = (type: Toast['type'], message: string, duration = 3000) => {
    const id = ++toastId
    toasts.value.push({ id, type, message, duration })

    // 超过上限时移除最旧的 toast
    while (toasts.value.length > MAX_TOASTS) {
        const oldest = toasts.value[0]
        if (oldest) remove(oldest.id)
    }

    if (duration > 0) {
        const timer = setTimeout(() => {
            remove(id)
        }, duration)
        timerMap.set(id, timer)
    }

    return id
}

const remove = (id: number) => {
    const timer = timerMap.get(id)
    if (timer) {
        clearTimeout(timer)
        timerMap.delete(id)
    }
    const index = toasts.value.findIndex(t => t.id === id)
    if (index > -1) {
        toasts.value.splice(index, 1)
    }
}

/** 清除所有 toast 及其定时器 */
const clearAll = () => {
    for (const timer of timerMap.values()) {
        clearTimeout(timer)
    }
    timerMap.clear()
    toasts.value = []
}

export const useToast = () => {
    return {
        toasts,
        show,
        remove,
        clearAll,
        success: (message: string, duration?: number) => show('success', message, duration),
        error: (message: string, duration?: number) => show('error', message, duration),
        warning: (message: string, duration?: number) => show('warning', message, duration),
        info: (message: string, duration?: number) => show('info', message, duration),
    }
}
