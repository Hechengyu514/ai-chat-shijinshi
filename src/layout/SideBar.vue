<script setup lang="ts">
/**
 * 侧边栏组件
 * 包含应用 Logo、新对话按钮、对话列表和用户信息区域
 */
import { useChatStore } from '@/stores/chat'
import { useUserStore } from '@/stores/user'
import { storeToRefs } from 'pinia'
import { Fold, Plus, MoreFilled, User } from '@element-plus/icons-vue'
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import MoreMenu from '@/components/common/MoreMenu.vue'
import ConversationList from '@/components/chat/ConversationList.vue'
import { useSettings } from '@/composables/useSettings'

defineOptions({ name: 'AppSidebar' })

// 获取 Store 和 Router
const chatStore = useChatStore()
const userStore = useUserStore()
const router = useRouter()

// 解构 Store 方法和状态
const { deselectConversation } = chatStore
const { isLoggedIn, userInfo } = storeToRefs(userStore)
const { logout } = userStore

// 更多菜单可见性
const moreMenuVisible = ref(false)

// 设置对话框状态
const { openSettings } = useSettings()

// 当前用户头像
const currentAvatar = computed(() => userInfo.value.avatar || '')

// 显示名称（用户名或默认值）
const displayName = computed(() => {
  return userInfo.value.username || '用户'
})

// 定义事件：折叠侧边栏
const emit = defineEmits<{
  collapse: []
}>()

/**
 * 创建新对话
 */
const createNewConversation = () => {
  deselectConversation()
}

/**
 * 处理菜单操作
 */
const handleMenuAction = (action: 'settings' | 'logout' | 'login') => {
  moreMenuVisible.value = false
  if (action === 'settings') {
    openSettings()
  } else if (action === 'logout') {
    logout()
    chatStore.conversations = []
    chatStore.activeConversationId = null
    router.push('/login')
  } else if (action === 'login') {
    router.push('/login')
  }
}

/**
 * 切换更多菜单显示状态
 */
const toggleMoreMenu = () => {
  moreMenuVisible.value = !moreMenuVisible.value
}

/**
 * 处理折叠事件
 */
const handleCollapse = () => {
  emit('collapse')
}
</script>

<template>
  <div class="sidebar">
    <!-- 侧边栏头部 -->
    <div class="sidebar-header">
      <div class="header-top">
        <h2 class="logo">试金石小助手</h2>
        <div class="header-buttons">
          <el-button class="icon-button" :icon="Fold" link @click="handleCollapse" />
        </div>
      </div>
      <el-button class="new-chat-button" @click="createNewConversation">
        <el-icon><Plus /></el-icon>
        <span>开启新对话</span>
      </el-button>
    </div>

    <!-- 对话列表 -->
    <ConversationList />

    <!-- 侧边栏底部（用户信息） -->
    <div class="sidebar-footer">
      <div class="user-info-button" @click="toggleMoreMenu">
        <div class="user-avatar-wrapper">
          <div
            class="user-avatar"
            :style="{ backgroundImage: currentAvatar ? `url(${currentAvatar})` : 'none' }"
          >
            <el-icon v-if="!currentAvatar"><User /></el-icon>
          </div>
        </div>
        <span class="user-name">{{ displayName }}</span>
        <el-icon class="more-icon"><MoreFilled /></el-icon>
      </div>
      <!-- 更多操作菜单 -->
      <MoreMenu
        v-model:visible="moreMenuVisible"
        :is-logged-in="isLoggedIn"
        @action="handleMenuAction"
      />
    </div>
  </div>

</template>

<style scoped>
.sidebar {
  width: 280px;
  background-color: var(--sidebar-bg);
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--border-color);
  height: 100vh;
}

.sidebar-header {
  padding: 16px 16px 20px 16px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.logo {
  font-size: 18px;
  font-weight: bold;
  margin: 0;
  color: var(--text-color);
}

.header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.header-buttons {
  display: flex;
  gap: 4px;
}

.icon-button {
  padding: 6px;
  font-size: 18px;
  color: var(--text-secondary);
}

.icon-button:hover {
  color: var(--text-color);
  background-color: var(--hover-color);
}

.new-chat-button {
  width: 100%;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background-color: transparent;
  color: var(--text-secondary);
  font-size: 14px;
  transition: all 0.2s;
  font-weight: 500;
}

.new-chat-button:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
  background-color: var(--active-bg);
}

.new-chat-button .el-icon {
  font-size: 16px;
}

.sidebar-footer {
  position: relative;
  padding: 12px;
  border-top: 1px solid var(--border-color);
  margin-top: auto;
}

.user-info-button {
  width: 100%;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-radius: 8px;
  background-color: transparent;
  cursor: pointer;
  transition: background-color 0.2s;
}

.user-info-button:hover {
  background-color: var(--hover-color);
}

.user-avatar-wrapper {
  flex-shrink: 0;
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: var(--primary-color);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 14px;
  background-size: cover;
  background-position: center;
}

.user-name {
  flex: 1;
  margin-left: 12px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-color);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.more-icon {
  color: var(--text-muted);
  font-size: 16px;
  margin-left: 8px;
}
</style>
