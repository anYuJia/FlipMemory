import { ref } from 'vue'

export interface Toast {
    id: number
    type: 'success' | 'error' | 'warning' | 'info'
    message: string
    duration?: number
}

const toasts = ref<Toast[]>([])
let toastId = 0

const show = (type: Toast['type'], message: string, duration = 3000) => {
    const id = ++toastId
    toasts.value.push({ id, type, message, duration })

    if (duration > 0) {
        setTimeout(() => {
            remove(id)
        }, duration)
    }

    return id
}

const remove = (id: number) => {
    const index = toasts.value.findIndex(t => t.id === id)
    if (index > -1) {
        toasts.value.splice(index, 1)
    }
}

export const useToast = () => {
    return {
        toasts,
        show,
        remove,
        success: (message: string, duration?: number) => show('success', message, duration),
        error: (message: string, duration?: number) => show('error', message, duration),
        warning: (message: string, duration?: number) => show('warning', message, duration),
        info: (message: string, duration?: number) => show('info', message, duration),
    }
}
