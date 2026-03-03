<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="isOpen && conflictData" class="conflict-dialog-overlay" @click.self="handleClose">
        <div class="conflict-dialog">
          <div class="dialog-header">
            <h2>数据冲突</h2>
            <button @click="handleClose" class="close-btn">✕</button>
          </div>

          <div class="dialog-content">
            <p class="conflict-message">
              检测到本地数据与服务器数据不一致，请选择保留哪个版本：
            </p>

            <div class="versions-container">
              <div
                class="version-card local"
                :class="{ selected: selectedStrategy === 'local' }"
                @click="selectedStrategy = 'local'"
              >
                <div class="version-header">
                  <input
                    type="radio"
                    value="local"
                    v-model="selectedStrategy"
                    id="conflict-local"
                  />
                  <label for="conflict-local">保留本地版本</label>
                </div>
                <div class="version-content">
                  <p class="version-time">修改时间: {{ formatTime(conflictData.localTimestamp) }}</p>
                  <pre class="version-data">{{ formatData(conflictData.localVersion) }}</pre>
                </div>
              </div>

              <div
                class="version-card remote"
                :class="{ selected: selectedStrategy === 'remote' }"
                @click="selectedStrategy = 'remote'"
              >
                <div class="version-header">
                  <input
                    type="radio"
                    value="remote"
                    v-model="selectedStrategy"
                    id="conflict-remote"
                  />
                  <label for="conflict-remote">保留服务器版本</label>
                </div>
                <div class="version-content">
                  <p class="version-time">修改时间: {{ formatTime(conflictData.remoteTimestamp) }}</p>
                  <pre class="version-data">{{ formatData(conflictData.remoteVersion) }}</pre>
                </div>
              </div>

              <div
                class="version-card merge"
                :class="{ selected: selectedStrategy === 'merge' }"
                @click="selectedStrategy = 'merge'"
              >
                <div class="version-header">
                  <input
                    type="radio"
                    value="merge"
                    v-model="selectedStrategy"
                    id="conflict-merge"
                  />
                  <label for="conflict-merge">合并两个版本</label>
                </div>
                <div class="version-content">
                  <p class="version-desc">自动合并两个版本的数据</p>
                </div>
              </div>
            </div>
          </div>

          <div class="dialog-actions">
            <button @click="handleClose" class="btn btn-secondary">取消</button>
            <button @click="handleResolve" class="btn btn-primary">确认</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useConflictDialog } from '@/composables/useConflictDialog'
import type { ConflictResolutionStrategy } from '@/services/conflictResolver'

const { isOpen, conflictData, resolveConflict, closeConflictDialog } = useConflictDialog()

const selectedStrategy = ref<ConflictResolutionStrategy>('merge')

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString('zh-CN')
}

function formatData(data: any): string {
  const str = JSON.stringify(data, null, 2)
  return str.length > 200 ? str.slice(0, 200) + '...' : str
}

function handleResolve() {
  resolveConflict(selectedStrategy.value)
}

function handleClose() {
  closeConflictDialog()
}
</script>

<style scoped>
.conflict-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 1rem;
}

.conflict-dialog {
  background: var(--card-bg, white);
  border-radius: 1rem;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  max-width: 600px;
  width: 100%;
  max-height: 80vh;
  overflow-y: auto;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem;
  border-bottom: 1px solid var(--border-primary, #eee);
}

.dialog-header h2 {
  margin: 0;
  font-size: 1.125rem;
  color: var(--text-primary, #333);
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.25rem;
  cursor: pointer;
  color: var(--text-muted, #999);
  padding: 0.25rem;
}

.dialog-content {
  padding: 1.25rem;
}

.conflict-message {
  margin: 0 0 1rem 0;
  color: var(--text-secondary, #666);
  line-height: 1.6;
  font-size: 0.875rem;
}

.versions-container {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.version-card {
  border: 2px solid var(--border-primary, #ddd);
  border-radius: 0.75rem;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.2s;
}

.version-card:hover {
  border-color: var(--color-primary, #f97316);
}

.version-card.selected {
  border-color: var(--color-primary, #f97316);
  background: rgba(249, 115, 22, 0.05);
}

.version-card.local {
  border-left: 4px solid #22c55e;
}

.version-card.remote {
  border-left: 4px solid #3b82f6;
}

.version-card.merge {
  border-left: 4px solid #f59e0b;
}

.version-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.version-header input[type='radio'] {
  cursor: pointer;
  accent-color: var(--color-primary, #f97316);
}

.version-header label {
  cursor: pointer;
  font-weight: 600;
  color: var(--text-primary, #333);
  font-size: 0.875rem;
}

.version-content {
  margin-left: 1.5rem;
}

.version-time {
  margin: 0 0 0.5rem 0;
  font-size: 0.75rem;
  color: var(--text-muted, #999);
}

.version-data {
  margin: 0;
  padding: 0.5rem;
  background: var(--bg-tertiary, #f5f5f5);
  border-radius: 0.375rem;
  font-size: 0.75rem;
  overflow-x: auto;
  max-height: 80px;
  font-family: monospace;
}

.version-desc {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--text-secondary, #666);
}

.dialog-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  padding: 1.25rem;
  border-top: 1px solid var(--border-primary, #eee);
}

.btn {
  padding: 0.625rem 1.25rem;
  border: none;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--color-primary, #f97316);
  color: white;
}

.btn-primary:hover {
  filter: brightness(1.1);
}

.btn-secondary {
  background: var(--bg-tertiary, #f0f0f0);
  color: var(--text-secondary, #333);
}

.btn-secondary:hover {
  background: var(--bg-secondary, #e0e0e0);
}

/* 动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
