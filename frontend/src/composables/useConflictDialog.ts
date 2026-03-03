/**
 * 冲突对话框 Composable
 */

import { ref, shallowRef } from 'vue'
import type { ConflictResolutionStrategy } from '@/services/conflictResolver'

export interface ConflictData {
  localVersion: any
  remoteVersion: any
  localTimestamp: number
  remoteTimestamp: number
}

// 全局状态
const isOpen = ref(false)
const conflictData = ref<ConflictData | null>(null)

let resolvePromise: ((strategy: ConflictResolutionStrategy | null) => void) | null = null

/**
 * 显示冲突对话框
 */
export function showConflictDialog(data: ConflictData): Promise<ConflictResolutionStrategy | null> {
  conflictData.value = data
  isOpen.value = true

  return new Promise((resolve) => {
    resolvePromise = resolve
  })
}

/**
 * 解决冲突
 */
export function resolveConflict(strategy: ConflictResolutionStrategy) {
  isOpen.value = false
  resolvePromise?.(strategy)
  resolvePromise = null
  conflictData.value = null
}

/**
 * 关闭对话框（取消）
 */
export function closeConflictDialog() {
  isOpen.value = false
  resolvePromise?.(null)
  resolvePromise = null
  conflictData.value = null
}

/**
 * 使用冲突对话框
 */
export function useConflictDialog() {
  return {
    isOpen,
    conflictData,
    showConflictDialog,
    resolveConflict,
    closeConflictDialog,
  }
}
