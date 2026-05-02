<script setup lang="ts">
/**
 * 全局错误处理组件
 * 监听 window.onerror 和 unhandledrejection，在右下角以 toast 面板展示最多 5 条错误
 */
import { ref, onMounted, onUnmounted } from 'vue'
import { Close } from '@element-plus/icons-vue'
import type { AppError } from '@/types'

// 错误列表
const errors = ref<AppError[]>([])
// 面板是否可见
const isVisible = ref(false)

// 添加错误到面板（最多保留 5 条，超出移除最旧的）
const addError = (error: Error) => {
  const errorInfo: AppError = {
    id: Date.now().toString(),
    message: error.message,
    timestamp: Date.now(),
  }
  errors.value.unshift(errorInfo)
  isVisible.value = true

  if (errors.value.length > 5) {
    errors.value.pop()
  }
}

// 移除单条错误
const removeError = (id: string) => {
  const index = errors.value.findIndex((e) => e.id === id)
  if (index !== -1) {
    errors.value.splice(index, 1)
  }
  if (errors.value.length === 0) {
    isVisible.value = false
  }
}

// 清空全部错误
const clearAll = () => {
  errors.value = []
  isVisible.value = false
}

// 全局 error 事件处理
const handleGlobalError = (event: ErrorEvent) => {
  if (event.error instanceof Error) {
    addError(event.error)
  } else {
    addError(new Error(event.message || '未知错误'))
  }
}

// Promise 拒绝事件处理
const handleRejection = (event: PromiseRejectionEvent) => {
  addError(event.reason instanceof Error ? event.reason : new Error(String(event.reason)))
}

onMounted(() => {
  window.addEventListener('error', handleGlobalError)
  window.addEventListener('unhandledrejection', handleRejection)
})

onUnmounted(() => {
  window.removeEventListener('error', handleGlobalError)
  window.removeEventListener('unhandledrejection', handleRejection)
})

defineExpose({
  addError,
})
</script>

<template>
  <Teleport to="body">
    <Transition name="slide-up">
      <div v-if="isVisible" class="global-error-container">
        <div class="error-panel">
          <div class="panel-header">
            <span class="panel-title">系统提示</span>
            <el-button class="panel-close" text @click="clearAll" title="关闭全部">
              <el-icon><Close /></el-icon>
            </el-button>
          </div>
          <div class="error-list">
            <TransitionGroup name="list">
              <div v-for="error in errors" :key="error.id" class="error-item">
                <span class="error-icon">⚠️</span>
                <span class="error-text">{{ error.message }}</span>
                <el-button class="error-close" text @click="removeError(error.id)">
                  <el-icon><Close /></el-icon>
                </el-button>
              </div>
            </TransitionGroup>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.global-error-container {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 9999;
}

.error-panel {
  background-color: var(--card-bg);
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  min-width: 320px;
  max-width: 400px;
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
}

.panel-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-color);
}

.panel-close {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.panel-close:hover {
  background-color: var(--hover-color);
}

.error-list {
  padding: 8px;
  max-height: 200px;
  overflow-y: auto;
}

.error-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 8px;
  background-color: var(--hover-color);
  margin-bottom: 8px;
}

.error-item:last-child {
  margin-bottom: 0;
}

.error-icon {
  font-size: 16px;
}

.error-text {
  flex: 1;
  font-size: 13px;
  color: var(--text-secondary);
  word-break: break-all;
}

.error-close {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 2px;
  border-radius: 4px;
  transition: color 0.2s;
}

.error-close:hover {
  color: var(--text-color);
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

.list-enter-active,
.list-leave-active {
  transition: all 0.2s ease;
}

.list-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.list-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

.list-move {
  transition: transform 0.2s ease;
}
</style>
