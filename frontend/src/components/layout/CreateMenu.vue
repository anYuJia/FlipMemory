<script setup lang="ts">
import { ref, watch } from 'vue'
import { PenLine, ImageIcon } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'

interface Props {
  show: boolean
}

const props = defineProps<Props>()
const { t } = useI18n()
const emit = defineEmits<{
  close: []
  selectRecord: []
  selectAlbum: []
}>()

const isVisible = ref(false)
const isAnimating = ref(false)

watch(() => props.show, (newVal) => {
  if (newVal) {
    isVisible.value = true
    requestAnimationFrame(() => {
      isAnimating.value = true
    })
  } else {
    isAnimating.value = false
    setTimeout(() => {
      isVisible.value = false
    }, 300)
  }
})

const handleBackdropClick = () => {
  emit('close')
}

const handleRecord = () => {
  emit('selectRecord')
  emit('close')
}

const handleAlbum = () => {
  emit('selectAlbum')
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div 
      v-if="isVisible"
      class="fixed inset-0 z-[100]"
    >
      <!-- 背景遮罩 -->
      <div 
        class="absolute inset-0 transition-opacity duration-300"
        :class="isAnimating ? 'opacity-100' : 'opacity-0'"
        style="background: rgba(0, 0, 0, 0.6); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);"
        @click="handleBackdropClick"
      />
      
      <!-- 菜单内容 -->
      <div 
        class="absolute bottom-0 left-0 right-0 transition-all duration-300 ease-out"
        :class="isAnimating ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'"
      >
        <div class="max-w-lg mx-auto px-6 pb-10">
          <!-- 选项卡片 -->
          <div class="mb-4 rounded-[2.5rem] overflow-hidden card-static shadow-2xl">
            <!-- 记录选项 -->
            <button
              @click="handleRecord"
              class="w-full flex items-center gap-5 px-6 py-6 transition-colors hover:bg-black/5 dark:hover:bg-white/5 active:scale-[0.98]"
            >
              <div 
                class="w-14 h-14 rounded-[1.25rem] flex items-center justify-center shadow-lg"
                style="background: linear-gradient(135deg, #fb923c, #f97316);"
              >
                <PenLine class="w-7 h-7 text-white" />
              </div>
              <div class="flex-1 text-left">
                <div class="font-black tracking-tight" style="color: var(--text-primary);">{{ t('create_menu.record_memory') }}</div>
                <div class="text-[11px] font-bold opacity-30 uppercase tracking-wider mt-0.5" style="color: var(--text-primary);">{{ t('create_menu.new_story') }}</div>
              </div>
            </button>
            
            <!-- 分隔线 -->
            <div class="mx-6 h-px bg-black/[0.03] dark:bg-white/[0.05]"></div>
            
            <!-- 相册选项 -->
            <button
              @click="handleAlbum"
              class="w-full flex items-center gap-5 px-6 py-6 transition-colors hover:bg-black/5 dark:hover:bg-white/5 active:scale-[0.98]"
            >
              <div 
                class="w-14 h-14 rounded-[1.25rem] flex items-center justify-center shadow-lg"
                style="background: linear-gradient(135deg, #8b5cf6, #7c3aed);"
              >
                <ImageIcon class="w-7 h-7 text-white" />
              </div>
              <div class="flex-1 text-left">
                <div class="font-black tracking-tight" style="color: var(--text-primary);">{{ t('create_menu.import_album') }}</div>
                <div class="text-[11px] font-bold opacity-30 uppercase tracking-wider mt-0.5" style="color: var(--text-primary);">{{ t('create_menu.from_gallery') }}</div>
              </div>
            </button>
          </div>
          
          <!-- 取消按钮 -->
          <button
            @click="handleBackdropClick"
            class="w-full py-5 rounded-[2rem] font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-lg card-static active:scale-95"
            style="color: var(--text-primary);"
          >
            {{ t('create_menu.cancel') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.card-static {
  background-color: var(--card-bg);
  border: 1px solid var(--card-border);
  backdrop-filter: blur(32px) saturate(180%);
}
</style>
