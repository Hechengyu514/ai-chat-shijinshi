<script setup lang="ts">
/**
 * 聊天消息组件
 * 负责渲染用户/AI 消息，支持 Markdown 解析和代码复制功能
 */
import type { Message } from '@/types'
import { computed, ref, watch, onUnmounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { useMarkdown } from '@/composables/useMarkdown'
import { User } from '@element-plus/icons-vue'
import aiAvatarImg from '@/assets/images/Norton.png'

const props = defineProps<{
  message: Message
  canRegenerate?: boolean
}>()

const emit = defineEmits<{
  regenerate: []
}>()

// 用户 Store，用于获取用户头像
const userStore = useUserStore()
// Markdown 渲染函数
const { renderMarkdown } = useMarkdown()

// 计算属性：消息是否有内容
const hasContent = computed(() => props.message.content)

// 计算属性：当前消息是否为 AI 助手
const isAssistant = computed(() => props.message?.role === 'assistant')

// 计算属性：获取头像 URL
const userAvatar = computed(() => userStore.userInfo.avatar || '')


// 计算属性：AI 消息的 Markdown 渲染内容
const renderedContent = computed(() => {
  if (isAssistant.value && hasContent.value) {
    return renderMarkdown(props.message.content)
  }
  return ''
})

// 计算属性：消息气泡类名
const bubbleClass = computed(() => ({
  user: !isAssistant.value,
}))

/**
 * 处理代码复制事件
 * 点击代码块右上角的"复制"按钮时触发
 */
const handleCodeCopy = (event: Event) => {
  const target = (event.target as HTMLElement).closest('.code-copy-btn') as HTMLElement | null
  if (!target) return

  const code = decodeURIComponent(target.getAttribute('data-code') || '')
  navigator.clipboard.writeText(code).then(() => {
    target.textContent = '已复制'
    target.classList.add('copied')
    setTimeout(() => {
      target.textContent = '复制'
      target.classList.remove('copied')
    }, 2000)
  }).catch(() => {
    // 剪贴板写入失败（如权限被拒），静默忽略
  })
}

// ========== 打字机效果（requestAnimationFrame） ==========
const TYPEWRITER_SPEED = 25 // ms/字符

const displayedText = ref('')
let rafId: number | null = null
let lastCharTime = 0

const stopTypewriter = () => {
  if (rafId !== null) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
}

const animate = (timestamp: number) => {
  // 流式已结束 → 立即显示全部并停止
  if (!props.message.isStreaming) {
    displayedText.value = props.message.content
    stopTypewriter()
    return
  }

  const target = props.message.content
  const currentLen = displayedText.value.length

  if (currentLen < target.length) {
    if (timestamp - lastCharTime >= TYPEWRITER_SPEED) {
      // 根据追赶距离动态调整每帧显示字符数，最多 5 个/帧
      const gap = target.length - currentLen
      const charsToAdd = Math.min(Math.max(1, Math.ceil(gap / 8)), 5)
      displayedText.value = target.slice(0, currentLen + charsToAdd)
      lastCharTime = timestamp
    }
  }

  rafId = requestAnimationFrame(animate)
}

const startTypewriter = () => {
  if (rafId !== null) return
  lastCharTime = performance.now()
  rafId = requestAnimationFrame(animate)
}

// 监视 content 变化：首次有内容时启动打字
watch(
  () => props.message.content,
  (newContent, oldContent) => {
    if (!props.message.isStreaming) {
      stopTypewriter()
      displayedText.value = newContent || ''
      return
    }
    if (newContent && newContent !== oldContent && rafId === null) {
      startTypewriter()
    }
  },
)

// 监视 isStreaming：流结束后立即显示完整内容
watch(
  () => props.message.isStreaming,
  (streaming) => {
    if (!streaming) {
      stopTypewriter()
      displayedText.value = props.message.content
    }
  },
)

onUnmounted(() => stopTypewriter())
</script>

<template>
  <!-- 消息容器：区分用户和 AI 消息的布局方向 -->
  <div v-if="message" :class="['message-item', message.role]">
    <!-- 头像区域 -->
    <div class="message-avatar">
      <!-- AI 头像 -->
      <el-avatar
        v-if="isAssistant"
        :src="aiAvatarImg"
        :size="40"
        class="ai-avatar"
        role="img"
        :aria-label="'AI 助手'"
        loading="lazy"
      />
      <!-- 用户头像 -->
      <el-avatar
        v-else
        :src="userAvatar || undefined"
        :size="40"
        class="user-avatar"
        role="img"
        :aria-label="'用户头像'"
        loading="lazy"
      >
        <el-icon v-if="!userAvatar"><User /></el-icon>
      </el-avatar>
    </div>

    <!-- 消息内容区域 -->
    <div class="message-body">
      <div class="message-bubble" :class="bubbleClass">
        <div class="message-content">
          <!-- AI 流式输出中：打字机文本 + 光标 -->
          <div
            v-if="isAssistant && message.isStreaming && displayedText"
            class="message-text"
            aria-live="polite"
          >
            {{ displayedText }}<span class="typing-indicator" aria-hidden="true">▋</span>
          </div>
          <!-- AI 流式等待首次内容：仅光标 -->
          <div
            v-else-if="isAssistant && message.isStreaming"
            class="message-text"
            aria-live="polite"
          >
            <span class="typing-indicator" aria-hidden="true">▋</span>
          </div>
          <!-- AI 消息完成：Markdown 渲染 + 代码复制 -->
          <div
            v-else-if="isAssistant && hasContent"
            class="message-text markdown-body"
            role="region"
            aria-label="AI 消息内容"
            v-html="renderedContent"
            @click="handleCodeCopy"
          />
          <!-- 用户消息：纯文本显示 -->
          <div v-else-if="hasContent" class="message-text" role="text">
            {{ message.content }}
          </div>
        </div>
      </div>

      <!-- 操作按钮：仅 AI 消息且可重新生成时显示 -->
      <div v-if="canRegenerate" class="message-actions">
        <el-button size="small" text type="primary" @click="emit('regenerate')">
          重新生成
        </el-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.message-item {
  display: flex;
  margin-bottom: 20px;
  animation: fadeIn 0.3s ease-in;
}

/* 用户消息靠右显示 */
.message-item.user {
  flex-direction: row-reverse;
}

.message-avatar {
  margin: 0 10px;
  flex-shrink: 0;
}

/* 用户头像样式 */
.user-avatar {
  background-color: var(--user-avatar-bg, var(--primary-color));
  color: var(--user-avatar-text, white);
}

/* AI 头像样式 */
.ai-avatar {
  background-color: var(--ai-avatar-bg, var(--border-color));
  color: var(--ai-avatar-text, var(--text-secondary));
}

.message-body {
  max-width: 70%;
  display: flex;
  flex-direction: column;
}

/* 用户消息内容靠右 */
.message-item.user .message-body {
  align-items: flex-end;
}

.message-bubble {
  width: 100%;
}

.message-content {
  background-color: var(--hover-color);
  padding: 16px;
  border-radius: 18px;
  position: relative;
}

/* 用户消息气泡样式 */
.message-bubble.user .message-content {
  background-color: var(--primary-color);
  color: white;
}

.message-content:empty {
  /* 防止空内容区域因 padding 坍缩为圆形 */
  min-width: 60px;
  min-height: 20px;
}

.message-text {
  line-height: 1.5;
  word-wrap: break-word;
  font-size: 14px;
}

/* 用户消息保留原始换行（AI 消息由 markdown 渲染处理换行） */
.message-item.user .message-text {
  white-space: pre-wrap;
}

/* 打字机光标动画 */
.typing-indicator {
  display: inline-block;
  animation: blink 1s infinite;
  color: var(--typing-indicator-color, var(--primary-color));
}

/* 用户消息的打字光标颜色 */
.message-item.user .typing-indicator {
  color: var(--user-typing-color, rgba(255, 255, 255, 0.8));
}

.message-actions {
  margin-top: 6px;
  padding-left: 4px;
}

/* 代码复制按钮样式 */
:deep(.code-copy-btn) {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
  transition: all 0.2s;
}

:deep(.code-copy-btn:hover) {
  background-color: var(--hover-color);
  color: var(--text-color);
}

:deep(.code-copy-btn.copied) {
  color: var(--success-color, #67c23a);
}
</style>
