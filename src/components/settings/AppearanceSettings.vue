<script setup lang="ts">
/**
 * 外观设置组件
 * 管理应用外观相关设置（主题切换等）
 */
import { useThemeStore } from '@/stores/theme'
import { storeToRefs } from 'pinia'

const themeStore = useThemeStore()
const { theme } = storeToRefs(themeStore)
const { setTheme } = themeStore
</script>

<template>
  <div class="settings-section">
    <div class="settings-item">
      <label>主题</label>
      <div class="theme-selector">
        <div class="theme-option" :class="{ active: theme === 'light' }" @click="setTheme('light')">
          <div class="theme-preview light"></div>
          <span>浅色主题</span>
        </div>
        <div class="theme-option" :class="{ active: theme === 'dark' }" @click="setTheme('dark')">
          <div class="theme-preview dark"></div>
          <span>暗色主题</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-section {
  background-color: var(--card-bg);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 16px;
}

.settings-item label {
  display: block;
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.theme-selector {
  display: flex;
  gap: 20px;
}

.theme-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 16px 24px;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.theme-option:hover {
  border-color: var(--primary-color);
}

.theme-option.active {
  border-color: var(--primary-color);
  background-color: var(--active-bg);
}

.theme-preview {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.theme-preview.light {
  background-color: #ffffff;
}

.theme-preview.dark {
  background-color: #1a1a1a;
}
</style>
