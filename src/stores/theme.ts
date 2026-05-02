/**
 * 主题状态管理
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Theme } from '@/types'
import { safeStorage, STORAGE_KEYS } from '@/utils/storage'

export function getInitialTheme(): Theme {
  if (typeof localStorage === 'undefined') return 'light'
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.theme)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed.theme === 'dark') return 'dark'
    }
  } catch {
    // ignore
  }
  return 'light'
}

export const useThemeStore = defineStore(
  'theme',
  () => {
    const theme = ref<Theme>(getInitialTheme())

    const applyTheme = (newTheme: Theme) => {
      if (typeof document !== 'undefined') {
        if (newTheme === 'dark') {
          document.documentElement.classList.add('dark')
        } else {
          document.documentElement.classList.remove('dark')
        }
      }
    }

    const setTheme = (newTheme: Theme) => {
      theme.value = newTheme
      applyTheme(newTheme)
    }

    const toggleTheme = () => {
      setTheme(theme.value === 'light' ? 'dark' : 'light')
    }

    applyTheme(theme.value)

    return {
      theme,
      setTheme,
      toggleTheme,
    }
  },
  {
    persist: {
      key: STORAGE_KEYS.theme,
      storage: safeStorage,
      afterHydrate(ctx) {
        document.documentElement.classList.toggle('dark', ctx.store.$state.theme === 'dark')
      },
    },
  },
)
