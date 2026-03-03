<template>
  <div
    ref="containerRef"
    class="virtual-list-container"
    :style="{ height: containerHeight + 'px' }"
    @scroll="onScroll"
  >
    <div
      class="virtual-list-phantom"
      :style="{ height: totalHeight + 'px' }"
    ></div>
    <div
      class="virtual-list-content"
      :style="{ transform: `translateY(${offset}px)` }"
    >
      <div
        v-for="item in visibleItems"
        :key="getItemKey(item)"
        class="virtual-list-item"
        :style="{ height: itemHeight + 'px' }"
      >
        <slot :item="item" :index="item._virtualIndex"></slot>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'

interface Props {
  items: any[]
  itemHeight: number
  containerHeight: number
  buffer?: number
  keyField?: string
}

const props = withDefaults(defineProps<Props>(), {
  buffer: 5,
  keyField: 'id',
})

const emit = defineEmits<{
  scroll: [scrollTop: number]
  reachEnd: []
}>()

const containerRef = ref<HTMLElement | null>(null)
const scrollTop = ref(0)

// 计算总高度
const totalHeight = computed(() => props.items.length * props.itemHeight)

// 计算可见项数量
const visibleCount = computed(() =>
  Math.ceil(props.containerHeight / props.itemHeight) + props.buffer * 2
)

// 计算起始索引
const startIndex = computed(() => {
  const index = Math.floor(scrollTop.value / props.itemHeight) - props.buffer
  return Math.max(0, index)
})

// 计算结束索引
const endIndex = computed(() => {
  const index = startIndex.value + visibleCount.value
  return Math.min(props.items.length, index)
})

// 计算偏移量
const offset = computed(() => startIndex.value * props.itemHeight)

// 计算可见项
const visibleItems = computed(() => {
  return props.items.slice(startIndex.value, endIndex.value).map((item, index) => ({
    ...item,
    _virtualIndex: startIndex.value + index,
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

  // 检测是否到达底部
  if (target.scrollTop + target.clientHeight >= target.scrollHeight - 50) {
    emit('reachEnd')
  }
}

// 滚动到指定索引
function scrollToIndex(index: number, behavior: ScrollBehavior = 'smooth') {
  if (containerRef.value) {
    const top = index * props.itemHeight
    containerRef.value.scrollTo({ top, behavior })
  }
}

// 滚动到顶部
function scrollToTop(behavior: ScrollBehavior = 'smooth') {
  scrollToIndex(0, behavior)
}

// 滚动到底部
function scrollToBottom(behavior: ScrollBehavior = 'smooth') {
  scrollToIndex(props.items.length - 1, behavior)
}

// 暴露方法
defineExpose({
  scrollToIndex,
  scrollToTop,
  scrollToBottom,
})
</script>

<style scoped>
.virtual-list-container {
  overflow-y: auto;
  position: relative;
  -webkit-overflow-scrolling: touch;
}

.virtual-list-phantom {
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  z-index: -1;
}

.virtual-list-content {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
}

.virtual-list-item {
  box-sizing: border-box;
}
</style>
