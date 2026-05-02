<script setup lang="ts">
/**
 * 侧边栏对话列表中的单个条目组件
 * 负责展示对话信息、提供操作菜单（重命名、置顶、删除）
 */
import { ref } from 'vue'
import { MoreFilled, Edit, Delete, Top, BottomLeft } from '@element-plus/icons-vue'
import type { Conversation } from '@/types'
import { useInlineEdit } from '@/composables/useInlineEdit'
import { useContextMenu } from '@/composables/useContextMenu'
import { formatRelativeTime } from '@/utils/format'

const renameInputRef = ref<HTMLElement | null>(null)

const props = defineProps<{
  conversation: Conversation
  isActive: boolean
}>()

const emit = defineEmits<{
  select: [id: string]
  rename: [id: string, title: string]
  pin: [id: string]
  unpin: [id: string]
  delete: [id: string]
}>()

/**
 * 上下文菜单状态管理
 * - menuVisible: 菜单是否显示
 * - toggleMenu: 切换菜单显示状态
 * - closeMenu: 关闭菜单
 */
const { menuVisible, toggleMenu, closeMenu } = useContextMenu()

/**
 * 内联编辑状态管理（用于重命名功能）
 * - renaming: 是否处于编辑状态
 * - renameText: 编辑框的文本内容
 * - startRenaming: 开始编辑
 * - confirmRename: 确认修改
 * - cancelRename: 取消编辑
 */
const {
  editing: renaming,
  editValue: renameText,
  startEdit: startRenaming,
  confirmEdit: confirmRename,
  cancelEdit: cancelRename,
} = useInlineEdit((value) => emit('rename', props.conversation.id, value), renameInputRef)

/**
 * 选中当前对话
 * 触发 select 事件，由父组件处理对话切换
 */
const handleClick = () => {
  emit('select', props.conversation.id)
}

/**
 * 点击重命名菜单项
 * 先关闭菜单，再开始内联编辑
 */
const handleRename = () => {
  closeMenu()
  startRenaming(props.conversation.title)
}

/**
 * 点击置顶/取消置顶菜单项
 * 根据当前置顶状态触发对应事件
 */
const handlePin = () => {
  closeMenu()
  if (props.conversation.isPinned) {
    emit('unpin', props.conversation.id)
  } else {
    emit('pin', props.conversation.id)
  }
}

/**
 * 点击删除菜单项
 * 触发 delete 事件，由父组件处理删除确认和实际操作
 */
const handleDelete = () => {
  closeMenu()
  emit('delete', props.conversation.id)
}
</script>

<template>
  <!-- 对话列表项：点击选中小圆点菜单 -->
  <div :class="['conversation-item', { active: isActive }]" @click="handleClick">
    <div class="conversation-content">
      <!-- 编辑模式：显示输入框 -->
      <div v-if="renaming" ref="renameInputRef" class="conversation-title" @click.stop>
        <el-input
          v-model="renameText"
          class="rename-input"
          size="small"
          @keyup.enter="confirmRename"
          @keyup.esc="cancelRename"
          @blur="confirmRename"
        />
      </div>
      <!-- 普通模式：显示对话标题 -->
      <div v-else class="conversation-title">{{ conversation.title }}</div>
      <!-- 显示相对时间（今天/昨天/N天前/日期） -->
      <div class="conversation-time">{{ formatRelativeTime(conversation.updatedAt) }}</div>
    </div>

    <!-- 更多操作按钮和菜单 -->
    <div class="item-more-wrapper">
      <el-button class="item-more-btn" :icon="MoreFilled" link @click="toggleMenu" />
      <Transition name="fade">
        <div v-if="menuVisible" class="item-menu-wrapper">
          <!-- 遮罩层：点击外部关闭菜单 -->
          <div class="item-menu-overlay" @click.stop="closeMenu"></div>
          <div
            class="item-menu"
            role="menu"
            aria-label="对话操作"
            @click.stop
          >
            <!-- 重命名 -->
            <div class="menu-item" role="menuitem" tabindex="-1" @click="handleRename">
              <el-icon><Edit /></el-icon>
              <span>重命名</span>
            </div>
            <!-- 置顶/取消置顶 -->
            <div class="menu-item" role="menuitem" tabindex="-1" @click="handlePin">
              <el-icon v-if="conversation.isPinned"><BottomLeft /></el-icon>
              <el-icon v-else><Top /></el-icon>
              <span>{{ conversation.isPinned ? '取消置顶' : '置顶' }}</span>
            </div>
            <!-- 分隔线 -->
            <div class="menu-divider" role="separator"></div>
            <!-- 删除 -->
            <div class="menu-item delete" role="menuitem" tabindex="-1" @click="handleDelete">
              <el-icon><Delete /></el-icon>
              <span>删除</span>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
.conversation-item {
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  position: relative;
}

.conversation-item:hover {
  background-color: var(--hover-color);
}

.conversation-item.active {
  background-color: var(--active-bg);
}

.conversation-content {
  flex: 1;
  min-width: 0;
}

.conversation-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-color);
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conversation-title .rename-input {
  width: 100%;
}

.conversation-title .rename-input :deep(.el-input__wrapper) {
  background-color: transparent;
  box-shadow: none;
  border: none;
  padding: 0;
}

.conversation-title .rename-input :deep(.el-input__inner) {
  height: auto;
  line-height: inherit;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-color);
  background-color: transparent;
  padding: 0;
}

.conversation-time {
  font-size: 12px;
  color: var(--text-muted);
}

.item-more-wrapper {
  position: relative;
  flex-shrink: 0;
}

.item-more-btn {
  padding: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

/* 鼠标悬停时显示更多按钮 */
.conversation-item:hover .item-more-btn {
  opacity: 1;
}

.item-menu-wrapper {
  position: relative;
}

.item-menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 99;
}

.item-menu {
  position: absolute;
  right: 0;
  top: calc(100% + 4px);
  width: 140px;
  background-color: var(--card-bg);
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  padding: 8px 0;
  border: 1px solid var(--border-color);
  z-index: 100;
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

.menu-item:hover {
  background-color: var(--hover-color);
  color: var(--text-color);
}

/* 删除菜单项样式 */
.menu-item.delete {
  color: var(--danger-color);
}

.menu-item.delete:hover {
  background-color: var(--danger-bg);
}

.menu-divider {
  height: 1px;
  background-color: var(--border-color);
  margin: 8px 0;
}
</style>
