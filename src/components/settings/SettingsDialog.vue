<script setup lang="ts">
/**
 * 设置对话框组件
 * 作为设置页面的主容器，包含侧边栏菜单和内容区域
 * 根据 activeSettingsTab 动态切换显示不同的设置面板
 */
import SettingsMenu from './SettingsMenu.vue'
import AppearanceSettings from './AppearanceSettings.vue'
import DataManagement from './DataManagement.vue'
import ProfileSettings from './ProfileSettings.vue'
import PanelDialog from '@/components/common/PanelDialog.vue'
import { useSettings } from '@/composables/useSettings'

// 定义 props
defineProps<{ visible: boolean }>()

// 定义事件
const emit = defineEmits<{
  'update:visible': [value: boolean]
}>()

// 获取当前激活的设置标签页
const { activeSettingsTab } = useSettings()
</script>

<template>
  <PanelDialog :visible="visible" @update:visible="emit('update:visible', $event)" title="系统设置">
    <!-- 侧边栏：设置菜单 -->
    <template #sidebar>
      <SettingsMenu v-model:active-tab="activeSettingsTab" />
    </template>

    <!-- 内容区域：根据标签页显示对应设置 -->
    <div v-if="activeSettingsTab === 'general'" class="settings-content">
      <h3>通用设置</h3>
      <AppearanceSettings />
    </div>

    <div v-if="activeSettingsTab === 'data'" class="settings-content">
      <h3>数据管理</h3>
      <DataManagement />
    </div>

    <div v-if="activeSettingsTab === 'user'" class="settings-content">
      <h3>用户管理</h3>
      <ProfileSettings immediate />
    </div>
  </PanelDialog>
</template>

<style scoped>
.settings-content h3 {
  margin-top: -12px;
  margin-bottom: 24px;
}
</style>
