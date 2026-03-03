<template>
  <Transition name="progress">
    <div v-if="visible" class="progress-bar-container">
      <div class="progress-bar" :style="{ width: percentage + '%' }"></div>
      <div v-if="showLabel" class="progress-label">{{ percentage }}%</div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

interface Props {
  value: number // 0-100
  visible?: boolean
  showLabel?: boolean
  color?: string
  height?: string
}

const props = withDefaults(defineProps<Props>(), {
  visible: true,
  showLabel: false,
  color: '#667eea',
  height: '4px',
})

const percentage = ref(props.value)

watch(() => props.value, (newValue) => {
  percentage.value = Math.min(100, Math.max(0, newValue))
})
</script>

<style scoped>
.progress-bar-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: v-bind(height);
  background: #f0f0f0;
  z-index: 9998;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: v-bind(color);
  transition: width 0.3s ease;
  box-shadow: 0 0 10px rgba(102, 126, 234, 0.5);
}

.progress-label {
  position: absolute;
  top: 50%;
  right: 16px;
  transform: translateY(-50%);
  font-size: 12px;
  color: #666;
  font-weight: 500;
}

.progress-enter-active,
.progress-leave-active {
  transition: opacity 0.3s ease;
}

.progress-enter-from,
.progress-leave-to {
  opacity: 0;
}
</style>
