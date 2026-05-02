<script setup lang="ts">
/**
 * 更多操作菜单组件
 * 弹出式菜单，提供系统设置、退出登录/前往登录等操作入口
 * 支持键盘导航（ArrowUp / ArrowDown / Enter / Escape）
 */
import { Setting, SwitchButton, UserFilled } from '@element-plus/icons-vue'
import { ref, computed, watch } from 'vue'

interface Props {
  isLoggedIn: boolean
  visible: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  action: [value: 'settings' | 'logout' | 'login']
}>()

const handleAction = (action: 'settings' | 'logout' | 'login') => {
  emit('update:visible', false)
  emit('action', action)
}

// ========== 键盘导航 ==========
// -1 表示没有选中项，避免菜单打开时第一项自动高亮
const activeIndex = ref(-1)

const items = computed(() => {
  const list: { action: 'settings' | 'logout' | 'login' }[] = [{ action: 'settings' }]
  if (props.isLoggedIn) list.push({ action: 'logout' })
  else list.push({ action: 'login' })
  return list
})

// 菜单关闭时重置键盘高亮
watch(
  () => props.visible,
  (visible) => {
    if (!visible) activeIndex.value = -1
  },
)

const onKeyDown = (e: KeyboardEvent) => {
  const list = items.value
  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault()
      activeIndex.value = activeIndex.value < 0 ? 0 : (activeIndex.value + 1) % list.length
      break
    case 'ArrowUp':
      e.preventDefault()
      activeIndex.value = activeIndex.value < 0 ? list.length - 1 : (activeIndex.value - 1 + list.length) % list.length
      break
    case 'Enter':
      e.preventDefault()
      if (activeIndex.value >= 0 && list[activeIndex.value]) {
        handleAction(list[activeIndex.value]!.action)
      }
      break
    case 'Escape':
      emit('update:visible', false)
      break
  }
}
</script>

<template>
  <Transition name="fade">
    <div v-if="visible" class="more-menu-wrapper">
      <!-- 遮罩层：点击关闭菜单 -->
      <div class="more-menu-overlay" @click="emit('update:visible', false)"></div>

      <!-- 菜单内容 -->
      <div class="more-menu" role="menu" aria-label="更多操作" @click.stop @keydown="onKeyDown">
        <!-- 系统设置 -->
        <div
          class="menu-item"
          role="menuitem"
          tabindex="0"
          :class="{ 'menu-item--active': activeIndex === 0 }"
          @click="handleAction('settings')"
        >
          <el-icon><Setting /></el-icon>
          <span>系统设置</span>
        </div>

        <!-- 登录状态相关操作 -->
        <template v-if="isLoggedIn">
          <div class="menu-divider" role="separator"></div>
          <!-- 退出登录 -->
          <div
            class="menu-item logout"
            role="menuitem"
            tabindex="0"
            :class="{ 'menu-item--active': activeIndex === 1 }"
            @click="handleAction('logout')"
          >
            <el-icon><SwitchButton /></el-icon>
            <span>退出登录</span>
          </div>
        </template>
        <template v-else>
          <!-- 前往登录 -->
          <div
            class="menu-item"
            role="menuitem"
            tabindex="0"
            :class="{ 'menu-item--active': activeIndex === 1 }"
            @click="handleAction('login')"
          >
            <el-icon><UserFilled /></el-icon>
            <span>前往登录</span>
          </div>
        </template>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.more-menu-wrapper {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 100%;
  padding-bottom: 8px;
  pointer-events: none;
}

.more-menu-wrapper > .more-menu {
  pointer-events: auto;
}

.more-menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 998;
  pointer-events: auto;
}

.more-menu {
  position: absolute;
  left: 12px;
  bottom: 0;
  width: 160px;
  background-color: var(--card-bg);
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  padding: 8px 0;
  border: 1px solid var(--border-color);
  z-index: 999;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  cursor: pointer;
  font-size: 13px;
  color: var(--text-secondary);
  transition: all 0.2s;
  border-radius: 6px;
}

.menu-item:hover,
.menu-item--active {
  background-color: var(--hover-color);
  color: var(--text-color);
}

.menu-item.logout {
  color: #f56c6c;
}

.menu-item.logout:hover {
  background-color: #fef0f0;
}

.menu-divider {
  height: 1px;
  background-color: var(--border-color);
  margin: 8px 0;
}
</style>
