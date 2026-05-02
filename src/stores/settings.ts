/**
 * 设置面板状态管理（对话框可见性 + 激活标签页）
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'

export type SettingsTab = 'general' | 'data' | 'user'

export const useSettingsStore = defineStore('settings', () => {
  const visible = ref(false)
  const activeTab = ref<SettingsTab>('general')

  const open = (tab?: SettingsTab) => {
    if (tab) activeTab.value = tab
    visible.value = true
  }

  const close = () => {
    visible.value = false
  }

  const setActiveTab = (tab: SettingsTab) => {
    activeTab.value = tab
  }

  return { visible, activeTab, open, close, setActiveTab }
})
