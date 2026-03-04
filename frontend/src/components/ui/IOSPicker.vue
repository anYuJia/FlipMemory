<script setup lang="ts">
import { ref, watch, onMounted, nextTick, computed } from 'vue'

export interface PickerColumn {
  key: string
  options: { value: string | number; label: string }[]
  defaultValue?: string | number
}

const props = defineProps<{
  visible: boolean
  title?: string
  columns: PickerColumn[]
  cancelText?: string
  confirmText?: string
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'confirm', values: Record<string, string | number>): void
  (e: 'cancel'): void
}>()

const ITEM_HEIGHT = 40
const VISIBLE_COUNT = 5
const CENTER_INDEX = Math.floor(VISIBLE_COUNT / 2)

const columnRefs = ref<HTMLElement[]>([])
const selectedIndices = ref<number[]>([])

const containerHeight = computed(() => ITEM_HEIGHT * VISIBLE_COUNT)

const setColumnRef = (el: any, index: number) => {
  if (el) columnRefs.value[index] = el
}

const initColumns = () => {
  selectedIndices.value = props.columns.map((col) => {
    if (col.defaultValue !== undefined) {
      const idx = col.options.findIndex((o) => o.value === col.defaultValue)
      return idx >= 0 ? idx : 0
    }
    return 0
  })
}

const scrollToIndex = (colIndex: number, itemIndex: number, smooth = false) => {
  const el = columnRefs.value[colIndex]
  if (!el) return
  const scrollTop = itemIndex * ITEM_HEIGHT
  el.scrollTo({
    top: scrollTop,
    behavior: smooth ? 'smooth' : 'auto'
  })
}

const onScroll = (colIndex: number) => {
  const el = columnRefs.value[colIndex]
  if (!el) return
  const scrollTop = el.scrollTop
  const index = Math.round(scrollTop / ITEM_HEIGHT)
  const clampedIndex = Math.max(0, Math.min(index, (props.columns[colIndex]?.options.length ?? 1) - 1))
  selectedIndices.value[colIndex] = clampedIndex
}

// Debounced snap: after scroll ends, snap to nearest item
let scrollTimers: ReturnType<typeof setTimeout>[] = []
const onScrollEnd = (colIndex: number) => {
  if (scrollTimers[colIndex]) clearTimeout(scrollTimers[colIndex])
  scrollTimers[colIndex] = setTimeout(() => {
    const idx = selectedIndices.value[colIndex] ?? 0
    scrollToIndex(colIndex, idx, true)
  }, 80)
}

const handleConfirm = () => {
  const values: Record<string, string | number> = {}
  props.columns.forEach((col, i) => {
    const idx = selectedIndices.value[i] ?? 0
    values[col.key] = col.options[idx]?.value ?? ''
  })
  emit('confirm', values)
  emit('update:visible', false)
}

const handleCancel = () => {
  emit('cancel')
  emit('update:visible', false)
}

const handleOverlayClick = (e: MouseEvent) => {
  if ((e.target as HTMLElement).classList.contains('ios-picker-overlay')) {
    handleCancel()
  }
}

watch(
  () => props.visible,
  async (val) => {
    if (val) {
      initColumns()
      await nextTick()
      props.columns.forEach((_, i) => {
        scrollToIndex(i, selectedIndices.value[i] ?? 0)
      })
    }
  }
)

onMounted(() => {
  if (props.visible) {
    initColumns()
    nextTick(() => {
      props.columns.forEach((_, i) => {
        scrollToIndex(i, selectedIndices.value[i] ?? 0)
      })
    })
  }
})
</script>

