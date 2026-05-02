<script setup lang="ts">
/**
 * 设置菜单组件
 * 显示设置侧边栏的导航菜单，支持点击切换标签页
 */
interface Props {
  // 当前激活的标签页
  activeTab: string
}

// 定义 props
defineProps<Props>()

// 定义事件：更新激活标签页
const emit = defineEmits<{
  'update:activeTab': [value: string]
}>()

// 菜单项配置
const menuItems = [
  { key: 'general', label: '通用设置' },
  { key: 'data', label: '数据管理' },
  { key: 'user', label: '用户管理' },
]

// 处理菜单点击
const handleClick = (key: string) => {
  emit('update:activeTab', key)
}
</script>

<template>
  <div class="settings-menu">
    <div
      v-for="item in menuItems"
      :key="item.key"
      class="menu-item"
      :class="{ active: activeTab === item.key }"
      @click="handleClick(item.key)"
    >
      {{ item.label }}
    </div>
  </div>
</template>

<style scoped>
.settings-menu {
  padding: 12px 0;
}

.menu-item {
  padding: 10px 20px;
  border-left: 3px solid transparent;
  cursor: pointer;
  transition: all 0.2s;
}

.menu-item:hover {
  background-color: var(--hover-color);
}

.menu-item.active {
  background-color: var(--hover-color);
  color: var(--primary-color);
  border-left-color: var(--primary-color);
  font-weight: 500;
}
</style>
