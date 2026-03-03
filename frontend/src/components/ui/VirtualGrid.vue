<template>
  <div
    ref="containerRef"
    class="virtual-grid-container"
    :style="{ height: containerHeight + 'px' }"
    @scroll="onScroll"
  >
    <div
      class="virtual-grid-phantom"
      :style="{ height: totalHeight + 'px' }"
    ></div>
    <div
      class="virtual-grid-content"
      :style="{
        transform: `translateY(${offset}px)`,
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: gap + 'px',
      }"
    >
      <div
        v-for="item in visibleItems"
        :key="getItemKey(item)"
        class="virtual-grid-item"
        :style="{ height: itemHeight + 'px' }"
      >
        <slot :item="item" :index="item._virtualIndex"></slot>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface Props {
  items: any[]
  itemHeight: number
  containerHeight: number
  columns?: number
  gap?: number
  buffer?: number
  keyField?: string
}

const props = withDefaults(defineProps<Props>(), {
  columns: 7,
  gap: 4,
  buffer: 2,
  keyField: 'id',
})

const emit = defineEmits<{
  scroll: [scrollTop: number]
  reachEnd: []
}>()

const containerRef = ref<HTMLElement | null>(null)
const scrollTop = ref(0)

// 计算行数
const rowCount = computed(() => Math.ceil(props.items.length / props.columns))

// 计算行高（包含间距）
const rowHeight = computed(() => props.itemHeight + props.gap)

// 计算总高度
const totalHeight = computed(() => rowCount.value * rowHeight.value)

// 计算可见行数
const visibleRowCount = computed(() =>
  Math.ceil(props.containerHeight / rowHeight.value) + props.buffer * 2
)

// 计算起始行索引
const startRowIndex = computed(() => {
  const index = Math.floor(scrollTop.value / rowHeight.value) - props.buffer
  return Math.max(0, index)
})

// 计算结束行索引
const endRowIndex = computed(() => {
  const index = startRowIndex.value + visibleRowCount.value
  return Math.min(rowCount.value, index)
})

// 计算偏移量
const offset = computed(() => startRowIndex.value * rowHeight.value)

// 计算可见项
const visibleItems = computed(() => {
  const startIndex = startRowIndex.value * props.columns
  const endIndex = endRowIndex.value * props.columns
  return props.items.slice(startIndex, endIndex).map((item, index) => ({
    ...item,
    _virtualIndex: startIndex + index,
  }))
})

// 获取项的 key
function getItemKey(item: any): string | number {
  return item[props.keyField] ?? item._virtualIndex
}

// 滚动处理
function onScroll(event: Event) {
  const target = event.target as HTMLElement
  scrollTop.value = target.scrollTop
  emit('scroll', scrollTop.value)

  if (target.scrollTop + target.clientHeight >= target.scrollHeight - 50) {
    emit('reachEnd')
  }
}

// 滚动到指定行
function scrollToRow(rowIndex: number, behavior: ScrollBehavior = 'smooth') {
  if (containerRef.value) {
    const top = rowIndex * rowHeight.value
    containerRef.value.scrollTo({ top, behavior })
  }
}

// 滚动到指定项
function scrollToIndex(index: number, behavior: ScrollBehavior = 'smooth') {
  const rowIndex = Math.floor(index / props.columns)
  scrollToRow(rowIndex, behavior)
}

defineExpose({
  scrollToRow,
  scrollToIndex,
})
</script>

<style scoped>
.virtual-grid-container {
  overflow-y: auto;
  position: relative;
  -webkit-overflow-scrolling: touch;
}

.virtual-grid-phantom {
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  z-index: -1;
}

.virtual-grid-content {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
}

.virtual-grid-item {
  box-sizing: border-box;
}
</style>
