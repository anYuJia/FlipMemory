<template>
  <Teleport to="body">
    <div class="error-toast-container">
      <TransitionGroup name="toast" tag="div">
        <div
          v-for="error in errors"
          :key="error.timestamp"
          class="error-toast"
          :class="{ retryable: error.retryable }"
        >
          <div class="toast-content">
            <span class="toast-icon">❌</span>
            <div class="toast-message">
              <p class="message-text">{{ error.message }}</p>
              <p v-if="error.code" class="message-code">错误代码: {{ error.code }}</p>
            </div>
          </div>
          <button
            v-if="error.retryable"
            @click="$emit('retry', error)"
            class="toast-action"
          >
            重试
          </button>
          <button @click="removeError(error)" class="toast-close">✕</button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { useErrorHandler, type ErrorInfo } from '@/composables/useErrorHandler'
import { TransitionGroup } from 'vue'

const { errors, removeError } = useErrorHandler()

defineEmits<{
  retry: [error: ErrorInfo]
}>()
</script>

<style scoped>
.error-toast-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  pointer-events: none;
}

.error-toast {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #fee;
  border: 1px solid #fcc;
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  pointer-events: auto;
  animation: slideIn 0.3s ease;
}

.error-toast.retryable {
  background: #fef3cd;
  border-color: #ffc107;
}

.toast-content {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  flex: 1;
}

.toast-icon {
  font-size: 18px;
  flex-shrink: 0;
  margin-top: 2px;
}

.toast-message {
  flex: 1;
}

.message-text {
  margin: 0;
  font-size: 14px;
  color: #333;
  line-height: 1.4;
}

.message-code {
  margin: 4px 0 0 0;
  font-size: 12px;
  color: #666;
}

.toast-action {
  padding: 6px 12px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.2s;
  flex-shrink: 0;
}

.toast-action:hover {
  background: #5568d3;
}

.toast-close {
  padding: 0;
  width: 24px;
  height: 24px;
  background: transparent;
  border: none;
  color: #999;
  cursor: pointer;
  font-size: 16px;
  transition: color 0.2s;
  flex-shrink: 0;
}

.toast-close:hover {
  color: #333;
}

@keyframes slideIn {
  from {
    transform: translateX(400px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  transform: translateX(400px);
  opacity: 0;
}

.toast-leave-to {
  transform: translateX(400px);
  opacity: 0;
}
</style>
