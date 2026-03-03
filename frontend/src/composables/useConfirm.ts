/**
 * 确认对话框 Composable
 */

import { ref, shallowRef } from 'vue'

export interface ConfirmOptions {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: 'danger' | 'warning' | 'info'
}

// 全局状态
const isOpen = ref(false)
const options = ref<ConfirmOptions>({
  title: '',
  message: '',
  confirmText: '确定',
  cancelText: '取消',
  type: 'info',
})

let resolvePromise: ((value: boolean) => void) | null = null

/**
 * 打开确认对话框
 */
export function confirm(opts: ConfirmOptions): Promise<boolean> {
  options.value = {
    confirmText: '确定',
    cancelText: '取消',
    type: 'info',
    ...opts,
  }
  isOpen.value = true

  return new Promise((resolve) => {
    resolvePromise = resolve
  })
}

/**
 * 确认操作
 */
export function handleConfirm() {
  isOpen.value = false
  resolvePromise?.(true)
  resolvePromise = null
}

/**
 * 取消操作
 */
export function handleCancel() {
  isOpen.value = false
  resolvePromise?.(false)
  resolvePromise = null
}

/**
 * 使用确认对话框
 */
export function useConfirm() {
  return {
    isOpen,
    options,
    confirm,
    handleConfirm,
    handleCancel,
  }
}

// 便捷方法
export const confirmDelete = (itemName: string = '此项') =>
  confirm({
    title: '确认删除',
    message: `确定要删除${itemName}吗？此操作无法撤销。`,
    confirmText: '删除',
    cancelText: '取消',
    type: 'danger',
  })

export const confirmLogout = () =>
  confirm({
    title: '确认退出',
    message: '确定要退出登录吗？',
    confirmText: '退出',
    cancelText: '取消',
    type: 'warning',
  })

export const confirmDiscard = () =>
  confirm({
    title: '放弃更改',
    message: '你有未保存的更改，确定要放弃吗？',
    confirmText: '放弃',
    cancelText: '继续编辑',
    type: 'warning',
  })
