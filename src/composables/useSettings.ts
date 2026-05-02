/**
 * 设置对话框状态（兼容旧导入，实际状态已迁移到 Pinia store）
 */
import { useSettingsStore } from '@/stores/settings'
import { storeToRefs } from 'pinia'

export function useSettings() {
  const store = useSettingsStore()
  const { visible, activeTab } = storeToRefs(store)

  return {
    systemSettingsVisible: visible,
    activeSettingsTab: activeTab,
    openSettings: store.open,
    closeSettings: store.close,
    setActiveTab: store.setActiveTab,
  }
}
