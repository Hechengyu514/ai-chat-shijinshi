<script setup lang="ts">
/**
 * 应用布局组件
 * 管理侧边栏的折叠状态和主内容区的布局
 * 响应式适配移动端和桌面端
 */
import { ref, computed, watch } from 'vue'
import Sidebar from '@/layout/Sidebar.vue'
import SettingsDialog from '@/components/settings/SettingsDialog.vue'
import { useSettingsStore } from '@/stores/settings'
import { useChatStore } from '@/stores/chat'
import { Expand, Plus } from '@element-plus/icons-vue'
import { storeToRefs } from 'pinia'
import { useBreakpoint } from '@/composables/useBreakpoint'

const settingsStore = useSettingsStore()

// 获取聊天 Store
const chatStore = useChatStore()
const { deselectConversation } = chatStore
const { activeConversationId } = storeToRefs(chatStore)

// 当前激活对话的标题
const activeConversationTitle = computed(() => {
  if (!activeConversationId.value) return ''
  return chatStore.getActiveConversation()?.title || ''
})

// 响应式断点检测
const { isMobile } = useBreakpoint(768)

// 用户主动折叠状态
const isUserCollapsed = ref(false)
// 当前折叠状态
const isCollapsed = ref(false)

// 监听移动端状态变化
watch(
  isMobile,
  (mobile) => {
    if (mobile) {
      // 移动端自动折叠侧边栏
      isCollapsed.value = true
    } else if (!isUserCollapsed.value) {
      // 桌面端且用户未主动折叠时展开
      isCollapsed.value = false
    }
  },
  { immediate: true },
)

/**
 * 展开侧边栏
 */
const handleExpand = () => {
  isCollapsed.value = false
  isUserCollapsed.value = false
}

/**
 * 手动折叠侧边栏
 */
const handleCollapse = () => {
  isCollapsed.value = true
  isUserCollapsed.value = true
}

/**
 * 创建新对话
 */
const handleNewConversation = () => {
  deselectConversation()
}
</script>

<template>
  <div class="app-layout">
    <!-- 跳过导航：键盘用户可直接跳至主内容区 -->
    <a href="#main-content" class="skip-to-content">跳到主要内容</a>

    <!-- 顶部导航条（侧边栏折叠时显示） -->
    <Transition name="topbar-slide">
      <div v-if="isCollapsed" class="top-bar">
        <div class="top-bar-left">
          <el-button class="top-bar-btn" :icon="Expand" circle @click="handleExpand" />
        </div>
        <div class="top-bar-center">
          <span class="conversation-title">{{ activeConversationTitle }}</span>
        </div>
        <div class="top-bar-right">
          <el-button class="top-bar-btn" :icon="Plus" circle @click="handleNewConversation" />
        </div>
      </div>
    </Transition>

    <!-- 侧边栏：始终渲染，通过宽度动画实现收起/展开过渡 -->
    <div class="sidebar-wrapper" :class="{ collapsed: isCollapsed }">
      <Sidebar @collapse="handleCollapse" />
    </div>

    <!-- 主内容区 -->
    <div id="main-content" class="main-content" :class="{ collapsed: isCollapsed }">
      <slot></slot>
    </div>

    <!-- 设置对话框（全局单例，由 AppLayout 统一管理） -->
    <SettingsDialog v-model:visible="settingsStore.visible" />
  </div>
</template>

<style scoped>
/* 跳过导航：仅键盘聚焦时可见 */
.skip-to-content {
  position: absolute;
  top: -100%;
  left: 16px;
  padding: 8px 16px;
  background: var(--primary-color);
  color: #fff;
  border-radius: 0 0 6px 6px;
  z-index: 9999;
  font-size: 14px;
  text-decoration: none;
  transition: top 0.2s;
}
.skip-to-content:focus {
  top: 0;
}

.app-layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
  position: relative;
}

.top-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 56px;
  background-color: var(--sidebar-bg);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 24px;
  z-index: 100;
}

.top-bar-left,
.top-bar-right {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-shrink: 0;
}

.top-bar-center {
  flex: 1;
  text-align: center;
  overflow: hidden;
  padding: 0 12px;
}

.conversation-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
}

.top-bar-btn {
  width: 40px;
  height: 40px;
  font-size: 18px;
  background-color: transparent;
  border-color: transparent;
  color: var(--text-secondary);
}

.top-bar-btn:hover {
  background-color: var(--hover-color);
  color: var(--text-color);
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-color);
  overflow: hidden;
  transition: all 0.3s ease;
}

.main-content.collapsed {
  padding-top: 56px;
}

.sidebar-wrapper {
  width: 280px;
  overflow: hidden;
  flex-shrink: 0;
  transition: width 0.3s ease;
}

.sidebar-wrapper.collapsed {
  width: 0;
}

.topbar-slide-enter-active,
.topbar-slide-leave-active {
  transition: all 0.3s ease;
}

.topbar-slide-enter-from,
.topbar-slide-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}
</style>
