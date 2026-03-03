<template>
  <div class="skeleton" :class="{ 'skeleton-animated': animated }">
    <!-- 卡片骨架 -->
    <div v-if="type === 'card'" class="skeleton-card">
      <div class="skeleton-image"></div>
      <div class="skeleton-content">
        <div class="skeleton-line skeleton-line-title"></div>
        <div class="skeleton-line skeleton-line-text"></div>
        <div class="skeleton-line skeleton-line-text w-3/4"></div>
      </div>
    </div>

    <!-- 记忆卡片骨架 -->
    <div v-else-if="type === 'memory-card'" class="skeleton-memory-card">
      <div class="skeleton-image aspect-4-3"></div>
      <div class="skeleton-content">
        <div class="skeleton-line w-1/3 h-3 mb-2"></div>
        <div class="skeleton-line w-full h-4 mb-2"></div>
        <div class="skeleton-line w-2/3 h-4"></div>
      </div>
    </div>

    <!-- 列表骨架 -->
    <div v-else-if="type === 'list'" class="skeleton-list">
      <div v-for="i in count" :key="i" class="skeleton-list-item">
        <div class="skeleton-avatar"></div>
        <div class="skeleton-content">
          <div class="skeleton-line skeleton-line-title"></div>
          <div class="skeleton-line skeleton-line-text"></div>
        </div>
      </div>
    </div>

    <!-- 文本骨架 -->
    <div v-else-if="type === 'text'" class="skeleton-text">
      <div v-for="i in count" :key="i" class="skeleton-line"></div>
    </div>

    <!-- 日历骨架 -->
    <div v-else-if="type === 'calendar'" class="skeleton-calendar-wrapper">
      <div class="skeleton-calendar-header">
        <div class="skeleton-circle w-9 h-9"></div>
        <div class="skeleton-line w-24 h-6"></div>
        <div class="skeleton-circle w-9 h-9"></div>
      </div>
      <div class="skeleton-calendar-weekdays">
        <div v-for="i in 7" :key="i" class="skeleton-line w-6 h-4"></div>
      </div>
      <div class="skeleton-calendar">
        <div v-for="i in 35" :key="i" class="skeleton-calendar-day"></div>
      </div>
    </div>

    <!-- 统计骨架 -->
    <div v-else-if="type === 'stats'" class="skeleton-stats">
      <div v-for="i in 3" :key="i" class="skeleton-stat-item">
        <div class="skeleton-line w-12 h-8 mb-1"></div>
        <div class="skeleton-line w-8 h-3"></div>
      </div>
    </div>

    <!-- 个人资料骨架 -->
    <div v-else-if="type === 'profile'" class="skeleton-profile">
      <div class="skeleton-circle w-20 h-20 mx-auto mb-4"></div>
      <div class="skeleton-line w-32 h-5 mx-auto mb-2"></div>
      <div class="skeleton-line w-48 h-4 mx-auto"></div>
    </div>

    <!-- 搜索结果骨架 -->
    <div v-else-if="type === 'search-result'" class="skeleton-search-results">
      <div v-for="i in count" :key="i" class="skeleton-search-item">
        <div class="skeleton-circle w-14 h-14"></div>
        <div class="skeleton-content flex-1">
          <div class="skeleton-line w-20 h-3 mb-2"></div>
          <div class="skeleton-line w-full h-4 mb-1"></div>
          <div class="skeleton-line w-3/4 h-4"></div>
        </div>
      </div>
    </div>

    <!-- 记忆详情骨架 -->
    <div v-else-if="type === 'memory-detail'" class="skeleton-memory-detail">
      <div class="skeleton-image h-96 rounded-3xl mb-4"></div>
      <div class="skeleton-line w-full h-16 rounded-2xl mb-4"></div>
      <div class="skeleton-line w-full h-14 rounded-2xl"></div>
    </div>

    <!-- 自定义骨架 -->
    <div v-else class="skeleton-custom">
      <slot>
        <div class="skeleton-line" :style="customStyle"></div>
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  type?: 'card' | 'memory-card' | 'list' | 'text' | 'calendar' | 'stats' | 'profile' | 'search-result' | 'memory-detail' | 'custom'
  count?: number
  animated?: boolean
  width?: string
  height?: string
}

const props = withDefaults(defineProps<Props>(), {
  type: 'card',
  count: 3,
  animated: true,
  width: '100%',
  height: '1rem',
})

const customStyle = computed(() => ({
  width: props.width,
  height: props.height,
}))
</script>

<style scoped>
.skeleton {
  width: 100%;
  --skeleton-bg: var(--bg-tertiary);
  --skeleton-shine: var(--bg-secondary);
}

:root.dark .skeleton {
  --skeleton-bg: rgba(255, 255, 255, 0.05);
  --skeleton-shine: rgba(255, 255, 255, 0.1);
}

.skeleton-animated .skeleton-line,
.skeleton-animated .skeleton-circle,
.skeleton-animated .skeleton-image,
.skeleton-animated .skeleton-avatar,
.skeleton-animated .skeleton-calendar-day {
  background: linear-gradient(
    90deg,
    var(--skeleton-bg) 25%,
    var(--skeleton-shine) 50%,
    var(--skeleton-bg) 75%
  );
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s infinite;
}

