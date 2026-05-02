<script setup lang="ts">
/**
 * 错误边界组件
 * 捕获子组件渲染错误，显示降级 UI 而非白屏，支持手动重新加载
 */
import { ref, computed, onErrorCaptured } from 'vue'
import { logger } from '@/utils/logger'

interface Props {
  // 自定义错误提示语
  fallbackMessage?: string
}

const props = withDefaults(defineProps<Props>(), {
  fallbackMessage: '抱歉，页面出现了错误',
})

const emit = defineEmits<{
  error: [error: Error]
}>()

const MAX_RETRIES = 3

// 是否已捕获到错误
const hasError = ref(false)
// 当前错误消息
const errorMessage = ref('')
// 已重试次数
const retryCount = ref(0)

// 捕获子组件错误，阻止向上传播导致白屏
onErrorCaptured((err) => {
  hasError.value = true
  errorMessage.value = err instanceof Error ? err.message : String(err)
  emit('error', err instanceof Error ? err : new Error(String(err)))
  logger.error('ErrorBoundary 捕获到错误:', err)
  return true
})

// 重置错误状态，尝试重新渲染子组件（最多重试 3 次）
const resetError = () => {
  retryCount.value++
  hasError.value = false
  errorMessage.value = ''
}

// 是否已达最大重试次数
const exhausted = computed(() => retryCount.value >= MAX_RETRIES)
</script>

<template>
  <div v-if="hasError" class="error-boundary">
    <div class="error-card">
      <div class="error-icon">❌</div>
      <h3 class="error-title">出错了</h3>
      <p class="error-message">{{ props.fallbackMessage }}</p>
      <p v-if="errorMessage" class="error-details">{{ errorMessage }}</p>
      <el-button v-if="!exhausted" type="primary" size="small" @click="resetError">
        重新加载
      </el-button>
      <p v-else class="error-exhausted">已重试多次，请刷新页面或联系支持</p>
    </div>
  </div>
  <slot v-else />
</template>

<style scoped>
.error-boundary {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background-color: var(--bg-color);
}

.error-card {
  background-color: var(--card-bg);
  border-radius: 12px;
  padding: 40px;
  text-align: center;
  max-width: 400px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.error-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.error-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-color);
  margin: 0 0 12px 0;
}

.error-message {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0 0 8px 0;
}

.error-details {
  font-size: 12px;
  color: var(--error-color);
  margin: 0 0 20px 0;
  word-break: break-all;
}

.error-exhausted {
  font-size: 13px;
  color: var(--text-muted);
  margin: 0;
}
</style>
