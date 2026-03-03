<template>
  <Teleport to="body">
    <Transition name="feedback">
      <div v-if="visible" class="feedback-overlay" @click.self="close">
        <div class="feedback-dialog">
          <div class="feedback-header">
            <h2>反馈与建议</h2>
            <button @click="close" class="close-btn">✕</button>
          </div>

          <div class="feedback-content">
            <!-- 反馈类型 -->
            <div class="form-group">
              <label>反馈类型</label>
              <div class="type-options">
                <button
                  v-for="type in feedbackTypes"
                  :key="type.value"
                  :class="['type-btn', { active: form.type === type.value }]"
                  @click="form.type = type.value"
                >
                  <span class="type-icon">{{ type.icon }}</span>
                  <span class="type-label">{{ type.label }}</span>
                </button>
              </div>
            </div>

            <!-- 反馈内容 -->
            <div class="form-group">
              <label>详细描述</label>
              <textarea
                v-model="form.content"
                placeholder="请描述您的问题或建议..."
                rows="4"
                maxlength="1000"
              ></textarea>
              <span class="char-count">{{ form.content.length }}/1000</span>
            </div>

            <!-- 联系方式 -->
            <div class="form-group">
              <label>联系方式（可选）</label>
              <input
                v-model="form.contact"
                type="text"
                placeholder="邮箱或其他联系方式"
                maxlength="100"
              />
            </div>

            <!-- 截图 -->
            <div class="form-group">
              <label>截图（可选）</label>
              <div class="screenshot-area">
                <input
                  type="file"
                  ref="fileInput"
                  accept="image/*"
                  @change="onFileSelect"
                  hidden
                />
                <button
                  v-if="!form.screenshot"
                  @click="$refs.fileInput.click()"
                  class="upload-btn"
                >
                  <span>📷</span>
                  <span>添加截图</span>
                </button>
                <div v-else class="screenshot-preview">
                  <img :src="form.screenshot" alt="截图预览" />
                  <button @click="removeScreenshot" class="remove-btn">✕</button>
                </div>
              </div>
            </div>

            <!-- 设备信息 -->
            <div class="form-group">
              <label class="checkbox-label">
                <input type="checkbox" v-model="form.includeDeviceInfo" />
                <span>包含设备信息（帮助我们更好地定位问题）</span>
              </label>
            </div>
          </div>

          <div class="feedback-footer">
            <button @click="close" class="btn btn-secondary">取消</button>
            <button
              @click="submit"
              class="btn btn-primary"
              :disabled="!canSubmit || isSubmitting"
            >
              {{ isSubmitting ? '提交中...' : '提交反馈' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { logger } from '@/services/logger'

interface Props {
  visible: boolean
}

interface Emits {
  (e: 'close'): void
  (e: 'submit', data: FeedbackData): void
}

interface FeedbackData {
  type: string
  content: string
  contact?: string
  screenshot?: string
  deviceInfo?: {
    userAgent: string
    platform: string
    language: string
    screenSize: string
    timestamp: string
  }
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const feedbackTypes = [
  { value: 'bug', label: '问题反馈', icon: '🐛' },
  { value: 'feature', label: '功能建议', icon: '💡' },
  { value: 'improvement', label: '体验优化', icon: '✨' },
  { value: 'other', label: '其他', icon: '📝' },
]

const form = reactive({
  type: 'bug',
  content: '',
  contact: '',
  screenshot: '',
  includeDeviceInfo: true,
})

const isSubmitting = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

const canSubmit = computed(() => {
  return form.content.trim().length >= 10
})

function close() {
  emit('close')
}

function onFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  // 检查文件大小（最大 5MB）
  if (file.size > 5 * 1024 * 1024) {
    alert('图片大小不能超过 5MB')
    return
  }

  // 读取文件
  const reader = new FileReader()
  reader.onload = (e) => {
    form.screenshot = e.target?.result as string
  }
  reader.readAsDataURL(file)
}

function removeScreenshot() {
  form.screenshot = ''
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

function getDeviceInfo() {
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    screenSize: `${window.screen.width}x${window.screen.height}`,
    timestamp: new Date().toISOString(),
  }
}

async function submit() {
  if (!canSubmit.value || isSubmitting.value) return

  isSubmitting.value = true

  try {
    const data: FeedbackData = {
      type: form.type,
      content: form.content.trim(),
      contact: form.contact.trim() || undefined,
      screenshot: form.screenshot || undefined,
      deviceInfo: form.includeDeviceInfo ? getDeviceInfo() : undefined,
    }

    // 记录日志
    logger.info('User feedback submitted', 'FeedbackDialog', {
      type: data.type,
      contentLength: data.content.length,
      hasScreenshot: !!data.screenshot,
      hasDeviceInfo: !!data.deviceInfo,
    })

    emit('submit', data)

    // 重置表单
    form.type = 'bug'
    form.content = ''
    form.contact = ''
    form.screenshot = ''
    form.includeDeviceInfo = true

    close()
  } catch (error) {
    logger.error('Failed to submit feedback', 'FeedbackDialog', error)
    alert('提交失败，请稍后重试')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<style scoped>
.feedback-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.feedback-dialog {
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
}

.feedback-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #eee;
}

.feedback-header h2 {
  margin: 0;
  font-size: 18px;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #999;
  padding: 4px;
}

.feedback-content {
  padding: 20px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.type-options {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.type-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px;
  background: #f5f5f5;
  border: 2px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.type-btn:hover {
  background: #eee;
}

.type-btn.active {
  border-color: #667eea;
  background: #f0f4ff;
}

.type-icon {
  font-size: 24px;
  margin-bottom: 4px;
}

.type-label {
  font-size: 12px;
  color: #666;
}

textarea,
input[type='text'] {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
  resize: vertical;
  transition: border-color 0.2s;
}

textarea:focus,
input[type='text']:focus {
  outline: none;
  border-color: #667eea;
}

.char-count {
  display: block;
  text-align: right;
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

.screenshot-area {
  border: 2px dashed #ddd;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
}

.upload-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  background: none;
  border: none;
  cursor: pointer;
  color: #666;
  font-size: 14px;
}

.upload-btn span:first-child {
  font-size: 32px;
}

.screenshot-preview {
  position: relative;
  display: inline-block;
}

.screenshot-preview img {
  max-width: 100%;
  max-height: 200px;
  border-radius: 4px;
}

.screenshot-preview .remove-btn {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 24px;
  height: 24px;
  background: #ff4444;
  color: white;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  font-size: 12px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.checkbox-label input {
  width: auto;
}

.checkbox-label span {
  font-size: 13px;
  color: #666;
}

.feedback-footer {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding: 20px;
  border-top: 1px solid #eee;
}

.btn {
  padding: 10px 24px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: #667eea;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #5568d3;
}

.btn-primary:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.btn-secondary {
  background: #f0f0f0;
  color: #333;
}

.btn-secondary:hover {
  background: #e0e0e0;
}

.feedback-enter-active,
.feedback-leave-active {
  transition: opacity 0.3s ease;
}

.feedback-enter-from,
.feedback-leave-to {
  opacity: 0;
}

.feedback-enter-active .feedback-dialog,
.feedback-leave-active .feedback-dialog {
  transition: transform 0.3s ease;
}

.feedback-enter-from .feedback-dialog,
.feedback-leave-to .feedback-dialog {
  transform: scale(0.9);
}
</style>