@keyframes skeleton-shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

/* 基础元素 */
.skeleton-line {
  height: 12px;
  background: var(--skeleton-bg);
  border-radius: 4px;
  margin-bottom: 8px;
}

.skeleton-circle {
  background: var(--skeleton-bg);
  border-radius: 50%;
}

.skeleton-image {
  width: 100%;
  height: 200px;
  background: var(--skeleton-bg);
}

/* Card Skeleton */
.skeleton-card {
  background: var(--card-bg, #f0f0f0);
  border: 1px solid var(--card-border, transparent);
  border-radius: 1rem;
  overflow: hidden;
}

.skeleton-content {
  padding: 16px;
}

.skeleton-line-title {
  height: 16px;
  width: 80%;
}

.skeleton-line-text {
  width: 100%;
}

/* Memory Card Skeleton */
.skeleton-memory-card {
  background: var(--card-bg, #f0f0f0);
  border: 1px solid var(--card-border, transparent);
  border-radius: 1rem;
  overflow: hidden;
  height: 100%;
}

.skeleton-memory-card .skeleton-image {
  height: auto;
}

.aspect-4-3 {
  aspect-ratio: 4/3;
}

/* List Skeleton */
.skeleton-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.skeleton-list-item {
  display: flex;
  gap: 12px;
  padding: 12px;
  background: var(--card-bg, #f0f0f0);
  border: 1px solid var(--card-border, transparent);
  border-radius: 1rem;
}

.skeleton-avatar {
  width: 48px;
  height: 48px;
  background: var(--skeleton-bg);
  border-radius: 50%;
  flex-shrink: 0;
}

.skeleton-list-item .skeleton-content {
  flex: 1;
  padding: 0;
}

/* Text Skeleton */
.skeleton-text {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.skeleton-text .skeleton-line {
  width: 100%;
}

.skeleton-text .skeleton-line:last-child {
  width: 80%;
}

/* Calendar Skeleton */
.skeleton-calendar-wrapper {
  padding: 1.25rem;
  background: var(--card-bg, #f0f0f0);
  border: 1px solid var(--card-border, transparent);
  border-radius: 1rem;
}

.skeleton-calendar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.25rem;
}

.skeleton-calendar-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.25rem;
  margin-bottom: 0.5rem;
}

.skeleton-calendar-weekdays .skeleton-line {
  margin: 0 auto;
}

.skeleton-calendar {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.skeleton-calendar-day {
  aspect-ratio: 1;
  background: var(--skeleton-bg);
  border-radius: 8px;
}

/* Stats Skeleton */
.skeleton-stats {
  display: flex;
  justify-content: space-around;
  padding: 1rem 1.25rem;
  background: var(--card-bg, #f0f0f0);
  border: 1px solid var(--card-border, transparent);
  border-radius: 1rem;
}

.skeleton-stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* Profile Skeleton */
.skeleton-profile {
  padding: 2rem;
  text-align: center;
}

/* Search Result Skeleton */
.skeleton-search-results {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.skeleton-search-item {
  display: flex;
  gap: 16px;
  padding: 16px;
  background: var(--card-bg, #f0f0f0);
  border: 1px solid var(--card-border, transparent);
  border-radius: 1rem;
}

.skeleton-search-item .skeleton-content {
  padding: 0;
}

/* Memory Detail Skeleton */
.skeleton-memory-detail {
  padding: 0;
}

.skeleton-memory-detail .skeleton-image {
  height: 400px;
}

.h-96 { height: 24rem; }
.h-16 { height: 4rem; }
.h-14 { height: 3.5rem; }
.flex-1 { flex: 1; }
.rounded-3xl { border-radius: 1.5rem; }
.rounded-2xl { border-radius: 1rem; }

/* Custom Skeleton */
.skeleton-custom {
  width: 100%;
}

/* 工具类 */
.w-full { width: 100%; }
.w-3\/4 { width: 75%; }
.w-2\/3 { width: 66.67%; }
.w-1\/2 { width: 50%; }
.w-1\/3 { width: 33.33%; }
.w-48 { width: 12rem; }
.w-32 { width: 8rem; }
.w-24 { width: 6rem; }
.w-20 { width: 5rem; }
.w-12 { width: 3rem; }
.w-9 { width: 2.25rem; }
.w-8 { width: 2rem; }
.w-6 { width: 1.5rem; }

.h-8 { height: 2rem; }
.h-6 { height: 1.5rem; }
.h-5 { height: 1.25rem; }
.h-4 { height: 1rem; }
.h-3 { height: 0.75rem; }
.h-9 { height: 2.25rem; }
.h-20 { height: 5rem; }

.mb-1 { margin-bottom: 0.25rem; }
.mb-2 { margin-bottom: 0.5rem; }
.mb-4 { margin-bottom: 1rem; }
.mx-auto { margin-left: auto; margin-right: auto; }
</style>
