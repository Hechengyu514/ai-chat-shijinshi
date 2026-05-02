<script setup lang="ts">
/**
 * 应用布局组件
 * 布局：sidebar（全高）+ 右侧面板（top-bar + main-content 上下结构）
 * 移动端 sidebar 改为绝对定位抽屉覆盖
 */
import { computed } from 'vue'
import Sidebar from '@/layout/Sidebar.vue'
import SettingsDialog from '@/components/settings/SettingsDialog.vue'
import { useSettingsStore } from '@/stores/settings'
import { useChatStore } from '@/stores/chat'
import { Expand, Plus } from '@element-plus/icons-vue'
import { storeToRefs } from 'pinia'
import { useSidebarDrawer } from '@/mobile/useSidebarDrawer'

const settingsStore = useSettingsStore()

const chatStore = useChatStore()
const { deselectConversation } = chatStore
const { activeConversationId } = storeToRefs(chatStore)

const activeConversationTitle = computed(() => {
  if (!activeConversationId.value) return ''
  return chatStore.getActiveConversation()?.title || ''
})

const { isMobile, isCollapsed, showBackdrop, expand, collapse, closeDrawer } =
  useSidebarDrawer()

const handleNewConversation = () => {
  deselectConversation()
}
</script>

<template>
  <div class="app-layout">
    <a href="#main-content" class="skip-to-content">跳到主要内容</a>

    <!-- 侧边栏（全高，桌面端 flex 子项，移动端绝对定位抽屉） -->
    <div class="sidebar-wrapper" :class="{ collapsed: isCollapsed }">
      <Sidebar @collapse="collapse" :is-mobile="isMobile" />
    </div>

    <!-- 右侧面板：top-bar + main-content -->
    <div class="right-panel">
      <!-- 移动端侧边栏遮罩 -->
      <Transition name="fade">
        <div v-if="showBackdrop" class="sidebar-backdrop" @click="closeDrawer" />
      </Transition>

      <!-- 顶部栏 -->
      <div class="top-bar">
        <div class="top-bar-left">
          <el-button v-if="isCollapsed" class="top-bar-btn" :icon="Expand" circle @click="expand" />
        </div>
        <div class="top-bar-center">
          <span class="conversation-title">{{ activeConversationTitle }}</span>
        </div>
        <div class="top-bar-right">
          <el-button v-if="isCollapsed" class="top-bar-btn" :icon="Plus" circle @click="handleNewConversation" />
        </div>
      </div>

      <!-- 主内容区 -->
      <div id="main-content" class="main-content">
        <slot></slot>
      </div>
    </div>

    <SettingsDialog v-model:visible="settingsStore.visible" />
  </div>
</template>

<style scoped>
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

/* ---- 侧边栏 ---- */
.sidebar-wrapper {
  width: 280px;
  overflow: hidden;
  flex-shrink: 0;
  transition: none;
}

.sidebar-wrapper:not(.collapsed) {
  transition: width 0.3s ease;
}

.sidebar-wrapper.collapsed {
  width: 0;
}

/* ---- 右侧面板 ---- */
.right-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

/* ---- 顶部栏 ---- */
.top-bar {
  height: 56px;
  flex-shrink: 0;
  background-color: var(--sidebar-bg);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 24px;
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

/* ---- 主内容 ---- */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-color);
  overflow: hidden;
}

/* ---- 遮罩 ---- */
.sidebar-backdrop {
  position: absolute;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.4);
  z-index: 150;
}
</style>
