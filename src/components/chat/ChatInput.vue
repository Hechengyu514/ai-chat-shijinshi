<script setup lang="ts">
/**
 * 聊天输入框组件
 * 负责用户输入消息、处理发送/停止逻辑
 */
import { ref, computed } from 'vue'
import { Right } from '@element-plus/icons-vue'

const emit = defineEmits<{
  'send-message': [content: string]
  stop: []
}>()

// 输入框文本内容
const inputText = ref('')
// 是否正在等待 AI 回复（控制发送/停止按钮切换）
const isLoading = ref(false)

// 是否可以发送消息（输入框有内容且不在加载中）
const canSend = computed(() => {
  return inputText.value.trim().length > 0 && !isLoading.value
})

// 发送节流：防止双击或快速回车导致重复发送
let lastSendTime = 0
const SEND_THROTTLE_MS = 500

// IME 组合输入状态：中文输入法选词期间按 Enter 不触发发送
const isComposing = ref(false)

/**
 * 处理键盘事件
 * - Enter：发送消息或停止生成
 * - Shift+Enter：换行（不拦截）
 * - IME 组合输入期间不处理 Enter
 */
const handleKeydown = (e: KeyboardEvent | Event) => {
  if (!(e instanceof KeyboardEvent)) return
  if (e.key === 'Enter' && !e.shiftKey && !isComposing.value) {
    e.preventDefault()
    if (isLoading.value) {
      emit('stop')
    } else {
      handleSend()
    }
  }
}

/**
 * 处理发送消息
 * - 获取输入框内容并清空输入框
 * - 触发 send-message 事件传递给父组件
 * - 内置 500ms 节流防止重复发送
 */
const handleSend = () => {
  const content = inputText.value.trim()
  if (!content || !canSend.value) return
  if (Date.now() - lastSendTime < SEND_THROTTLE_MS) return
  lastSendTime = Date.now()

  isLoading.value = true
  emit('send-message', content)
  inputText.value = ''
}

/**
 * 暴露方法给父组件调用
 * - setLoading: 设置加载状态（用于停止生成时重置按钮状态）
 */
defineExpose({
  setLoading: (loading: boolean) => {
    isLoading.value = loading
  },
})
</script>

<template>
  <!-- 输入区域容器 -->
  <div class="input-section">
    <div class="input-container">
      <!-- 文本输入框（自适应高度） -->
      <el-input
        v-model="inputText"
        type="textarea"
        :rows="1"
        :autosize="{ minRows: 1, maxRows: 6 }"
        placeholder="给试金石发送消息"
        resize="none"
        :disabled="isLoading"
        @keydown="handleKeydown"
        @compositionstart="isComposing = true"
        @compositionend="isComposing = false"
      />

      <!-- 发送按钮（非加载状态） -->
      <el-button
        v-if="!isLoading"
        type="primary"
        class="send-btn"
        :disabled="!canSend"
        @click="handleSend"
      >
        <el-icon><Right /></el-icon>
      </el-button>

      <!-- 停止按钮（加载状态） -->
      <el-button v-else type="danger" class="stop-btn" @click="emit('stop')">
        <span class="stop-icon">■</span>
      </el-button>
    </div>
  </div>
</template>

<style scoped>
.input-section {
  padding: 20px;
  background-color: var(--sidebar-bg);
  border-top: 1px solid var(--border-color);
}

.input-container {
  display: flex;
  gap: 12px;
  align-items: flex-end;
  background-color: var(--card-bg);
  border-radius: 12px;
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.input-container :deep(.el-textarea__inner) {
  background-color: transparent;
  border: none;
  box-shadow: none;
  padding: 8px 0;
  font-size: 14px;
  line-height: 1.5;
}

.input-container :deep(.el-textarea__inner:focus) {
  box-shadow: none;
}

.input-container :deep(.el-textarea) {
  flex: 1;
}

/* 发送按钮样式 */
.send-btn {
  min-width: 40px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  background-color: var(--primary-color);
  border-color: var(--primary-color);
  flex-shrink: 0;
}

.send-btn:hover:not(:disabled) {
  background-color: var(--primary-hover-color);
  border-color: var(--primary-hover-color);
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 停止按钮样式 */
.stop-btn {
  min-width: 40px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  flex-shrink: 0;
}

.stop-icon {
  font-size: 14px;
  line-height: 1;
}
</style>
