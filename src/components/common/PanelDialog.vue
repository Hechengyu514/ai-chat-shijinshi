<script setup lang="ts">
import { computed } from 'vue'
import { Close } from '@element-plus/icons-vue'
import { useBreakpoint } from '@/composables/useBreakpoint'

/**
 * 带侧边栏的对话框组件
 *
 * @example
 * ```vue
 * <PanelDialog v-model:visible="dialogVisible" title="设置">
 *   <template #sidebar>
 *     <SettingsMenu v-model:active-tab="activeTab" />
 *   </template>
 *   <div v-if="activeTab === 'general'">通用设置内容</div>
 *   <div v-if="activeTab === 'data'">数据管理内容</div>
 * </PanelDialog>
 * ```
 */
defineOptions({
  name: 'PanelDialog',
})

interface Props {
  // 对话框标题
  title?: string
  // 对话框是否可见
  visible?: boolean
  // 对话框宽度
  width?: string
  // 对话框高度
  height?: string
}

const props = withDefaults(defineProps<Props>(), {
  title: '设置',
  visible: false,
  width: '720px',
  height: '500px',
})

const emit = defineEmits<{
  'update:visible': [value: boolean]
}>()

const { isMobile } = useBreakpoint(768)

const dialogWidth = computed(() => (isMobile.value ? '100vw' : props.width))
const dialogHeight = computed(() => (isMobile.value ? '100vh' : props.height))

// 处理关闭对话框
const handleClose = () => {
  emit('update:visible', false)
}
</script>

<template>
  <Teleport to="body">
    <Transition name="dialog-fade">
      <div v-if="visible" class="panel-dialog-overlay" @click.self="handleClose">
        <div class="panel-dialog" :style="{ width: dialogWidth, height: dialogHeight }">
          <!-- 对话框头部 -->
          <div class="panel-header">
            <h3 class="panel-title">{{ title }}</h3>
            <el-button class="close-button" link @click="handleClose">
              <el-icon :size="18"><Close /></el-icon>
            </el-button>
          </div>

          <!-- 对话框主体 -->
          <div class="panel-body">
            <!-- 侧边栏插槽 -->
            <div class="panel-sidebar scrollbar-transparent">
              <slot name="sidebar"></slot>
            </div>
            <!-- 内容区域插槽 -->
            <div class="panel-content scrollbar-transparent">
              <slot></slot>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.panel-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.panel-dialog {
  background-color: var(--bg-color);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color);
}

.panel-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
  color: var(--text-color);
}

.close-button {
  padding: 4px;
}

.panel-body {
  display: flex;
  flex: 1;
  overflow: hidden;
  min-height: 0;
}

.panel-sidebar {
  width: 180px;
  background-color: var(--sidebar-bg);
  border-right: 1px solid var(--border-color);
  overflow-y: auto;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.dialog-fade-enter-active,
.dialog-fade-leave-active {
  transition: opacity 0.2s ease;
}

.dialog-fade-enter-from,
.dialog-fade-leave-to {
  opacity: 0;
}
</style>