<template>
  <Teleport to="body">
    <Transition name="ios-picker-fade">
      <div v-if="visible" class="ios-picker-overlay" @click="handleOverlayClick">
        <Transition name="ios-picker-slide">
          <div v-if="visible" class="ios-picker-sheet">
            <!-- Header -->
            <div class="ios-picker-header">
              <button class="ios-picker-btn cancel" @click="handleCancel">
                {{ cancelText || '取消' }}
              </button>
              <span class="ios-picker-title">{{ title || '' }}</span>
              <button class="ios-picker-btn confirm" @click="handleConfirm">
                {{ confirmText || '确定' }}
              </button>
            </div>

            <!-- Picker Body -->
            <div class="ios-picker-body" :style="{ height: containerHeight + 'px' }">
              <!-- Selection highlight band -->
              <div class="ios-picker-highlight" :style="{ top: CENTER_INDEX * ITEM_HEIGHT + 'px', height: ITEM_HEIGHT + 'px' }"></div>
              <!-- Gradient masks -->
              <div class="ios-picker-mask top"></div>
              <div class="ios-picker-mask bottom"></div>

              <div
                v-for="(col, colIndex) in columns"
                :key="col.key"
                class="ios-picker-column"
                :ref="(el) => setColumnRef(el, colIndex)"
                @scroll="onScroll(colIndex); onScrollEnd(colIndex)"
              >
                <!-- Top padding -->
                <div :style="{ height: CENTER_INDEX * ITEM_HEIGHT + 'px' }"></div>
                <div
                  v-for="(opt, optIndex) in col.options"
                  :key="opt.value"
                  class="ios-picker-item"
                  :class="{ active: selectedIndices[colIndex] === optIndex }"
                  :style="{ height: ITEM_HEIGHT + 'px', lineHeight: ITEM_HEIGHT + 'px' }"
                >
                  {{ opt.label }}
                </div>
                <!-- Bottom padding -->
                <div :style="{ height: CENTER_INDEX * ITEM_HEIGHT + 'px' }"></div>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.ios-picker-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  -webkit-backdrop-filter: blur(4px);
  backdrop-filter: blur(4px);
}

.ios-picker-sheet {
  width: 100%;
  max-width: 500px;
  background: var(--card-bg, #fff);
  border-radius: 1.5rem 1.5rem 0 0;
  overflow: hidden;
  box-shadow: 0 -8px 40px rgba(0, 0, 0, 0.15);
}

.ios-picker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

:root.dark .ios-picker-header {
  border-bottom-color: rgba(255, 255, 255, 0.06);
}

.ios-picker-btn {
  font-size: 15px;
  font-weight: 600;
  border: none;
  background: none;
  padding: 4px 8px;
  cursor: pointer;
  transition: opacity 0.2s;
}

.ios-picker-btn:active {
  opacity: 0.5;
}

.ios-picker-btn.cancel {
  color: var(--text-secondary, #999);
}

.ios-picker-btn.confirm {
  color: var(--color-primary, #f97316);
}

.ios-picker-title {
  font-size: 15px;
  font-weight: 800;
  color: var(--text-primary, #333);
  letter-spacing: -0.02em;
}

.ios-picker-body {
  position: relative;
  display: flex;
  overflow: hidden;
  user-select: none;
  -webkit-user-select: none;
}

.ios-picker-highlight {
  position: absolute;
  left: 16px;
  right: 16px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.04);
  pointer-events: none;
  z-index: 1;
}

:root.dark .ios-picker-highlight {
  background: rgba(255, 255, 255, 0.08);
}

.ios-picker-mask {
  position: absolute;
  left: 0;
  right: 0;
  height: 40%;
  pointer-events: none;
  z-index: 2;
}

.ios-picker-mask.top {
  top: 0;
  background: linear-gradient(to bottom, var(--card-bg, #fff) 10%, transparent);
}

.ios-picker-mask.bottom {
  bottom: 0;
  background: linear-gradient(to top, var(--card-bg, #fff) 10%, transparent);
}

.ios-picker-column {
  flex: 1;
  overflow-y: auto;
  scroll-snap-type: y mandatory;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.ios-picker-column::-webkit-scrollbar {
  display: none;
}

.ios-picker-item {
  text-align: center;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary, #333);
  opacity: 0.35;
  scroll-snap-align: start;
  transition: opacity 0.15s, font-size 0.15s;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 0 4px;
}

.ios-picker-item.active {
  opacity: 1;
  font-size: 17px;
  font-weight: 700;
}

/* Transitions */
.ios-picker-fade-enter-active,
.ios-picker-fade-leave-active {
  transition: opacity 0.3s ease;
}
.ios-picker-fade-enter-from,
.ios-picker-fade-leave-to {
  opacity: 0;
}

.ios-picker-slide-enter-active {
  transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}
.ios-picker-slide-leave-active {
  transition: transform 0.25s ease-in;
}
.ios-picker-slide-enter-from {
  transform: translateY(100%);
}
.ios-picker-slide-leave-to {
  transform: translateY(100%);
}
</style>
