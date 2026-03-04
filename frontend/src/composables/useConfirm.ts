/**
 * 确认对话框 Composable
 */

import { ref } from 'vue'
import i18n from '@/i18n'

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
  confirmText: i18n.global.t('common.confirm'),
  cancelText: i18n.global.t('common.cancel'),
  type: 'info',
})

let resolvePromise: ((value: boolean) => void) | null = null

/**
 * 打开确认对话框
 */
export function confirm(opts: ConfirmOptions): Promise<boolean> {
  options.value = {
    confirmText: i18n.global.t('common.confirm'),
    cancelText: i18n.global.t('common.cancel'),
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
export const confirmDelete = (itemName: string = 'item') =>
  confirm({
    title: i18n.global.t('confirm.delete_title'),
    message: i18n.global.t('confirm.delete_message', { itemName }),
    confirmText: i18n.global.t('common.delete'),
    cancelText: i18n.global.t('common.cancel'),
    type: 'danger',
  })

export const confirmLogout = () =>
  confirm({
    title: i18n.global.t('confirm.logout_title'),
    message: i18n.global.t('confirm.logout_message'),
    confirmText: i18n.global.t('settings.logout'),
    cancelText: i18n.global.t('common.cancel'),
    type: 'warning',
  })

export const confirmDiscard = () =>
  confirm({
    title: i18n.global.t('confirm.discard_title'),
    message: i18n.global.t('confirm.discard_message'),
    confirmText: i18n.global.t('confirm.discard_confirm'),
    cancelText: i18n.global.t('confirm.discard_cancel'),
    type: 'warning',
  })
